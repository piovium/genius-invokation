import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const testNames = [
  'browser local checks GTS and loads cards without a backend',
  'backend checks GTS, loads cards, switches, retains undo and recovers',
  'both routes provide fresh version-bound session evidence',
];
const methodFeatures = new Map([['textDocument/hover', 'hover'], ['textDocument/definition', 'definition'],
  ['textDocument/completion', 'completion'], ['textDocument/signatureHelp', 'signature']]);
const plain = value => JSON.parse(JSON.stringify(value));
const canonicalFile = uri => {
  const file = fileURLToPath(uri);
  return process.platform === 'win32' ? file.toLowerCase() : file;
};

export function parseStdio(rows, stream) {
  let buffer = Buffer.alloc(0);
  const result = [];
  for (const row of rows.filter(row => row.kind === stream)) {
    buffer = Buffer.concat([buffer, Buffer.from(row.detail.base64, 'base64')]);
    while (true) {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) break;
      const size = Number(buffer.subarray(0, end).toString().match(/Content-Length:\s*(\d+)/i)?.[1]);
      assert.ok(Number.isSafeInteger(size), 'Actual LSP stream must use Content-Length framing');
      if (buffer.length < end + 4 + size) break;
      result.push({ atMs: row.atMs, message: JSON.parse(buffer.subarray(end + 4, end + 4 + size).toString()) });
      buffer = buffer.subarray(end + 4 + size);
    }
  }
  // Shutdown may close a pipe after a header. Only complete frames can support
  // evidence; retain the partial tail so callers cannot mistake it for a reply.
  result.trailingBytes = buffer.length;
  return result;
}

function offset(text, position) {
  let start = 0;
  for (let line = 0; line < position.line; line++) {
    const end = text.indexOf('\n', start);
    assert.ok(end >= start, 'Source edit range outside document');
    start = end + 1;
  }
  assert.ok(position.character >= 0 && start + position.character <= text.length);
  return start + position.character;
}
export function sources(events, uri) {
  let text;
  const result = [];
  for (const event of events.filter(event => event.kind === 'protocol-send')) {
    const message = event.detail, document = message.params?.textDocument;
    if (document?.uri !== uri) continue;
    if (message.method === 'textDocument/didOpen') text = document.text;
    else if (message.method === 'textDocument/didChange') {
      assert.equal(typeof text, 'string');
      for (const change of message.params.contentChanges) {
        text = change.range ? text.slice(0, offset(text, change.range.start)) + change.text + text.slice(offset(text, change.range.end)) : change.text;
      }
    } else continue;
    result.push({ atMs: event.atMs, version: document.version, text, method: message.method });
  }
  return result;
}

export function deriveTrace(raw, nativeRuns, expectations) {
  assert.equal(raw.schemaVersion, 1);
  assert.deepEqual(raw.problems, []);
  const approved = expectations.fixtures[0];
  const fixture = approved.fixture;
  const trace = { schemaVersion: 1, case: 'web', runNonce: raw.runNonce,
    sessions: [], switches: [], outages: [], problems: [] };
  const bindings = [];
  const ids = [...new Set(raw.phases.map(phase => phase.sessionId))];
  assert.equal(ids.length, 5, 'Formal lifecycle requires five distinct complete physical sessions');
  for (const id of ids) {
    const events = raw.editorEvents.filter(event => event.sessionId === id);
    const opened = events.find(event => event.kind === 'connect-requested');
    assert.ok(opened);
    const actualSources = sources(events, fixture.uri);
    assert.equal(actualSources.length, 3, 'Each formal session opens, changes, and restores the exact source');
    const observations = [];
    const phases = raw.phases.filter(phase => phase.sessionId === id);
    assert.deepEqual(phases.map(phase => phase.phase), ['valid', 'bad', 'restored']);
    const init = events.find(event => event.kind === 'protocol-send' && event.detail.method === 'initialize');
    assert.ok(init);
    let identity;
    if (opened.route === 'browser-local') {
      const workers = raw.workers.filter(worker => worker.sessionId === id);
      assert.equal(workers.length, 1);
      const worker = workers[0];
      assert.equal(worker.sdk.version, '6.0.3');
      assert.equal(worker.sdk.observedVersion, '6.0.3');
      assert.equal(worker.sdk.hasLanguageService, true);
      assert.equal(worker.sdk.hasProgram, true);
      assert.equal(worker.sdk.moduleRestored, true);
      assert.equal(worker.scripts.length, 1);
      const sdkPath = worker.scripts[0].url.replace(/\/typescript\.js$/, '');
      assert.equal(sdkPath, init.detail.params.initializationOptions.tsdkUrl);
      identity = { packageName: 'typescript', packageVersion: worker.sdk.version, sdkPath, checker: 'typescript-js' };
    } else {
      const matching = nativeRuns.filter(run => {
        const request = run.input.find(frame => frame.message.method === 'initialize');
        const source = run.input.find(frame => frame.message.method === 'textDocument/didOpen')?.message.params.textDocument;
        return request && Math.abs(request.atMs - init.atMs) < 5000 && source?.version === actualSources[0].version && source.text === actualSources[0].text;
      });
      assert.equal(matching.length, 1, `Backend ${id} must bind one actual stdio child`);
      const native = matching[0];
      assert.ok(!bindings.some(binding => binding.pid === native.pid), 'Fresh backend session needs fresh process identity');
      bindings.push({ sessionId: id, pid: native.pid, file: native.file });
      identity = { packageName: native.identity.packageName, packageVersion: native.identity.packageVersion,
        sdkPath: native.identity.sdkPath, checker: 'tsgo', nativeLibraryPath: native.identity.native[0].path,
        nativeLoadLog: native.stderr };
      let previousCount = -1;
      for (const phase of phases) {
        const counts = native.rows.filter(row => row.kind === 'counters' && row.atMs <= phase.completedAtMs);
        const count = counts.at(-1)?.detail.rpcCount;
        assert.ok(Number.isSafeInteger(count) && count > previousCount, `Native RPCs did not advance for ${id}/${phase.phase}`);
        previousCount = count;
        const childUri = native.input.find(frame => frame.message.method === 'textDocument/didOpen').message.params.textDocument.uri;
        const childDiagnostic = native.output.findLast(frame => frame.atMs <= phase.completedAtMs &&
          frame.message.method === 'textDocument/publishDiagnostics' && canonicalFile(frame.message.params.uri) === canonicalFile(childUri) &&
          frame.message.params.version === phase.source.version);
        const clientDiagnostic = events.findLast(event => event.atMs <= phase.completedAtMs &&
          event.kind === 'protocol-receive' && event.detail.method === 'textDocument/publishDiagnostics' &&
          event.detail.params.uri === fixture.uri && event.detail.params.version === phase.source.version);
        assert.ok(childDiagnostic && clientDiagnostic, 'Backend result must exist in both native stdio and editor transport');
        const normalize = diagnostics => diagnostics.map(({ code, message, severity, range }) => ({ code, message, severity, range }));
        assert.deepEqual(normalize(childDiagnostic.message.params.diagnostics), normalize(clientDiagnostic.detail.params.diagnostics),
          'Editor result differs from the bound actual native child output');
      }
    }
    for (const [index, phase] of phases.entries()) {
      const source = actualSources[index];
      assert.equal(source.version, phase.source.version);
      assert.equal(source.text, phase.source.text);
      assert.equal(phase.source.uri, fixture.uri);
      assert.equal(source.text, phase.phase === 'bad' ? fixture.badText : fixture.validText);
      assert.equal(source.method, index === 0 ? 'textDocument/didOpen' : 'textDocument/didChange');
      observations.push({ sessionId: id, atMs: source.atMs, kind: 'source', uri: fixture.uri,
        version: source.version, text: source.text, phase: phase.phase, cycle: 'initial', origin: index === 0 ? 'open' : 'editor' });
      const received = events.filter(event => event.kind === 'protocol-receive' &&
        event.atMs >= source.atMs && event.atMs <= phase.completedAtMs);
      const diagnostic = received.findLast(event => event.detail.method === 'textDocument/publishDiagnostics' &&
        event.detail.params.uri === fixture.uri && event.detail.params.version === source.version);
      assert.ok(diagnostic, 'Require actual versioned diagnostic push; never assign latest editor version to an unversioned result');
      const response = diagnostic.detail.params.diagnostics;
      const displayed = events.findLast(event => event.kind === 'diagnostics-displayed' &&
        event.atMs >= diagnostic.atMs && event.atMs <= phase.completedAtMs && event.detail.uri === fixture.uri);
      assert.ok(displayed, 'Actual new-session diagnostic was not displayed by the editor');
      assert.deepEqual(displayed.detail.diagnostics, response.map(({ code, message, severity, range }) =>
        ({ code, message, severity, range })), 'Displayed diagnostics differ from the actual versioned push');
      observations.push({ sessionId: id, atMs: diagnostic.atMs, kind: 'diagnostics', uri: fixture.uri,
        version: source.version, requestId: `push:${events.indexOf(diagnostic)}`, response });
      if (phase.phase !== 'bad') for (const [method, feature] of methodFeatures) {
        const request = events.find(event => event.kind === 'protocol-send' && event.atMs >= phase.featuresStartedAtMs &&
          event.atMs <= phase.completedAtMs && event.detail.method === method && event.detail.params.textDocument.uri === fixture.uri);
        assert.ok(request, `Missing real editor ${feature} request`);
        const result = received.find(event => event.detail.id === request.detail.id && !event.detail.method);
        assert.ok(result && !result.detail.error, `Missing/failed real ${feature} response`);
        observations.push({ sessionId: id, atMs: result.atMs, kind: 'feature', uri: fixture.uri,
          version: source.version, requestId: request.detail.id, feature,
          position: request.detail.params.position, response: result.detail.result });
      }
    }
    observations.sort((a, b) => a.atMs - b.atMs);
    observations.forEach((observation, index) => observation.sequence = index + 1);
    const session = { id, route: opened.route, identity, fixtureId: approved.id, fixture: plain(fixture), observations };
    const stopped = events.find(event => event.kind === 'client-stopped');
    if (stopped) session.closedAtMs = stopped.atMs;
    trace.sessions.push(session);
  }
  for (const change of raw.switches) {
    const from = trace.sessions.find(session => session.id === change.fromSessionId);
    const to = trace.sessions.find(session => session.id === change.toSessionId);
    const retired = { clientStoppedAtMs: from.closedAtMs,
      diagnosticsAfterStop: raw.editorEvents.filter(event => event.sessionId === from.id &&
        event.kind === 'diagnostics-displayed' && event.atMs > from.closedAtMs) };
    const transport = from.route === 'browser-local' ? 'worker-terminated' : 'socket-closed';
    retired[from.route === 'browser-local' ? 'workerTerminatedAtMs' : 'socketClosedAtMs'] =
      raw.editorEvents.find(event => event.sessionId === from.id && event.kind === transport)?.atMs;
    const diagnostic = to.observations.find(observation => observation.kind === 'diagnostics' && observation.version === change.after.version);
    assert.ok(diagnostic);
    trace.switches.push({ ...change, retired, diagnostics: { ownerSessionId: to.id,
      uri: diagnostic.uri, version: diagnostic.version, response: diagnostic.response } });
  }
  for (const outage of raw.outages) trace.outages.push({ ...outage,
    disconnectedAtMs: trace.sessions.find(session => session.id === outage.sessionId).closedAtMs,
    observations: outage.observations.map(({ diagnostics, ...observation }) => {
      assert.deepEqual(diagnostics, []); return observation;
    }) });
  return { trace, bindings };
}
