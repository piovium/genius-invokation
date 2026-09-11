// Native-protocol replay for the desktop gate.
//
// The language services are not trusted to describe themselves. Their recorded
// IPC is replayed to reconstruct the exact document text that existed when each
// diagnostic answer was produced, and the editor-visible answer is compared
// against the raw reply the driver obtained for the same request.
import { sha256 } from './desktop-evidence.mjs';

/** Normalize a URI or path for comparison without losing the actual spelling. */
export function fileKey(file) {
  let key = file;
  if (typeof key === 'string' && key.startsWith('file:')) {
    const uri = new URL(key);
    if (uri.protocol !== 'file:') throw new Error(`Not a file URI: ${file}`);
    if (uri.search || uri.hash) throw new Error(`Source URI contains a query or fragment: ${file}`);
    key = `${uri.hostname ? `//${uri.hostname}` : ''}${decodeURIComponent(uri.pathname)}`;
  }
  key = String(key).replaceAll('\\', '/');
  if (/^\/[a-z]:\//i.test(key)) key = key.slice(1);
  return /^(?:[a-z]:\/|\/\/)/i.test(key) ? key.toLowerCase() : key;
}

function offset(text, position, oneBased = false) {
  const line = oneBased ? position.line - 1 : position.line;
  const character = oneBased ? position.offset - 1 : position.character;
  if (!Number.isSafeInteger(line) || !Number.isInteger(character) || line < 0 || character < 0) {
    throw new Error(`Invalid position ${JSON.stringify(position)}`);
  }
  const starts = [0];
  for (const match of text.matchAll(/\r\n|\n|\r/g)) starts.push(match.index + match[0].length);
  if (line >= starts.length) throw new Error(`Position line ${line} is outside the document`);
  return starts[line] + character;
}

/** Apply real client content changes; never invent a snapshot. */
export function applyChanges(text, edits, oneBased) {
  let result = text;
  for (const edit of edits ?? []) {
    if (!oneBased && !edit.range) { result = edit.text; continue; }
    const start = offset(result, oneBased ? edit.start : edit.range.start, oneBased);
    const end = offset(result, oneBased ? edit.end : edit.range.end, oneBased);
    if (end < start) throw new Error('Reversed change range');
    result = result.slice(0, start) + (oneBased ? edit.newText : edit.text) + result.slice(end);
  }
  return result;
}

const severityOf = value => value.category === 'error' ? 1 : value.category === 'warning' ? 2 : 3;
const projectTsDiagnostic = value => {
  const start = value.startLocation ?? value.start;
  const end = value.endLocation ?? value.end;
  if (typeof start !== 'object' || typeof end !== 'object') throw new Error('A native diagnostic lacks line/offset coordinates');
  return {
    code: value.code, message: value.text ?? value.message, severity: severityOf(value),
    range: {
      start: { line: start.line - 1, character: start.offset - 1 },
      end: { line: end.line - 1, character: end.offset - 1 },
    },
  };
};
const diagnosticKey = value => JSON.stringify({ code: value.code, message: value.message, severity: value.severity, range: value.range });
export const diagnosticSet = values => [...new Set(values.map(diagnosticKey))].sort();

export const diagnosticCommands = { 'gts-lsp': ['textDocument/diagnostic'], tsserver: ['syntacticDiagnosticsSync', 'semanticDiagnosticsSync'] };



/**
 * Replay the recorded native IPC into a timeline of the exact text each
 * language service received, and bind every editor diagnostic answer to it.
 *
 * The `gts-lsp` route also compares the editor answer with the raw LSP reply
 * carried on the wire. The `tsserver` route compares it with the raw reply the
 * driver obtained from the real VS Code command.
 */
export function auditProtocol({ nativeRuns, report, services }) {
  const bindings = [];
  for (const route of ['gts-lsp', 'tsserver']) {
    const service = services[route];
    const native = nativeRuns.find(run => run.pid === service.pid);
    if (!native) throw new Error(`No raw native log for the ${route} service`);
    const timeline = [], responses = new Map();
    for (const [index, row] of native.rows.entries()) {
      const message = row.detail?.message;
      if (!message) continue;
      if (row.kind !== 'ipc-in' && row.kind !== 'ipc-out') continue;
      if (route === 'gts-lsp') {
        if (row.kind === 'ipc-in' && message.method === 'textDocument/didOpen') {
          const document = message.params?.textDocument;
          timeline.push({ atMs: row.atMs, row: index, key: fileKey(document?.uri), text: document?.text, version: document?.version });
        } else if (row.kind === 'ipc-in' && message.method === 'textDocument/didChange') {
          const document = message.params?.textDocument;
          const previous = [...timeline].reverse().find(entry => entry.key === fileKey(document?.uri));
          if (!previous) throw new Error('A GTS edit arrived without a protocol open');
          timeline.push({
            atMs: row.atMs, row: index, key: fileKey(document?.uri),
            text: applyChanges(previous.text, message.params?.contentChanges, false), version: document?.version,
          });
        } else if (row.kind === 'ipc-in' && message.method === 'textDocument/didClose') {
          timeline.push({ atMs: row.atMs, row: index, key: fileKey(message.params?.textDocument?.uri), text: null, version: null });
        } else if (row.kind === 'ipc-out' && message.result !== undefined) {
          responses.set(message.id ?? message.seq, { atMs: row.atMs, result: message.result });
        }
      } else if (row.kind === 'ipc-in' && message.command === 'updateOpen') {
        for (const file of message.arguments?.openFiles ?? []) {
          if (typeof file.fileContent !== 'string') throw new Error('A tsserver open lacks the exact source snapshot');
          timeline.push({ atMs: row.atMs, row: index, key: fileKey(file.file), text: file.fileContent, version: null });
        }
        for (const file of message.arguments?.changedFiles ?? []) {
          const key = fileKey(file.fileName);
          const previous = [...timeline].reverse().find(entry => entry.key === key);
          if (!previous) throw new Error('A TS edit arrived without a protocol open');
          timeline.push({ atMs: row.atMs, row: index, key, text: applyChanges(previous.text, file.textChanges, true), version: null });
        }
        for (const file of message.arguments?.closedFiles ?? []) {
          timeline.push({ atMs: row.atMs, row: index, key: fileKey(file), text: null, version: null });
        }
      }
    }
    const observed = report.records.filter(row => row.operation === 'observation' && row.kind === 'diagnostics' && row.route === route);
    const requested = report.records.filter(row => row.operation === 'diagnostic request' && row.route === route);
    if (!observed.length) throw new Error(`The ${route} service produced no diagnostic observations`);
    if (observed.length !== requested.length) {
      throw new Error(`The ${route} service made ${requested.length} diagnostic requests for ${observed.length} editor answers`);
    }
    for (const [index, observation] of observed.entries()) {
      const request = requested[index];
      if (request.requestId !== observation.requestId) throw new Error('A diagnostic request and its answer disagree');
      for (const field of ['name', 'version']) {
        if (request[field] !== observation[field]) throw new Error(`A diagnostic request changed its ${field}`);
      }
      if (fileKey(request.uri) !== fileKey(observation.uri)) throw new Error('A diagnostic request changed its source');
      const raw = report.records.find(row => row.operation === 'raw diagnostics' && row.requestId === observation.requestId);
      if (!raw) throw new Error('A diagnostic answer has no recorded raw native reply');
      if (!(request.at <= raw.at && raw.at <= observation.at)) throw new Error('Diagnostic evidence is out of order');
      const source = report.records.find(row => row.operation === 'observation' && row.kind === 'source'
        && row.name === observation.name && row.version === observation.version);
      if (!source) throw new Error('A diagnostic answer is not tied to a recorded source version');
      const key = fileKey(observation.uri);
      const delivered = [...timeline].reverse().find(entry => entry.key === key && entry.atMs <= request.at);
      if (!delivered) throw new Error(`${observation.name} v${observation.version}: the native service never received the document`);
      if (delivered.text !== source.text) {
        throw new Error(`${observation.name} v${observation.version}: the native service held different text than the editor showed`);
      }
      if (route === 'gts-lsp' && delivered.version !== observation.version) {
        throw new Error(`${observation.name} v${observation.version}: the GTS diagnostic answer belongs to another document version`);
      }
      const observedItems = observation.response.map(item => ({
        code: item.code, message: item.message, severity: item.severity, range: item.range,
      }));
      if (route === 'gts-lsp') {
        const rawReply = raw.value;
        const errors = (rawReply?.items ?? []).filter(item => item.severity === 1);
        if (diagnosticSet(errors).join('|') !== diagnosticSet(observedItems).join('|')) {
          throw new Error(`${observation.name} v${observation.version}: the editor diagnostics differ from the raw native reply`);
        }
        const wire = responses.get(observation.requestId);
        if (!wire) throw new Error('No recorded wire reply matches the raw GTS diagnostic answer');
        if (JSON.stringify(wire.result) !== JSON.stringify(rawReply)) {
          throw new Error('The recorded raw GTS answer differs from the reply on the wire');
        }
        if (wire.atMs > observation.at) throw new Error('The raw GTS reply arrived after the editor answer');
      } else {
        const projected = [];
        for (const command of diagnosticCommands.tsserver) {
          const entry = (raw.value ?? []).find(item => item.command === command);
          if (!entry) throw new Error(`The raw ${route} reply is missing ${command}`);
          if (entry.response?.success !== true) throw new Error(`The native ${command} call did not succeed`);
          for (const item of (entry.response.body ?? []).filter(value => value.category === 'error')) projected.push(projectTsDiagnostic(item));
        }
        if (diagnosticSet(projected).join('|') !== diagnosticSet(observedItems).join('|')) {
          throw new Error(`${observation.name} v${observation.version}: the editor diagnostics differ from the raw native reply`);
        }
      }
      bindings.push({
        name: observation.name, version: observation.version, requestId: observation.requestId,
        nativeFile: native.file, nativeRow: delivered.row, sourceSha256: sha256(source.text),
      });
    }
  }
  return bindings;
}

const featureCommand = {
  hover: 'vscode.executeHoverProvider',
  definition: 'vscode.executeDefinitionProvider',
  completion: 'vscode.executeCompletionItemProvider',
  signature: 'vscode.executeSignatureHelpProvider',
};

/** Every editor-visible answer must be preceded by the real VS Code request that produced it. */
export function auditEditorRequests(report) {
  const pairs = [];
  for (const response of report.records.filter(row => row.operation === 'observation' && row.kind === 'feature')) {
    const requests = report.records.filter(row => row.operation === 'feature request' && row.requestId === response.requestId);
    if (requests.length !== 1) throw new Error('Missing or repeated real VS Code feature request');
    const request = requests[0];
    for (const key of ['name', 'version', 'feature', 'position']) {
      if (JSON.stringify(request[key]) !== JSON.stringify(response[key])) throw new Error(`A feature request changed its ${key}`);
    }
    if (fileKey(request.uri) !== fileKey(response.uri)) throw new Error('A feature request changed its source');
    if (!(request.at <= response.at)) throw new Error('A feature response precedes its request');
    if (request.command !== featureCommand[response.feature]) throw new Error('A feature request did not use the real VS Code command');
    pairs.push({ requestId: response.requestId, requestedAtMs: request.at, respondedAtMs: response.at });
  }
  for (const source of report.records.filter(row => row.operation === 'observation' && row.kind === 'source' && row.origin === 'filesystem')) {
    const writes = report.records.filter(row => row.operation === 'filesystem write' && row.name === source.name && row.phase === source.phase);
    if (writes.length !== 1) throw new Error('Missing actual filesystem edit');
    if (fileKey(writes[0].uri) !== fileKey(source.uri)) throw new Error('A filesystem write changed its source');
    if (writes[0].sha256 !== sha256(source.text)) throw new Error('Filesystem write bytes differ from the observed source');
    if (!(writes[0].at <= source.at)) throw new Error('A filesystem write happened after the observation');
  }
  return pairs;
}


