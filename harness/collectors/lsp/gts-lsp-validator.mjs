// Validator for the gts-lsp gate.
//
// `evaluate` is pure: it re-derives every claim from the raw protocol
// transcript, the re-counted RPC trace, the server log and the compiler
// identity that `validate` resolves from the gate's checkout. No input field
// that reports a status or a summary is trusted.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { hashFile, inside: insideRunDirectory } = await import(new URL('../../core.mjs', import.meta.url).href);

const stepMethod = {
  open: 'textDocument/didOpen',
  change: 'textDocument/didChange',
  diagnostics: 'textDocument/diagnostic',
  hover: 'textDocument/hover',
  completion: 'textDocument/completion',
  definition: 'textDocument/definition',
  signatureHelp: 'textDocument/signatureHelp',
  shutdown: 'shutdown',
};

const normalizePath = value => path.normalize(value);
const samePath = (left, right, platform) => platform === 'win32'
  ? normalizePath(left).toLowerCase() === normalizePath(right).toLowerCase()
  : normalizePath(left) === normalizePath(right);
const inside = (target, directory) => {
  const relative = path.relative(directory, target);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};
const fsPath = uri => fileURLToPath(uri);

function checkDiagnostics(entry, step) {
  const report = entry.response;
  const items = report?.kind === 'full' ? report.items : report?.items;
  if (!Array.isArray(items)) return `${step.id}: diagnostics answer is not a full report`;
  const expected = step.expect.diagnostics;
  if (items.length !== expected.length) {
    return `${step.id}: expected ${expected.length} diagnostics, server reported ${items.length}`;
  }
  for (const want of expected) {
    const hit = items.find(item =>
      item.code === want.code
      && item.range?.start?.line === want.range.start.line
      && item.range?.start?.character === want.range.start.character
      && item.range?.end?.line === want.range.end.line
      && item.range?.end?.character === want.range.end.character);
    if (!hit) {
      return `${step.id}: missing diagnostic ${want.code} at ${want.range.start.line}:${want.range.start.character}`;
    }
    if (want.severity !== undefined && hit.severity !== want.severity) {
      return `${step.id}: diagnostic ${want.code} severity ${hit.severity}`;
    }
    if (want.source !== undefined && hit.source !== want.source) {
      return `${step.id}: diagnostic ${want.code} source ${hit.source}`;
    }
    if (want.messageContains && !String(hit.message).includes(want.messageContains)) {
      return `${step.id}: diagnostic ${want.code} message ${JSON.stringify(hit.message)}`;
    }
  }
  return null;
}

function checkHover(entry, step) {
  const contents = entry.response?.contents;
  const value = typeof contents === 'string' ? contents : contents?.value;
  return String(value ?? '').includes(step.expect.hoverContains)
    ? null
    : `${step.id}: hover answer does not contain ${step.expect.hoverContains}`;
}

function checkCompletion(entry, step) {
  const labels = entry.response?.items?.map(item => item.label);
  if (!Array.isArray(labels)) return `${step.id}: completion answer has no items`;
  const missing = step.expect.completionLabels.filter(label => !labels.includes(label));
  return missing.length ? `${step.id}: completion is missing ${missing.join(', ')}` : null;
}

function checkDefinition(entry, step, context) {
  const answers = entry.response;
  if (!Array.isArray(answers) || !answers.length) return `${step.id}: no definition returned`;
  const uri = answers[0].targetUri ?? answers[0].uri;
  if (!uri) return `${step.id}: definition answer has no uri`;
  const target = fsPath(uri);
  const expected = context.documents.get(step.expect.definitionFile);
  if (!expected) return `${step.id}: expected definition file was never opened`;
  if (!samePath(target, expected, context.platform)) {
    return `${step.id}: definition points at ${target} instead of ${expected}`;
  }
  const start = answers[0].targetSelectionRange?.start ?? answers[0].range?.start;
  const want = step.expect.definitionStart;
  if (start?.line !== want.line || start?.character !== want.character) {
    return `${step.id}: definition starts at ${start?.line}:${start?.character}`;
  }
  return null;
}

function checkSignature(entry, step) {
  const labels = entry.response?.signatures?.map(item => item.label) ?? [];
  return labels.some(label => label.includes(step.expect.signatureLabel))
    ? null
    : `${step.id}: signature help returned ${JSON.stringify(labels)}`;
}

function checkFixtureText(entry, step, expectations) {
  if (step.op !== 'open' && step.op !== 'change') return null;
  const textId = step.textId ?? expectations.documents.find(document => document.file === step.file)?.textId;
  if (!textId) return `${step.id}: recorded step has no reviewed fixture text`;
  const text = step.op === 'open' ? entry.params?.textDocument?.text : entry.params?.contentChanges?.[0]?.text;
  return text === expectations.texts[textId]
    ? null
    : `${step.id}: recorded text is not the reviewed fixture`;
}

function checkStep(entry, step, context) {
  if (entry.method !== stepMethod[step.op]) return `${step.id}: recorded ${entry.method}`;
  if (entry.timedOut) return `${step.id}: request timed out`;
  if (entry.error) return `${step.id}: ${entry.error}`;
  if (!step.expect) return null;
  if (step.op === 'diagnostics') return checkDiagnostics(entry, step);
  if (step.op === 'hover') return checkHover(entry, step);
  if (step.op === 'completion') return checkCompletion(entry, step);
  if (step.op === 'definition') return checkDefinition(entry, step, context);
  if (step.op === 'signatureHelp') return checkSignature(entry, step);
  return `${step.id}: unexpected expectation`;
}

function checkIdentity(observation, expectations, context) {
  const engine = expectations.engine;
  const resolved = observation.identity?.resolvedTypescript;
  const derived = context.identity;
  if (resolved?.name !== engine.packageName || resolved?.version !== engine.version) {
    return `resolved compiler is ${resolved?.name}@${resolved?.version}`;
  }
  if (observation.identity?.tsdk !== derived.tsdk) {
    return 'declared tsdk disagrees with the compiler resolved from the checkout';
  }
  if (derived.resolvedTypescript.version !== resolved.version
    || derived.resolvedTypescript.entrySha256 !== resolved.entrySha256
    || !samePath(derived.resolvedTypescript.entryPath, resolved.entryPath, context.platform)
    || !inside(resolved.entryPath, context.repository)) {
    return 'resolved compiler does not match the checkout on disk';
  }
  if (derived.nativeAddon.sha256 !== observation.identity.nativeAddon?.sha256
    || derived.nativeAddon.bytes !== observation.identity.nativeAddon?.bytes
    || !samePath(derived.nativeAddon.path, observation.identity.nativeAddon?.path, context.platform)
    || !inside(observation.identity.nativeAddon?.path ?? '', context.repository)) {
    return 'native addon identity does not match the checkout on disk';
  }
  if (observation.identity.nativeAddon.relativePath !== engine.nativeAddonRelativePath
    && !observation.identity.nativeAddon.relativePath.endsWith(engine.nativeAddonRelativePath)) {
    return `native addon path is ${observation.identity.nativeAddon.relativePath}`;
  }
  const nativeName = engine.nativePackageTemplate
    .replace('{platform}', context.platform).replace('{arch}', context.arch);
  if (observation.identity.nativePackage?.name !== nativeName
    || observation.identity.nativePackage?.version !== engine.version
    || derived.nativePackage.version !== engine.version
    || derived.nativePackage.name !== nativeName) {
    return `native addon package is ${observation.identity.nativePackage?.name}@${observation.identity.nativePackage?.version}`;
  }
  if (observation.identity.tsgoBuildInfoVersion !== engine.tsgoBuildInfoVersion
    || derived.tsgoBuildInfoVersion !== engine.tsgoBuildInfoVersion) {
    return `tsgo build info is ${observation.identity.tsgoBuildInfoVersion}`;
  }
  return null;
}

function checkTrace(observation, expectations, context) {
  const engine = expectations.engine;
  const trace = context.trace;
  if (trace.enter !== observation.rpcTrace?.enter || trace.exit !== observation.rpcTrace?.exit) {
    return 'declared RPC counters disagree with the trace file';
  }
  if (trace.enter < engine.minimumRpcCalls) return `only ${trace.enter} live RPC calls`;
  if (trace.exit !== trace.enter) return `${trace.enter} RPC calls entered but ${trace.exit} exited`;
  const missing = engine.requiredRpcMethods.filter(method => !trace.methods.includes(method));
  if (missing.length) return `RPC trace is missing ${missing.join(', ')}`;
  const loaded = trace.bridgeLoad;
  if (loaded.length !== engine.bridgeLoad.records) {
    return `expected ${engine.bridgeLoad.records} bridge load record(s), saw ${loaded.length}`;
  }
  const lib = /lib=(\S+)/.exec(loaded[0])?.[1];
  if (!lib || !samePath(lib, observation.identity.nativeAddon.path, context.platform)) {
    return `bridge loaded ${lib ?? 'no library'}`;
  }
  const missingFragments = engine.bridgeLoad.requiredPatterns
    .filter(pattern => !new RegExp(pattern).test(loaded[0]));
  if (missingFragments.length) return `bridge load record lacks ${missingFragments.join(', ')}`;
  return null;
}

function checkVersions(transcript, expectations) {
  const counters = new Map(expectations.documents.map(document => [document.file, 0]));
  for (const entry of transcript) {
    if (entry.op !== 'open' && entry.op !== 'change') continue;
    const expected = counters.get(entry.file) + 1;
    if (entry.version !== expected || entry.params?.textDocument?.version !== expected) {
      return `${entry.id}: document version ${entry.params?.textDocument?.version}, expected ${expected}`;
    }
    counters.set(entry.file, expected);
  }
  return null;
}

export function evaluate({ observation, transcript, expectations, context }) {
  const engine = expectations.engine;
  const server = expectations.server;
  if (!observation.server?.closed || observation.server.exitCode !== 0) {
    return { status: 'FAIL', reason: `language server exited with ${observation.server?.exitCode}` };
  }
  const command = observation.server.command ?? {};
  if (!samePath(observation.server.entry.path, path.join(context.repository, server.entry), context.platform)
    || observation.server.entry.sha256 !== context.entrySha256
    || JSON.stringify(command.args) !== JSON.stringify([observation.server.entry.path, ...server.args])
    || !inside(command.cwd ?? '', context.runDirectory)
    || !/^node(?:\.exe)?$/i.test(path.basename(command.executable ?? ''))) {
    return { status: 'FAIL', reason: 'language server was not the reviewed stdio entry point' };
  }
  const answered = new Map(transcript.map(entry => [entry.id, entry]));
  const initialize = answered.get('initialize');
  if (!initialize || !answered.has('initialized')) {
    return { status: 'FAIL', reason: 'initialize handshake was not recorded' };
  }
  // Capabilities, opened documents and the compiler path are read from the
  // recorded exchange, never from the summary the collector wrote next to it.
  const capabilities = initialize.response?.capabilities ?? {};
  if (capabilities.textDocumentSync !== server.documentSyncKind) {
    return { status: 'FAIL', reason: 'language server did not negotiate incremental document sync' };
  }
  if (JSON.stringify(observation.capabilities) !== JSON.stringify(capabilities)) {
    return { status: 'FAIL', reason: 'declared capabilities disagree with the initialize exchange' };
  }
  const missingCapabilities = server.requiredCapabilities.filter(name => !capabilities[name]);
  if (missingCapabilities.length) {
    return { status: 'FAIL', reason: `language server lacks ${missingCapabilities.join(', ')}` };
  }
  const identity = checkIdentity(observation, expectations, context);
  if (identity) return { status: 'FAIL', reason: identity };
  const trace = checkTrace(observation, expectations, context);
  if (trace) return { status: 'FAIL', reason: trace };
  const requiredLogs = engine.requiredStderrFragments.filter(fragment => !context.stderr.includes(fragment));
  if (requiredLogs.length) {
    return { status: 'FAIL', reason: `server log is missing ${requiredLogs.join(', ')}` };
  }
  const raw = `${context.stderr}\n${JSON.stringify(transcript)}`;
  const forbidden = engine.forbiddenFragments.filter(fragment => raw.includes(fragment));
  if (forbidden.length) {
    return { status: 'FAIL', reason: `evidence contains ${forbidden.join(', ')}` };
  }
  const expectedIds = ['initialize', 'initialized', ...expectations.steps.map(step => step.id)];
  const actualIds = observation.entries.map(entry => entry.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    return { status: 'FAIL', reason: `step coverage mismatch: ${actualIds.join(', ')}` };
  }
  const documents = new Map();
  for (const entry of transcript) {
    if (entry.op !== 'open') continue;
    const document = entry.params?.textDocument;
    if (!document?.uri || !document.languageId) {
      return { status: 'FAIL', reason: `${entry.id}: the recorded client open is incomplete` };
    }
    if (documents.has(entry.file)) return { status: 'FAIL', reason: `${entry.file}: opened twice` };
    const expected = expectations.documents.find(item => item.file === entry.file);
    if (!expected || expected.languageId !== document.languageId) {
      return { status: 'FAIL', reason: `${entry.file}: opened as ${document.languageId}` };
    }
    documents.set(entry.file, fsPath(document.uri));
  }
  const declared = observation.documents ?? [];
  if (declared.length !== documents.size
    || declared.some(document => !documents.has(document.file)
      || !samePath(documents.get(document.file), fsPath(document.uri), context.platform))) {
    return { status: 'FAIL', reason: 'declared documents disagree with the recorded client opens' };
  }
  if (documents.size !== expectations.documents.length) {
    return { status: 'FAIL', reason: `opened ${documents.size} documents, expected ${expectations.documents.length}` };
  }
  const versions = checkVersions(transcript, expectations);
  if (versions) return { status: 'FAIL', reason: versions };
  for (const step of expectations.steps) {
    const entry = answered.get(step.id);
    if (!entry) return { status: 'FAIL', reason: `${step.id}: no recorded protocol exchange` };
    const text = checkFixtureText(entry, step, expectations);
    if (text) return { status: 'FAIL', reason: text };
    const failure = checkStep(entry, step, { ...context, documents });
    if (failure) return { status: 'FAIL', reason: failure };
  }
  const tsdk = initialize.params?.initializationOptions?.typescript?.tsdk;
  if (tsdk !== context.identity.tsdk || tsdk !== observation.identity?.tsdk) {
    return { status: 'FAIL', reason: 'language server was not given the checkout tsdk' };
  }
  return { status: 'PASS', reason: 'stdio LSP semantics and native compiler identity verified without an editor' };
}

async function readEvidence(directory, name, expected) {
  if (typeof name !== 'string' || !name) return { error: 'evidence reference is missing' };
  if (!/^[a-f0-9]{64}$/.test(expected ?? '')) return { error: `evidence reference for ${name} carries no hash` };
  let file;
  try {
    file = insideRunDirectory(directory, name);
  } catch (error) {
    return { error: `evidence reference ${name} leaves the run directory` };
  }
  if (!fs.existsSync(file)) return { error: `missing evidence file ${name}` };
  const bytes = fs.readFileSync(file);
  if ((await hashFile(file)) !== expected) return { error: `evidence file ${name} changed` };
  return { file, text: () => bytes.toString('utf8'), json: () => JSON.parse(bytes.toString('utf8')) };
}

export async function validate(evidence, { contract, expectations, root, directory, gate }) {
  if (evidence.gateId !== gate.id) return { status: 'FAIL', reason: 'Observation belongs to another gate' };
  const transcript = await readEvidence(directory, evidence.transcript?.file, evidence.transcript?.sha256);
  if (transcript.error) return { status: 'FAIL', reason: transcript.error };
  const trace = await readEvidence(directory, evidence.rpcTrace?.file, evidence.rpcTrace?.sha256);
  if (trace.error) return { status: 'FAIL', reason: trace.error };
  const stderr = await readEvidence(directory, evidence.stderr?.file, evidence.stderr?.sha256);
  if (stderr.error) return { status: 'FAIL', reason: stderr.error };
  const repository = path.join(root, contract.repositories.gts.path);
  const serverEntry = path.join(repository, expectations.server.entry);
  if (!fs.existsSync(path.join(repository, 'package.json')) || !fs.existsSync(serverEntry)) {
    return { status: 'BLOCKED', reason: 'GTS checkout or language-server entry point unavailable' };
  }
  let identity;
  try {
    const require = createRequire(path.join(repository, 'package.json'));
    const packagePath = require.resolve('typescript/package.json');
    const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const entryPath = require.resolve('typescript/lib/typescript.js');
    const addonPath = require.resolve(evidence.identity.nativeAddon.relativePath);
    const addonPackagePath = require.resolve(
      `@typescript-native-bridge/${process.platform}-${process.arch}/package.json`,
    );
    const compiler = await import(pathToFileURL(entryPath).href);
    identity = {
      resolvedTypescript: {
        name: manifest.name, version: manifest.version, packagePath,
        entryPath, entrySha256: await hashFile(entryPath),
      },
      tsdk: path.dirname(entryPath),
      nativeAddon: {
        path: addonPath, sha256: await hashFile(addonPath), bytes: fs.statSync(addonPath).size,
      },
      nativePackage: JSON.parse(fs.readFileSync(addonPackagePath, 'utf8')),
      tsgoBuildInfoVersion: (compiler.default ?? compiler).tnbGetTsgoBuildInfoVersion?.() ?? null,
    };
  } catch (error) {
    return { status: 'BLOCKED', reason: `Cannot resolve the pinned native engine: ${error.message}` };
  }
  const lines = trace.text().split(/\r?\n/).filter(Boolean);
  const context = {
    platform: evidence.platform,
    arch: evidence.arch,
    repository,
    runDirectory: directory,
    identity,
    entrySha256: await hashFile(serverEntry),
    stderr: stderr.text(),
    trace: {
      lines,
      bridgeLoad: lines.filter(line => line.includes('BRIDGE_LOAD')),
      enter: lines.filter(line => line.includes(' ENTER ')).length,
      exit: lines.filter(line => line.includes(' EXIT ')).length,
      methods: [...new Set(lines.filter(line => line.includes(' ENTER '))
        .map(line => line.trim().split(/\s+/).at(-1)))].sort(),
    },
  };
  return evaluate({ observation: evidence, transcript: transcript.json(), expectations, context });
}
