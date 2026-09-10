// Derive the sealed session trace from the raw editor records.
//
// Nothing here trusts a summary, a status or a counter: the trace is rebuilt
// from the raw report records that the real extension host wrote, the raw
// native process logs, and the separately approved fixture expectations. Only
// URI spelling is normalized, and only through an explicit actual-to-logical
// map; source text, versions, ranges and response values are carried over
// verbatim.
import assert from 'node:assert/strict';
import { fileKey } from './desktop-protocol.mjs';

const FEATURES = ['hover', 'definition', 'completion', 'signature'];

/**
 * Re-derive one session's edit cycles and require the shape L4 promises.
 *
 * Every session must contain the opening cycle, the external filesystem cycle
 * and exactly the sealed number of editor cycles; each cycle must hold its
 * phases in order, each phase exactly one completed diagnostic answer, and
 * every valid or repaired phase all four language features.
 */
export function deriveCycles(session, rounds) {
  assert.ok(Number.isSafeInteger(rounds) && rounds > 0, 'Invalid desktop round count');
  const { fixture } = session;
  assert.ok(fixture && typeof fixture.uri === 'string', 'A session needs its approved fixture');
  assert.ok(Array.isArray(session.observations) && session.observations.length > 0, 'A session needs observations');
  const cycles = new Map();
  let current = null;
  let lastVersion = -1;
  for (const [index, observation] of session.observations.entries()) {
    assert.equal(observation.sequence, index + 1, 'Duplicate/missing/out-of-order observation');
    assert.equal(observation.sessionId, session.id, 'Observation belongs to another session');
    assert.equal(observation.uri, fixture.uri, 'Observation belongs to another source URI');
    assert.ok(Number.isFinite(observation.atMs), 'Observation has no time');
    if (observation.kind === 'source') {
      assert.ok(observation.version > lastVersion, 'Stale or duplicate source version');
      lastVersion = observation.version;
      assert.ok(['valid', 'bad', 'restored'].includes(observation.phase), 'Unknown source phase');
      assert.equal(observation.text, observation.phase === 'bad' ? fixture.badText : fixture.validText,
        'Source differs from the approved fixture');
      const { cycle } = observation;
      assert.ok(cycle === 'initial' || cycle === 'external'
        || (Number.isSafeInteger(cycle) && cycle >= 1 && cycle <= rounds), 'Unknown edit cycle');
      assert.equal(observation.origin, cycle === 'external' ? 'filesystem'
        : observation.phase === 'valid' ? 'open' : 'editor', 'Missing actual editor/filesystem origin');
      const phases = cycles.get(cycle) ?? new Map();
      assert.ok(!phases.has(observation.phase), 'Duplicate source phase in one cycle');
      current = { source: observation, diagnostics: 0, features: new Set() };
      phases.set(observation.phase, current);
      cycles.set(cycle, phases);
      continue;
    }
    assert.ok(['diagnostics', 'feature'].includes(observation.kind), `Unknown observation kind ${observation.kind}`);
    assert.ok(current, 'A response arrived without an opened source');
    assert.equal(observation.version, current.source.version, 'Stale document diagnostics/feature response');
    if (observation.kind === 'diagnostics') {
      current.diagnostics += 1;
      assert.equal(current.diagnostics, 1, 'Duplicate diagnostic response for one source version');
      assert.ok(Array.isArray(observation.response), 'A diagnostic answer must be an array');
      if (current.source.phase === 'bad') {
        assert.ok(observation.response.some(item => item.severity === 1
          && item.code === fixture.diagnostic?.code
          && typeof item.message === 'string' && item.message.includes(fixture.diagnostic?.messageIncludes)),
        'The expected true error was not observed');
      } else {
        assert.ok(!observation.response.some(item => item.severity === 1),
          'A valid/restored source reported error diagnostics');
      }
      continue;
    }
    assert.ok(FEATURES.includes(observation.feature), 'Unknown language feature');
    assert.ok(!current.features.has(observation.feature), 'Duplicate feature response');
    current.features.add(observation.feature);
  }
  for (const cycle of ['initial', 'external', ...Array.from({ length: rounds }, (_, index) => index + 1)]) {
    const phases = cycles.get(cycle);
    assert.ok(phases, `Missing measured ${cycle} edit cycle`);
    const required = cycle === 'initial' ? ['valid', 'bad', 'restored'] : ['bad', 'restored'];
    let previous = -1;
    for (const phase of required) {
      const observed = phases.get(phase);
      assert.ok(observed, `${cycle} lacks its ${phase} source observation`);
      assert.ok(observed.source.sequence > previous, `${cycle} source phases are out of order`);
      previous = observed.source.sequence;
      assert.equal(observed.diagnostics, 1, `${cycle}/${phase} lacks a completed diagnostic response`);
      if (phase !== 'bad') {
        for (const feature of FEATURES) assert.ok(observed.features.has(feature), `${cycle}/${phase} lacks ${feature}`);
      }
    }
  }
  for (const cycle of cycles.keys()) {
    assert.ok(cycle === 'initial' || cycle === 'external'
      || (Number.isSafeInteger(cycle) && cycle >= 1 && cycle <= rounds), `Uncontracted cycle ${cycle}`);
  }
  return { cycles: cycles.size, features: FEATURES.length };
}

/**
 * Build the sealed desktop session trace and the report bindings behind it.
 *
 * Every session is one (workspace, fixture, native service) triple. The trace
 * holds exactly the schema the session probe accepts, so the runner can
 * re-validate it with the sealed pin and edit count.
 */
export function deriveDesktopTrace({ executions, expectations, nonce, rounds, plan }) {
  assert.equal(expectations.case, 'desktop');
  assert.equal(expectations.schemaVersion, 1);
  const trace = { schemaVersion: 1, case: 'desktop', runNonce: nonce, problems: [], sessions: [] };
  const bindings = [];
  const approved = new Map(expectations.fixtures.map(item => [item.id, item]));
  const seen = new Set();
  for (const run of executions) {
    const { report, sources, services, workspaceId } = run;
    assert.equal(report.runNonce, nonce, 'Foreign extension-host run');
    assert.equal(report.cycles, rounds, 'Subset desktop rounds');
    assert.ok(report.startedAtMs < report.completedAtMs, 'Invalid extension-host lifetime');
    const declared = plan.workspaces.find(item => item.id === workspaceId);
    assert.ok(declared, `Unknown desktop workspace ${workspaceId}`);
    assert.equal(report.vscode, plan.runtime.version, 'The extension host is another VS Code');
    const workspaceRecord = report.records.find(row => row.operation === 'workspace');
    assert.equal(fileKey(workspaceRecord?.uri), fileKey(run.workspaceUri), 'The measured workspace changed');
    const locations = new Map(sources.map(source => [fileKey(source.actualUri), source.logicalUri]));
    assert.equal(locations.size, sources.length, 'Duplicate actual source mapping');
    const normalize = uri => locations.get(fileKey(uri)) ?? uri;
    for (const source of sources) {
      const expectation = approved.get(source.fixtureId);
      assert.ok(expectation, `Source ${source.fixtureId} is not separately approved`);
      assert.ok(!seen.has(source.fixtureId), 'Duplicate fixture run');
      seen.add(source.fixtureId);
      assert.equal(expectation.fixture.uri, source.logicalUri, 'The approved fixture URI changed');
      assert.ok(expectation.routes.includes(source.route), 'The approved fixture route changed');
      const descriptor = report.records.find(row => row.operation === 'fixture' && row.name === source.name);
      assert.ok(descriptor, 'Missing actual source descriptor');
      assert.equal(fileKey(descriptor.uri), fileKey(source.actualUri), 'The described source changed');
      assert.equal(descriptor.validText, expectation.fixture.validText, 'The valid fixture text changed');
      assert.equal(descriptor.badText, expectation.fixture.badText, 'The broken fixture text changed');
      const native = services[source.route];
      assert.ok(native?.pid && native.identity, 'Missing native process binding');
      const sessionId = `${workspaceId}/${source.name}/${native.pid}`;
      const rows = report.records.filter(row => row.operation === 'observation' && row.name === source.name);
      assert.ok(rows.length > 0, 'No actual editor observations');
      const observations = rows.map((row, index) => {
        assert.equal(row.route, source.route, 'An observation changed its language service');
        assert.equal(fileKey(row.uri), fileKey(source.actualUri), 'An observation changed its source');
        assert.ok(row.at >= report.startedAtMs && row.at <= report.completedAtMs, 'An observation left the measured lifetime');
        const observation = { sequence: index + 1, sessionId, atMs: row.at, kind: row.kind,
          uri: normalize(row.uri), version: row.version };
        if (row.kind === 'source') {
          Object.assign(observation, { text: row.text, phase: row.phase, cycle: row.cycle, origin: row.origin });
        } else if (row.kind === 'diagnostics') {
          Object.assign(observation, { requestId: row.requestId, response: structuredClone(row.response) });
        } else if (row.kind === 'feature') {
          const response = structuredClone(row.response);
          if (row.feature === 'definition') for (const location of response) location.uri = normalize(location.uri);
          Object.assign(observation, { requestId: row.requestId, feature: row.feature,
            position: structuredClone(row.position), response });
        } else throw new Error(`Unknown editor observation ${row.kind}`);
        return observation;
      });
      const session = { id: sessionId, route: source.route, identity: structuredClone(native.identity),
        fixtureId: source.fixtureId, fixture: structuredClone(expectation.fixture), observations };
      deriveCycles(session, rounds);
      trace.sessions.push(session);
      bindings.push({ sessionId, workspaceId, fixtureId: source.fixtureId, actualUri: source.actualUri,
        logicalUri: source.logicalUri, pid: native.pid, nativeFile: native.file, reportFile: run.reportFile });
    }
  }
  assert.equal(seen.size, approved.size, 'Missing an approved desktop fixture');
  return { trace, bindings };
}
