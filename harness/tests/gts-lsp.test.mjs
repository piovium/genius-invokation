// Selftests for the gts-lsp validator.
//
// The canonical evidence below is synthetic: it exercises the validator's own
// logic and its negative paths, not the product. Real product evidence comes
// only from running the registered collector through the runner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hashFile, readJson } from '../core.mjs';
import { evaluate, validate } from '../collectors/lsp/gts-lsp-validator.mjs';

const expectations = readJson(fileURLToPath(new URL('../collectors/lsp/gts-lsp-expectations.json', import.meta.url)));
const repository = path.join('C:', 'checkout', 'gts');
const workspace = path.join('C:', 'run', 'gts-lsp-workspace');
const entryPath = path.join(repository, expectations.server.entry);
const addonPath = path.join(repository, 'node_modules', '@typescript-native-bridge',
  'win32-x64', expectations.engine.nativeAddonRelativePath);
const nativeName = expectations.engine.nativePackageTemplate
  .replace('{platform}', 'win32').replace('{arch}', 'x64');
const stepMethods = {
  open: 'textDocument/didOpen',
  change: 'textDocument/didChange',
  diagnostics: 'textDocument/diagnostic',
  hover: 'textDocument/hover',
  completion: 'textDocument/completion',
  definition: 'textDocument/definition',
  signatureHelp: 'textDocument/signatureHelp',
  shutdown: 'shutdown',
};

function responseFor(step) {
  const expect = step.expect;
  if (step.op === 'diagnostics') {
    return { kind: 'full', items: expect.diagnostics.map(item => ({ ...structuredClone(item), message: `ts: ${item.messageContains}` })) };
  }
  if (step.op === 'hover') return { contents: { kind: 'markdown', value: `const Barbara: ${expect.hoverContains}` } };
  if (step.op === 'completion') return { items: expect.completionLabels.map(label => ({ label })) };
  if (step.op === 'definition') {
    const start = expect.definitionStart;
    return [{ uri: pathToFileURL(path.join(workspace, expect.definitionFile)).href,
      range: { start, end: { line: start.line, character: start.character + 7 } } }];
  }
  if (step.op === 'signatureHelp') return { signatures: [{ label: expect.signatureLabel }] };
  return null;
}

function canonical() {
  const tsdk = path.join(repository, 'node_modules', 'typescript', 'lib');
  const identity = {
    tsdk,
    resolvedTypescript: { name: expectations.engine.packageName, version: expectations.engine.version,
      packagePath: path.join(tsdk, '..', 'package.json'), entryPath: path.join(tsdk, 'typescript.js'),
      entrySha256: 'a'.repeat(64) },
    nativePackage: { name: nativeName, version: expectations.engine.version, packagePath: path.join(addonPath, '..') },
    nativeAddon: { path: addonPath, relativePath: '@typescript-native-bridge/win32-x64/native/bridge.node',
      sha256: 'b'.repeat(64), bytes: 1024 },
    tsgoBuildInfoVersion: expectations.engine.tsgoBuildInfoVersion,
  };
  const documents = [];
  const entries = [];
  const transcript = [];
  const capabilities = Object.fromEntries([['textDocumentSync', expectations.server.documentSyncKind],
    ...expectations.server.requiredCapabilities.map(name => [name, true])]);
  const record = (entry, params, response = null) => {
    entries.push({ ...entry, response });
    transcript.push({ ...entry, params, response });
  };
  record({ id: 'initialize', op: 'initialize', method: 'initialize', file: null, version: null,
    durationMs: 1, timedOut: false, error: null },
  { initializationOptions: { typescript: { tsdk } } }, { capabilities });
  record({ id: 'initialized', op: 'initialized', method: 'initialized', file: null, version: null,
    durationMs: 1, timedOut: false, error: null }, {});
  const versions = new Map(expectations.documents.map(document => [document.file, 0]));
  for (const step of expectations.steps) {
    const entry = { id: step.id, op: step.op, method: stepMethods[step.op], file: step.file ?? null,
      version: null, durationMs: 2, timedOut: false, error: null };
    if (step.op === 'open' || step.op === 'change') {
      const version = versions.get(step.file) + 1;
      versions.set(step.file, version);
      entry.version = version;
      if (step.op === 'open') {
        const document = expectations.documents.find(item => item.file === step.file);
        documents.push({ file: step.file, uri: pathToFileURL(path.join(workspace, step.file)).href,
          languageId: document.languageId, version, versions: [version] });
        record(entry, { textDocument: { uri: pathToFileURL(path.join(workspace, step.file)).href,
          languageId: document.languageId, version, text: expectations.texts[document.textId] } });
        continue;
      }
      record(entry, { textDocument: { uri: pathToFileURL(path.join(workspace, step.file)).href, version },
        contentChanges: [{ text: expectations.texts[step.textId] }] });
      continue;
    }
    record(entry, { textDocument: { uri: '' }, ...(step.position ? { position: step.position } : {}) }, responseFor(step));
  }
  const observation = {
    gateId: 'gts-lsp',
    platform: 'win32',
    arch: 'x64',
    server: { command: { executable: 'C:\\node.exe', args: [entryPath, '--stdio'], cwd: workspace },
      entry: { path: entryPath, sha256: 'c'.repeat(64) }, exitCode: 0, closed: true },
    capabilities: structuredClone(capabilities),
    identity,
    documents,
    entries,
    rpcTrace: { file: 'gts-lsp.rpc-trace.log', sha256: 'f'.repeat(64), enter: 42, exit: 42 },
    transcript: { file: 'gts-lsp.transcript.json', sha256: 'd'.repeat(64) },
    stderr: { file: 'gts-lsp.server-stderr.log', sha256: 'e'.repeat(64) },
  };
  const context = {
    platform: 'win32',
    arch: 'x64',
    repository,
    runDirectory: path.dirname(workspace),
    entrySha256: 'c'.repeat(64),
    stderr: 'TNB ACTIVE\n[tsgo-profile] rpc=42/100ms\n',
    identity: { tsdk, resolvedTypescript: { ...identity.resolvedTypescript },
      nativeAddon: { path: addonPath, sha256: 'b'.repeat(64), bytes: 1024 },
      nativePackage: { name: nativeName, version: expectations.engine.version },
      tsgoBuildInfoVersion: expectations.engine.tsgoBuildInfoVersion },
    trace: { bridgeLoad: [`1 BRIDGE_LOAD pid=42 GODEBUG=asyncpreemptoff=1 lib=${addonPath}`],
      enter: 42, exit: 42, methods: [...expectations.engine.requiredRpcMethods] },
  };
  return { observation, transcript, context };
}

function clone(value) {
  return structuredClone(value);
}

function run(change) {
  const { observation, transcript, context } = canonical();
  change({ observation, transcript, context });
  return evaluate({ observation, transcript, expectations, context });
}

test('registered gts-lsp evidence passes when semantics and native identity agree', () => {
  assert.deepEqual(run(() => {}).status, 'PASS');
});

test('the sealed expectations keep the reviewed shape', () => {
  assert.equal(expectations.steps.length, 23);
  assert.equal(expectations.documents.length, 3);
  assert.deepEqual(expectations.server.args, ['--stdio']);
  assert.equal(expectations.server.documentSyncKind, 2);
  assert.equal(expectations.engine.minimumRpcCalls, 20);
  assert.deepEqual(expectations.engine.requiredRpcMethods.slice().sort(), ['definitionAndBoundSpan',
    'getCompletionsAtPosition', 'getSemanticDiagnostics', 'quickinfo', 'signatureHelp', 'updateSnapshot']);
  const diagnostics = expectations.steps.flatMap(step => step.expect?.diagnostics ?? []);
  assert.deepEqual(diagnostics.map(item => item.code).sort(), [2322, 2345]);
  assert.ok(diagnostics.every(item => item.range && item.messageContains));
});

test('a recorded fixture text that is not the reviewed text is rejected', () => {
  const result = run(({ transcript }) => {
    transcript.find(entry => entry.id === 'open-current-clean').params.textDocument.text = '// 不是封存的 fixture\r\n';
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /recorded text is not the reviewed fixture/);
  const changed = run(({ transcript }) => {
    transcript.find(entry => entry.id === 'edit-current-repair').params.contentChanges[0].text = 'health 10;\r\n';
  });
  assert.equal(changed.status, 'FAIL');
  assert.match(changed.reason, /recorded text is not the reviewed fixture/);
});

test('a server started with unreviewed arguments or from outside the run directory is rejected', () => {
  const argumentsChanged = run(({ observation }) => {
    observation.server.command.args = [observation.server.entry.path];
  });
  assert.equal(argumentsChanged.status, 'FAIL');
  assert.match(argumentsChanged.reason, /not the reviewed stdio entry point/);
  const cwd = run(({ observation }) => {
    observation.server.command.cwd = path.join('C:', 'checkout', 'gts');
  });
  assert.equal(cwd.status, 'FAIL');
  assert.match(cwd.reason, /not the reviewed stdio entry point/);
  const executable = run(({ observation }) => {
    observation.server.command.executable = 'C:\\stock\\node-other.exe';
  });
  assert.equal(executable.status, 'FAIL');
  assert.match(executable.reason, /not the reviewed stdio entry point/);
});

test('a missing diagnostic is rejected even though the collector recorded a clean answer', () => {
  const result = run(({ transcript }) => {
    const entry = transcript.find(item => item.id === 'diagnostics-current-type-error');
    entry.response.items = [];
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /diagnostics-current-type-error/);
});

test('a relocated diagnostic span is rejected', () => {
  const result = run(({ transcript }) => {
    const entry = transcript.find(item => item.id === 'diagnostics-legacy-cross-file');
    entry.response.items[0].range.start.line = 0;
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /2322/);
});

test('a definition that leaves the client documents is rejected', () => {
  const result = run(({ transcript }) => {
    const entry = transcript.find(item => item.id === 'definition-legacy-to-character');
    entry.response[0].uri = pathToFileURL(path.join('C:', 'virtual', 'current.gts')).href;
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /definition points at/);
});

test('unbalanced live RPC counters are rejected', () => {
  const result = run(({ observation, context }) => {
    observation.rpcTrace.exit = 41;
    context.trace.exit = 41;
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /entered but/);
});

test('a trace without a required native call is rejected', () => {
  const result = run(({ context }) => {
    context.trace.methods = context.trace.methods.filter(method => method !== 'quickinfo');
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /quickinfo/);
});

test('a bridge load record that disagrees with the resolved addon is rejected', () => {
  const result = run(({ context }) => {
    context.trace.bridgeLoad = [`1 BRIDGE_LOAD pid=42 GODEBUG=asyncpreemptoff=1 lib=C:\\other\\bridge.node`];
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /bridge loaded/);
});

test('an addon whose bytes changed under the recorded hash is rejected', () => {
  const result = run(({ context }) => {
    context.identity.nativeAddon.sha256 = 'f'.repeat(64);
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /native addon identity/);
});

test('a compiler version that is not the pinned pin is rejected', () => {
  const result = run(({ observation }) => {
    observation.identity.resolvedTypescript.version = '6.0.3-bridge.15.tsgo.7.0.1';
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /resolved compiler is/);
});

test('a timed out or errored exchange is rejected', () => {
  const timedOut = run(({ transcript }) => {
    transcript.find(item => item.id === 'signature-max').timedOut = true;
  });
  assert.equal(timedOut.status, 'FAIL');
  assert.match(timedOut.reason, /timed out/);
  const errored = run(({ transcript }) => {
    transcript.find(item => item.id === 'hover-character-handle').error = 'connection closed';
  });
  assert.equal(errored.status, 'FAIL');
  assert.match(errored.reason, /connection closed/);
});

test('missing, reordered or duplicated exchanges are rejected', () => {
  const missing = run(({ observation, transcript }) => {
    observation.entries.pop();
    transcript.pop();
  });
  assert.equal(missing.status, 'FAIL');
  assert.match(missing.reason, /step coverage mismatch/);
  const reordered = run(({ observation }) => {
    const [first, second] = observation.entries.splice(2, 2);
    observation.entries.splice(2, 0, second, first);
  });
  assert.equal(reordered.status, 'FAIL');
  assert.match(reordered.reason, /step coverage mismatch/);
  const duplicated = run(({ observation }) => {
    const index = observation.entries.findIndex(entry => entry.id === 'shutdown');
    observation.entries.splice(index, 0, { ...observation.entries[index - 1] });
  });
  assert.equal(duplicated.status, 'FAIL');
  assert.match(duplicated.reason, /step coverage mismatch/);
});

test('a document version regression is rejected', () => {
  const result = run(({ transcript }) => {
    transcript.find(item => item.id === 'edit-current-restore').version = 7;
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /document version/);
});

test('a server that failed, or never reported an exit code, is rejected', () => {
  const result = run(({ observation }) => {
    observation.server.exitCode = 1;
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /exited with 1/);
  const neverExited = run(({ observation }) => {
    observation.server.exitCode = null;
    observation.server.closed = false;
  });
  assert.equal(neverExited.status, 'FAIL');
  assert.match(neverExited.reason, /exited with null/);
});

test('missing incremental sync or capabilities are rejected', () => {
  const sync = run(({ transcript }) => {
    transcript.find(entry => entry.id === 'initialize').response.capabilities.textDocumentSync = 1;
  });
  assert.equal(sync.status, 'FAIL');
  assert.match(sync.reason, /incremental document sync/);
  const hover = run(({ observation, transcript }) => {
    delete transcript.find(entry => entry.id === 'initialize').response.capabilities.hoverProvider;
    delete observation.capabilities.hoverProvider;
  });
  assert.equal(hover.status, 'FAIL');
  assert.match(hover.reason, /lacks hoverProvider/);
});

test('capabilities, opened documents and tsdk come from the recorded exchange', () => {
  const declared = run(({ observation }) => {
    observation.capabilities.codeLensProvider = true;
  });
  assert.equal(declared.status, 'FAIL');
  assert.match(declared.reason, /disagree with the initialize exchange/);
  const relocated = run(({ transcript }) => {
    transcript.find(entry => entry.id === 'open-consumer-clean').params.textDocument.uri =
      pathToFileURL(path.join('C:', 'elsewhere', 'consumer.ts')).href;
  });
  assert.equal(relocated.status, 'FAIL');
  assert.match(relocated.reason, /declared documents disagree/);
  const incomplete = run(({ transcript }) => {
    delete transcript.find(entry => entry.id === 'open-current-clean').params.textDocument.languageId;
  });
  assert.equal(incomplete.status, 'FAIL');
  assert.match(incomplete.reason, /client open is incomplete/);
  const wrongTsdk = run(({ transcript }) => {
    transcript.find(entry => entry.id === 'initialize').params.initializationOptions.typescript.tsdk = 'C:\\stock\\typescript\\lib';
  });
  assert.equal(wrongTsdk.status, 'FAIL');
  assert.match(wrongTsdk.reason, /checkout tsdk/);
});

test('a bridge load record without the reviewed process identity is rejected', () => {
  const result = run(({ context }) => {
    context.trace.bridgeLoad = [`1 BRIDGE_LOAD GODEBUG=asyncpreemptoff=1 lib=${addonPath}`];
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /lacks pid=/);
});

test('leaked identifiers and fatal server output are both rejected', () => {
  const result = run(({ context }) => {
    context.stderr += '\n__gts_internal_handle';
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /__gts_/);
  const panic = run(({ context }) => {
    context.stderr += '\npanic: runtime error: invalid memory address';
  });
  assert.equal(panic.status, 'FAIL');
  assert.match(panic.reason, /panic:/);
});

test('evidence references without a hash are rejected', async () => {
  const { observation } = canonical();
  observation.transcript.sha256 = null;
  const result = await validate(observation, {
    contract: { repositories: { gts: { path: 'gts' } } }, expectations,
    root: os.tmpdir(), directory: os.tmpdir(), gate: { id: 'gts-lsp' },
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /carries no hash/);
});

test('the IO layer verifies evidence hashes and blocks on a missing checkout', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const { observation } = canonical();
  const files = {
    'gts-lsp.transcript.json': '[]',
    'gts-lsp.rpc-trace.log': '1 ENTER getSourceFile\n1 EXIT getSourceFile\n',
    'gts-lsp.server-stderr.log': 'TNB ACTIVE\n[tsgo-profile]\n',
  };
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(directory, name), text);
  observation.transcript.sha256 = await hashFile(path.join(directory, 'gts-lsp.transcript.json'));
  observation.rpcTrace.sha256 = await hashFile(path.join(directory, 'gts-lsp.rpc-trace.log'));
  observation.stderr.sha256 = await hashFile(path.join(directory, 'gts-lsp.server-stderr.log'));
  const contract = { repositories: { gts: { path: path.join('worktrees', 'gts') } } };
  const argumentsFor = () => ({ contract, expectations, root, directory, gate: { id: 'gts-lsp' } });
  const blocked = await validate(observation, argumentsFor());
  assert.equal(blocked.status, 'BLOCKED');
  assert.match(blocked.reason, /checkout/);
  fs.mkdirSync(path.join(root, 'worktrees', 'gts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'worktrees', 'gts', 'package.json'), '{}');
  const missingEntry = await validate(observation, argumentsFor());
  assert.equal(missingEntry.status, 'BLOCKED');
  assert.match(missingEntry.reason, /entry point unavailable/);
});

test('the IO layer rejects an evidence file that changed after recording', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const { observation } = canonical();
  fs.writeFileSync(path.join(directory, 'gts-lsp.transcript.json'), '[]');
  fs.writeFileSync(path.join(directory, 'gts-lsp.rpc-trace.log'), 'trace');
  fs.writeFileSync(path.join(directory, 'gts-lsp.server-stderr.log'), 'log');
  const result = await validate(observation, {
    contract: { repositories: { gts: { path: 'gts' } } }, expectations, root, directory, gate: { id: 'gts-lsp' },
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /changed/);
});

test('the IO layer confines evidence references to the run directory', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-lsp-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const { observation } = canonical();
  const outside = path.join(os.tmpdir(), 'gts-lsp-transcript.json');
  fs.writeFileSync(outside, '[]');
  t.after(() => fs.rmSync(outside, { force: true }));
  for (const reference of ['../gts-lsp.transcript.json', outside]) {
    const escaping = clone(observation);
    escaping.transcript.file = reference;
    const result = await validate(escaping, {
      contract: { repositories: { gts: { path: 'gts' } } }, expectations, root, directory, gate: { id: 'gts-lsp' },
    });
    assert.equal(result.status, 'FAIL', reference);
    assert.match(result.reason, /leaves the run directory/);
  }
});

test('evidence for another gate is rejected', async () => {
  const result = await validate(clone(canonical().observation), {
    contract: { repositories: { gts: { path: 'gts' } } }, expectations, root: os.tmpdir(), directory: os.tmpdir(),
    gate: { id: 'desktop' },
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /another gate/);
});
