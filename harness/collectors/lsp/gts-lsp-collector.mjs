// Registered collector for the gts-lsp gate.
//
// Drives @gi-tcg/gts-language-server over stdio, with no editor in the loop,
// through the reviewed step script in gts-lsp-expectations.json. It records the
// raw protocol transcript, the live TNB RPC trace, the server log and the
// compiler identity it resolves from the gate's checkout. It never decides
// PASS/FAIL: the validator re-derives every assertion from these raw records.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requestTimeoutMs = 30000;
const closeGraceMs = 15000;
const env = process.env;
const { hashFile, readJson, writeJson } = await import(
  pathToFileURL(path.join(env.HARNESS_ROOT, 'harness/core.mjs')).href
);
const contract = readJson(path.join(env.HARNESS_ROOT, 'harness/contract.json'));
const expectations = readJson(
  path.join(env.HARNESS_ROOT, 'harness/collectors/lsp/gts-lsp-expectations.json'),
);
const repository = path.join(env.HARNESS_ROOT, contract.repositories.gts.path);
const runDirectory = env.HARNESS_RUN_DIRECTORY;

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
const notificationOps = new Set(['open', 'change']);

function prepareWorkspace() {
  const workspace = path.join(runDirectory, 'gts-lsp-workspace');
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(workspace, { recursive: true });
  const relativeToRepository = target =>
    path.relative(workspace, path.join(repository, target)).split(path.sep).join('/');
  const resolve = value =>
    typeof value === 'string' ? value.replace('{repository}', relativeToRepository('')) : value;
  const expand = value => Array.isArray(value) ? value.map(resolve)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expand(item)]))
      : resolve(value);
  writeJson(path.join(workspace, 'package.json'), expand(expectations.workspace.packageJson));
  writeJson(path.join(workspace, 'tsconfig.json'), expand(expectations.workspace.tsconfig));
  for (const document of expectations.documents) {
    fs.writeFileSync(path.join(workspace, document.file), expectations.texts[document.textId]);
  }
  return { workspace, uri: file => pathToFileURL(path.join(workspace, file)).toString() };
}

async function collectIdentity(require) {
  const packagePath = require.resolve('typescript/package.json');
  const entryPath = require.resolve('typescript/lib/typescript.js');
  const manifest = readJson(packagePath);
  const addonRelative = path.join(
    `@typescript-native-bridge/${process.platform}-${process.arch}`,
    expectations.engine.nativeAddonRelativePath,
  );
  const addonPath = require.resolve(addonRelative);
  const addonPackagePath = require.resolve(
    `@typescript-native-bridge/${process.platform}-${process.arch}/package.json`,
  );
  const addonPackage = readJson(addonPackagePath);
  const compiler = await import(pathToFileURL(entryPath).href);
  const module = compiler.default ?? compiler;
  return {
    tsdk: path.dirname(entryPath),
    resolvedTypescript: {
      name: manifest.name,
      version: manifest.version,
      packagePath,
      entryPath,
      entrySha256: await hashFile(entryPath),
    },
    nativePackage: {
      name: addonPackage.name,
      version: addonPackage.version,
      packagePath: addonPackagePath,
    },
    nativeAddon: {
      path: addonPath,
      relativePath: addonRelative.split(path.sep).join('/'),
      sha256: await hashFile(addonPath),
      bytes: fs.statSync(addonPath).size,
    },
    tsgoBuildInfoVersion: module.tnbGetTsgoBuildInfoVersion?.() ?? null,
  };
}

async function main() {
  const { workspace, uri } = prepareWorkspace();
  const require = createRequire(path.join(repository, 'package.json'));
  const identity = await collectIdentity(require);
  const { createProtocolConnection, StreamMessageReader, StreamMessageWriter } = await import(
    pathToFileURL(require.resolve('@volar/language-server/node.js')).href
  );
  const protocol = {
    entry: path.join(repository, expectations.server.entry),
    args: expectations.server.args,
    trace: path.join(runDirectory, 'gts-lsp.rpc-trace.log'),
  };
  protocol.sha256 = await hashFile(protocol.entry);
  const child = spawn(process.execPath, [protocol.entry, ...protocol.args], {
    cwd: workspace,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...env, TSGO_PROFILE: '1', TNB_TRACE_RPC: '1', TNB_TRACE_RPC_FILE: protocol.trace },
  });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', text => { stderr += text; });
  let exitCode = null;
  const closed = new Promise(resolve => child.on('close', code => { exitCode = code; resolve(); }));
  const connection = createProtocolConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  );
  child.on('close', () => connection.dispose());
  connection.onRequest('workspace/configuration', params => params.items.map(() => null));
  connection.onRequest('client/registerCapability', () => null);
  connection.onRequest('workspace/diagnostic/refresh', () => null);
  connection.onRequest('workspace/semanticTokens/refresh', () => null);
  connection.listen();

  const transcript = [];
  const entries = [];
  const documents = new Map();
  const record = (entry, params) => {
    entries.push(entry);
    transcript.push({ ...entry, params, response: entry.response ?? null });
  };
  const started = () => ({ durationMs: null, timedOut: false, error: null, response: null });
  const request = async (entry, params) => {
    Object.assign(entry, started());
    const begin = Date.now();
    let timer;
    try {
      entry.response = await Promise.race([
        connection.sendRequest(entry.method, params),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            entry.timedOut = true;
            reject(new Error(`${entry.method} timed out after ${requestTimeoutMs}ms`));
          }, requestTimeoutMs);
        }),
      ]);
    } catch (error) {
      entry.error = String(error?.message ?? error);
    } finally {
      clearTimeout(timer);
      entry.durationMs = Date.now() - begin;
    }
    return entry;
  };
  const versionFor = file => {
    const document = documents.get(file);
    document.version += 1;
    document.versions.push(document.version);
    return document.version;
  };
  const initializeEntry = {
    id: 'initialize', op: 'initialize', method: 'initialize', file: null, languageId: null,
    version: null, durationMs: null, timedOut: false, error: null, response: null,
  };
  const initializeParams = {
    processId: null,
    rootUri: uri(''),
    workspaceFolders: [{ uri: uri(''), name: 'gts-lsp-fixture' }],
    capabilities: {
      workspace: {
        configuration: true, workspaceFolders: true,
        didChangeWatchedFiles: { dynamicRegistration: true }, diagnostics: { refreshSupport: true },
      },
      textDocument: {
        hover: { contentFormat: ['markdown', 'plaintext'] },
        completion: { completionItem: { snippetSupport: true } },
        signatureHelp: { signatureInformation: { documentationFormat: ['markdown', 'plaintext'] } },
        definition: {},
        diagnostic: {},
      },
    },
    initializationOptions: { typescript: { tsdk: identity.tsdk } },
  };
  await request(initializeEntry, initializeParams);
  record(initializeEntry, initializeParams);
  record({ id: 'initialized', op: 'initialized', method: 'initialized', file: null, languageId: null,
    version: null, durationMs: null, timedOut: false, error: null, response: null }, {});
  connection.sendNotification('initialized', {});

  for (const step of expectations.steps) {
    const entry = {
      id: step.id, op: step.op, method: stepMethods[step.op], file: step.file ?? null,
      languageId: null, version: null, durationMs: null, timedOut: false, error: null, response: null,
    };
    const target = step.file ? uri(step.file) : null;
    const params = { textDocument: { uri: target } };
    if (step.op === 'open') {
      const document = expectations.documents.find(item => item.file === step.file);
      if (!documents.has(step.file)) {
        documents.set(step.file, { languageId: document.languageId, version: 0, versions: [] });
      }
      entry.languageId = document.languageId;
      entry.version = versionFor(step.file);
      entry.text = expectations.texts[document.textId];
      record(entry, { textDocument: { uri: target, languageId: entry.languageId, version: entry.version, text: entry.text } });
      connection.sendNotification(entry.method, { textDocument: { uri: target, languageId: entry.languageId, version: entry.version, text: entry.text } });
      continue;
    }
    if (step.op === 'change') {
      entry.version = versionFor(step.file);
      entry.text = expectations.texts[step.textId];
      record(entry, { textDocument: { uri: target, version: entry.version }, contentChanges: [{ text: entry.text }] });
      connection.sendNotification(entry.method, { textDocument: { uri: target, version: entry.version }, contentChanges: [{ text: entry.text }] });
      continue;
    }
    if (step.op === 'shutdown') {
      await request(entry, undefined);
      record(entry, undefined);
      connection.sendNotification('exit');
      await Promise.race([closed, new Promise(resolve => setTimeout(resolve, closeGraceMs))]);
      continue;
    }
    if (step.position) params.position = step.position;
    await request(entry, params);
    record(entry, params);
  }
  if (exitCode === null) child.kill();
  await Promise.race([closed, new Promise(resolve => setTimeout(resolve, closeGraceMs))]);
  connection.dispose();

  const initialize = transcript.find(item => item.method === 'initialize');
  const capabilities = initialize?.response?.capabilities ?? null;
  const traceFile = 'gts-lsp.rpc-trace.log';
  const stderrFile = 'gts-lsp.server-stderr.log';
  const transcriptFile = 'gts-lsp.transcript.json';
  writeJson(path.join(runDirectory, transcriptFile), transcript);
  fs.writeFileSync(path.join(runDirectory, stderrFile), stderr);
  const trace = fs.existsSync(protocol.trace)
    ? fs.readFileSync(protocol.trace, 'utf8').split(/\r?\n/).filter(Boolean) : [];
  const failed = entries.some(entry => entry.timedOut || entry.error) || exitCode !== 0;
  writeJson(env.HARNESS_OUTPUT, {
    runNonce: env.HARNESS_NONCE,
    gateId: env.HARNESS_GATE,
    controlDigest: env.HARNESS_SEAL,
    sourceDigest: env.HARNESS_SOURCE_DIGEST,
    platform: process.platform,
    arch: process.arch,
    server: {
      command: { executable: process.execPath, args: [protocol.entry, ...protocol.args], cwd: workspace },
      entry: { path: protocol.entry, sha256: protocol.sha256 },
      exitCode,
      closed: exitCode !== null,
    },
    capabilities,
    identity,
    documents: [...documents].map(([file, document]) => ({ file, uri: uri(file), ...document })),
    entries,
    transcript: { file: transcriptFile, sha256: await hashFile(path.join(runDirectory, transcriptFile)) },
    rpcTrace: {
      file: traceFile, sha256: await hashFile(path.join(runDirectory, traceFile)),
      bridgeLoad: trace.filter(line => line.includes('BRIDGE_LOAD')),
      enter: trace.filter(line => line.includes(' ENTER ')).length,
      exit: trace.filter(line => line.includes(' EXIT ')).length,
      methods: [...new Set(trace.filter(line => line.includes(' ENTER ')).map(line => line.trim().split(/\s+/).at(-1)))].sort(),
    },
    stderr: { file: stderrFile, sha256: await hashFile(path.join(runDirectory, stderrFile)) },
  });
  if (failed) {
    console.error(`gts-lsp collector failed: ${entries.filter(entry => entry.timedOut || entry.error).map(entry => `${entry.id}: ${entry.error ?? 'timed out'}`).join('; ') || `server exit code ${exitCode}`}`);
    process.exitCode = 1;
  }
  console.log(`gts-lsp: ${entries.length} steps, rpc enter=${trace.filter(line => line.includes(' ENTER ')).length}, exit=${exitCode}`);
}

await main();
