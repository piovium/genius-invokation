import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Module, { createRequire, registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, threadId } from 'node:worker_threads';

const e = process.env;
const readDisk = fs.readFileSync.bind(fs);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const artifact = file => ({ path: fs.realpathSync.native(file), sha256: digest(readDisk(file)) });

// This same sealed file is a passive Node preload in the original command tree.
// No reporter, compiler arguments, program inputs, or return values are changed.
function observe() {
  const directory = e.HARNESS_COMMAND_OBSERVATIONS;
  const instanceId = crypto.randomUUID();
  const stem = process.pid + '-' + threadId + '-' + instanceId;
  const file = path.join(directory, stem + '.jsonl');
  const event = detail => fs.appendFileSync(file, JSON.stringify({ at: Date.now(), pid: process.pid,
    threadId, instanceId, runNonce: e.HARNESS_NONCE, gateId: e.HARNESS_GATE, ...detail }) + '\n');
  event({ kind: 'start', parentPid: process.ppid, isMainThread, executable: artifact(process.execPath),
    preload: artifact(fileURLToPath(import.meta.url)), argv: process.argv, execArgv: process.execArgv,
    cwd: process.cwd(), entry: process.argv[1] && fs.existsSync(process.argv[1]) ? artifact(process.argv[1]) : null,
    lifecycle: e.npm_lifecycle_event, script: e.npm_lifecycle_script,
    packageName: e.npm_package_name, packageJson: e.npm_package_json });
  for (const [name, stream] of [['stdout', process.stdout], ['stderr', process.stderr]]) {
    const write = stream.write;
    stream.write = function(chunk, encoding) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      event({ kind: name, base64: bytes.toString('base64') });
      return write.apply(this, arguments);
    };
  }
  const noted = new Set();
  function note(file, kind = 'module', extra = {}) {
    if (noted.has(kind + ':' + file)) return;
    noted.add(kind + ':' + file);
    event({ kind, module: artifact(file), ...extra });
  }
  registerHooks({ load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url.startsWith('file:')) {
      const file = fileURLToPath(url);
      if (/[\\/]vitest[\\/]vitest\.mjs$/.test(file)) note(file, 'vitest');
      if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(file)) note(file, 'entry');
    }
    return result;
  } });
  const compile = Module.prototype._compile;
  Module.prototype._compile = function(content, filename) {
    if (/(?:^|[\\/])lib[\\/](?:typescript|_?tsc)\.js$/.test(filename)) {
      note(filename, 'compiler', { compiledSha256: digest(content) });
    }
    return compile.apply(this, arguments);
  };
  const load = Module._load;
  Module._load = function(request, parent, main) {
    const value = load.apply(this, arguments);
    if (/bridge\.node$/.test(request)) note(Module._resolveFilename(request, parent, main), 'native', { parent: artifact(parent.filename) });
    if (main && process.argv[1]) note(Module._resolveFilename(request, parent, main), 'entry');
    return value;
  };
  // Reuse TNB's existing RPC trace only for the actual Vitest tsc child.
  // Its original -p config, --noEmit, and incremental options remain verbatim.
  if (isMainThread && /[\\/]typescript(?:-native-bridge)?[\\/]bin[\\/]tsc$|[\\/]lib[\\/]_?tsc\.js$/.test(process.argv[1] ?? '')) {
    e.TNB_TRACE_RPC = '1';
    e.TNB_TRACE_RPC_FILE = path.join(directory, stem + '.rpc.log');
    event({ kind: 'rpcTrace', file: path.basename(e.TNB_TRACE_RPC_FILE) });
  }
  process.on('exit', code => event({ kind: 'exit', code }));
}

export function consumerSource(packages, repo) {
  const lines = ['// Additional public declaration consumer; original build/check commands remain unchanged.',
    'type Assert<T extends true> = T;', 'type NotAny<T> = 0 extends (1 & T) ? false : true;'];
  let index = 0;
  for (const item of packages) for (const entry of item.declarations ?? []) {
    const specifier = path.resolve(repo, item.path, entry.file).replaceAll('\\', '/');
    lines.push('import type * as Entry' + index + ' from ' + JSON.stringify(specifier) + ';');
    for (const [name, kind] of Object.entries(entry.exports)) {
      const expr = kind === 'type' ? 'Entry' + index + '.' + name : 'typeof Entry' + index + '.' + name;
      lines.push('type Verify' + index + '_' + name.replace(/\W/g, '_') + ' = Assert<NotAny<' + expr + '>>;');
    }
    lines.push('// @ts-expect-error This invented public name must remain an error.',
      'type Missing' + index + ' = Entry' + index + '.__harness_nonexistent_public_export__;');
    index++;
  }
  return lines.join('\n') + '\n';
}

export const consumerConfig = { compilerOptions: { strict: true, noEmit: true, target: 'ESNext', module: 'Preserve',
  moduleResolution: 'Bundler', jsx: 'Preserve', allowImportingTsExtensions: true, types: [] }, files: ['./public-consumer.ts'] };

async function consume() {
  e.TSGO_PROFILE = '1';
  const repo = e.HARNESS_COMMAND_REPO;
  const require = createRequire(path.join(repo, 'package.json'));
  const compilerFile = require.resolve('typescript');
  const ts = require(compilerFile);
  const filename = path.join(e.HARNESS_RUN_DIRECTORY, 'public-consumer.ts');
  const configFile = path.join(e.HARNESS_RUN_DIRECTORY, 'public-consumer.tsconfig.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic(d) {
    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  } });
  const options = parsed.options;
  const before = ts.getTsgoProfileStats?.().rpcCount ?? 0;
  const program = ts.createProgram(parsed.fileNames, options);
  const source = program.getSourceFile(filename);
  // This additional consumer checks only its own uses; full project checking is
  // still performed by the unchanged build and existing check/test commands.
  const diagnostics = [...parsed.errors, ...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source)].map(d => ({ code: d.code, file: d.file?.fileName,
      start: d.start, length: d.length, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') }));
  const manifestPath = path.join(path.dirname(compilerFile), '..', 'package.json');
  const manifest = JSON.parse(readDisk(manifestPath));
  const native = Object.values(require.cache).filter(m => /bridge\.node$/.test(m.filename)).map(m => artifact(m.filename));
  const rpcDelta = (ts.getTsgoProfileStats?.().rpcCount ?? 0) - before;
  process.stdout.write(JSON.stringify({ source: artifact(filename), config: artifact(configFile), compiler: artifact(compilerFile),
    manifest: { ...artifact(manifestPath), name: manifest.name, version: manifest.version }, native,
    rpcDelta, options, diagnostics }) + '\n');
  process.exitCode = diagnostics.length || rpcDelta < 1 || native.length < 1 ? 1 : 0;
}

async function collect() {
  const { execute, readJson, writeJson, hashFile, processVerdict } = await import(pathToFileURL(path.join(e.HARNESS_ROOT, 'harness/core.mjs')).href);
  const { packageInventory, outputInventory, testCacheEntries } = await import(new URL('./command-validator.mjs', import.meta.url));
  const contract = readJson(path.join(e.HARNESS_ROOT, 'harness/contract.json'));
  const expectations = readJson(new URL('./command-expectations.json', import.meta.url));
  const gate = contract.gates.find(gate => gate.id === e.HARNESS_GATE);
  if (!['gts-build', 'gts-tests', 'main-build', 'main-tests'].includes(gate?.id)) throw new Error('Unreviewed command gate');
  const repo = path.join(e.HARNESS_ROOT, contract.repositories[gate.repository].path);
  const packages = await packageInventory(e.HARNESS_ROOT, repo, contract.repositories[gate.repository], gate, expectations);
  const beforeOutputs = gate.id.endsWith('build') ? outputInventory(repo, packages, true) : [];
  const observations = path.join(e.HARNESS_RUN_DIRECTORY, 'command-observations');
  fs.mkdirSync(observations);
  const cacheDirectory = path.join(e.HARNESS_RUN_DIRECTORY, 'test-result-cache');
  const resultCaches = gate.id.endsWith('tests') ? await import(new URL('../shared/vitest-result-cache.mjs', import.meta.url)) : null;
  if (resultCaches) {
    fs.mkdirSync(cacheDirectory);
    resultCaches.prepareVitestResultCaches(cacheDirectory, testCacheEntries(repo, packages));
  }
  let command;
  try {
    command = await execute({ executable: e.HARNESS_NODE, args: [e.HARNESS_MANAGER, ...gate.args],
    cwd: repo, directory: e.HARNESS_RUN_DIRECTORY, label: gate.id + '-execution', timeoutMs: gate.timeoutMs,
    limitBytes: contract.policy.reportLimitBytes, env: { HARNESS_COMMAND_OBSERVATIONS: observations,
      NODE_OPTIONS: ((e.NODE_OPTIONS ?? '') + ' --import=' + import.meta.url).trim() } });
  } finally {
    resultCaches?.restoreVitestResultCaches(cacheDirectory);
  }
  async function hashLogs(command) {
    for (const stream of ['stdout', 'stderr']) command[stream].sha256 = await hashFile(path.join(e.HARNESS_RUN_DIRECTORY, command[stream].file));
  }
  await hashLogs(command);
  const afterOutputs = gate.id.endsWith('build') ? outputInventory(repo, packages, true) : [];
  let consumer;
  if (gate.id.endsWith('build') && processVerdict(command) === 'PASS') {
    fs.writeFileSync(path.join(e.HARNESS_RUN_DIRECTORY, 'public-consumer.ts'), consumerSource(packages, repo), { flag: 'wx' });
    fs.writeFileSync(path.join(e.HARNESS_RUN_DIRECTORY, 'public-consumer.tsconfig.json'), JSON.stringify(consumerConfig, null, 2) + '\n', { flag: 'wx' });
    consumer = await execute({ executable: e.HARNESS_NODE, args: [fileURLToPath(import.meta.url)], cwd: repo,
      directory: e.HARNESS_RUN_DIRECTORY, label: 'public-consumer', timeoutMs: Math.min(gate.timeoutMs, 300000),
      limitBytes: contract.policy.reportLimitBytes,
      env: { HARNESS_COMMAND_CONSUMER: '1', HARNESS_COMMAND_REPO: repo } });
    await hashLogs(consumer);
  }
  const files = fs.readdirSync(observations).sort().map(file => ({ file: 'command-observations/' + file,
    sha256: digest(readDisk(path.join(observations, file))) }));
  writeJson(e.HARNESS_OUTPUT, { runNonce: e.HARNESS_NONCE, gateId: gate.id, controlDigest: e.HARNESS_SEAL,
    sourceDigest: e.HARNESS_SOURCE_DIGEST, platform: process.platform, command, packages, beforeOutputs, afterOutputs,
    observations: files, consumer });
  process.exitCode = processVerdict(command) === 'PASS' && (!consumer || processVerdict(consumer) === 'PASS') ? 0 : 1;
}

async function collectChild() {
  if (process.argv.length !== 4 || process.argv[2] !== '--collector-child' || process.argv[3] !== e.HARNESS_NONCE) {
    throw new Error('Collector child invocation differs from the fixed supervisor command');
  }
  const lifetime = { runNonce: e.HARNESS_NONCE, gateId: e.HARNESS_GATE, pid: process.pid, parentPid: process.ppid,
    executable: fs.realpathSync.native(process.execPath), args: process.argv.slice(1),
    cwd: fs.realpathSync.native(process.cwd()), startedAt: new Date().toISOString() };
  try { await collect(); }
  finally {
    fs.writeFileSync(path.join(e.HARNESS_RUN_DIRECTORY, 'command-child-lifetime.json'),
      JSON.stringify({ ...lifetime, finishedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', flush: true });
  }
}

async function supervise() {
  if (process.argv.length !== 2) throw new Error('Unexpected collector supervisor arguments');
  const core = await import(pathToFileURL(path.join(e.HARNESS_ROOT, 'harness/core.mjs')).href);
  const { executeWithCacheRecovery } = await import(new URL('../shared/command-supervisor.mjs', import.meta.url));
  const contract = core.readJson(path.join(e.HARNESS_ROOT, 'harness/contract.json'));
  const gate = contract.gates.find(gate => gate.id === e.HARNESS_GATE);
  if (!['gts-build', 'gts-tests', 'main-build', 'main-tests'].includes(gate?.id)) throw new Error('Unreviewed command gate');
  const repo = path.join(e.HARNESS_ROOT, contract.repositories[gate.repository].path);
  const childOutput = path.join(e.HARNESS_RUN_DIRECTORY, 'command-child-observation.json');
  const supervisor = await executeWithCacheRecovery({ execute: core.execute, gateTimeoutMs: gate.timeoutMs,
    cacheDirectory: path.join(e.HARNESS_RUN_DIRECTORY, 'test-result-cache'), executable: e.HARNESS_NODE,
    args: [fileURLToPath(import.meta.url), '--collector-child', e.HARNESS_NONCE], cwd: repo,
    directory: e.HARNESS_RUN_DIRECTORY, label: gate.id + '-collector', limitBytes: contract.policy.reportLimitBytes,
    env: { HARNESS_OUTPUT: childOutput, HARNESS_NONCE: e.HARNESS_NONCE, HARNESS_GATE: gate.id } });
  for (const stream of ['stdout', 'stderr']) {
    supervisor.command[stream].sha256 = await core.hashFile(path.join(e.HARNESS_RUN_DIRECTORY, supervisor.command[stream].file));
  }
  for (const [key, file] of [['childObservation', 'command-child-observation.json'], ['childLifetime', 'command-child-lifetime.json']]) {
    const location = path.join(e.HARNESS_RUN_DIRECTORY, file);
    if (fs.existsSync(location)) supervisor[key] = { file, sha256: await core.hashFile(location) };
  }
  const child = supervisor.childObservation ? core.readJson(childOutput) : {
    runNonce: e.HARNESS_NONCE, gateId: gate.id, controlDigest: e.HARNESS_SEAL,
    sourceDigest: e.HARNESS_SOURCE_DIGEST, platform: process.platform,
    error: 'Collector child did not produce a complete observation' };
  core.writeJson(e.HARNESS_OUTPUT, { ...child, supervisor });
  if (supervisor.recoveryError) console.error(supervisor.recoveryError);
  process.exitCode = core.processVerdict(supervisor.command) === 'PASS' && !supervisor.recoveryError
    && supervisor.childObservation && supervisor.childLifetime ? 0 : 1;
}

if (e.HARNESS_COMMAND_OBSERVATIONS) observe();
else if (e.HARNESS_COMMAND_CONSUMER === '1') await consume();
else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--collector-child') await collectChild();
  else await supervise();
}

