import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { realpathSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { deriveTrace } from './web-observations.mjs';
import { readNativeRuns } from './web-evidence.mjs';
import { webCacheEntries } from './web-validator.mjs';
import { prepareVitestResultCaches, restoreVitestResultCaches } from '../shared/vitest-result-cache.mjs';
import { executeWithCacheRecovery } from '../shared/command-supervisor.mjs';

const root = process.env.HARNESS_ROOT;
const directory = process.env.HARNESS_RUN_DIRECTORY;
const output = process.env.HARNESS_OUTPUT;
const envelope = { runNonce: process.env.HARNESS_NONCE, gateId: process.env.HARNESS_GATE,
  controlDigest: process.env.HARNESS_SEAL, sourceDigest: process.env.HARNESS_SOURCE_DIGEST,
  platform: process.platform };
async function collect() {
let observation = { ...envelope };
try {
  for (const name of ['HARNESS_ROOT', 'HARNESS_RUN_DIRECTORY', 'HARNESS_OUTPUT', 'HARNESS_NONCE', 'HARNESS_NODE']) {
    if (!process.env[name]) throw new Error('Missing '+name);
  }
  const { execute, hashFile, processVerdict } = await import(pathToFileURL(path.join(root,'harness/core.mjs')).href);
  const contract = JSON.parse(await readFile(path.join(root, 'harness/contract.json'), 'utf8'));
  const gate = contract.gates.find(gate=>gate.id==='web');
  if(envelope.gateId!=='web'||!gate)throw new Error('Unexpected web gate');
  const packageRoot = path.join(root, contract.repositories.main.path, 'packages/custom-data-loader');
  const require = createRequire(path.join(packageRoot, 'package.json'));
  const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const sdk = path.dirname(realpathSync(require.resolve('typescript')));
  const scenario = fileURLToPath(new URL('./web-scenario.mjs', import.meta.url));
  const preload = fileURLToPath(new URL('./web-native-preload.cjs', import.meta.url));
  const expectations = JSON.parse(await readFile(new URL('./web-expectations.json', import.meta.url), 'utf8'));
  await mkdir(directory, { recursive: true });
  const report = path.join(directory, 'web-vitest.json');
  const args = [vitest, 'run', '--config', 'vite.browser.config.ts', '--reporter=default', '--reporter=json', '--outputFile='+report];
  const cacheDirectory = path.join(directory, 'test-result-cache');
  await mkdir(cacheDirectory);
  prepareVitestResultCaches(cacheDirectory, await webCacheEntries(root, contract));
  let command;
  try {
  command = await execute({ executable: realpathSync(process.env.HARNESS_NODE), args, cwd: packageRoot,
    directory, label:'web-vitest',timeoutMs:gate.timeoutMs,limitBytes:contract.policy.reportLimitBytes,
    env:{ GTS_TSDK: sdk, GTS_BROWSER_ARTIFACTS: directory, GTS_BROWSER_NATIVE_DIRECTORY: directory,
      GTS_BROWSER_SESSION_SCENARIO: scenario, TSGO_PROFILE: '1',
      NODE_OPTIONS: ((process.env.NODE_OPTIONS??'')+' --require='+JSON.stringify(preload)).trim() } });
  } finally {
    restoreVitestResultCaches(cacheDirectory);
  }
  for(const stream of ['stdout','stderr'])command[stream].sha256=await hashFile(path.join(directory,command[stream].file));
  const run = { runNonce: envelope.runNonce, executable: command.executable, args:command.args,cwd:command.cwd,
    startedAtMs:Date.parse(command.startedAt),completedAtMs:Date.now(),sdk,scenario,preload,
    stdout:command.stdout.file,stderr:command.stderr.file,exitCode:command.exitCode,signal:command.signal,command };
  await writeFile(path.join(directory, 'web-run.json'), JSON.stringify(run, null, 2));
  observation.run = 'web-run.json';
  if (processVerdict(command)!=='PASS') throw new Error('Real Vitest failed: '+JSON.stringify({code:command.exitCode,signal:command.signal,reason:command.reason,fatal:command.fatal}));
  const result = JSON.parse(await readFile(report, 'utf8'));
  observation.executedTests = result.numTotalTests;
  observation.failedTests = result.numFailedTests;
  observation.skippedTests = result.numPendingTests + result.numTodoTests;
  const raw = JSON.parse(await readFile(path.join(directory, 'web-session-events.json'), 'utf8'));
  const { trace, bindings } = deriveTrace(raw, await readNativeRuns(directory), expectations);
  Object.assign(observation, { trace, bindings, raw: 'web-session-events.json', report: 'web-vitest.json' });
} catch (error) {
  observation.error = error.stack ?? String(error);
  process.stderr.write(observation.error+'\n');
  process.exitCode = 1;
} finally {
  if (output) await writeFile(output, JSON.stringify(observation, null, 2));
}
}

async function collectChild() {
  if (process.argv.length !== 4 || process.argv[2] !== '--collector-child' || process.argv[3] !== envelope.runNonce) {
    throw new Error('Web collector child invocation differs from the fixed supervisor command');
  }
  const lifetime = { runNonce: envelope.runNonce, gateId: envelope.gateId, pid: process.pid, parentPid: process.ppid,
    executable: realpathSync(process.execPath), args: process.argv.slice(1), cwd: realpathSync(process.cwd()), startedAt: new Date().toISOString() };
  try { await collect(); }
  finally {
    writeFileSync(path.join(directory, 'web-child-lifetime.json'), JSON.stringify({ ...lifetime, finishedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', flush: true });
  }
}

async function supervise() {
  if (process.argv.length !== 2) throw new Error('Unexpected web supervisor arguments');
  const core = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
  const contract = core.readJson(path.join(root, 'harness/contract.json'));
  const gate = contract.gates.find(gate => gate.id === 'web');
  if (envelope.gateId !== 'web' || !gate) throw new Error('Unexpected web gate');
  const packageRoot = path.join(root, contract.repositories.main.path, 'packages/custom-data-loader');
  const childOutput = path.join(directory, 'web-child-observation.json');
  const supervisor = await executeWithCacheRecovery({ execute: core.execute, gateTimeoutMs: gate.timeoutMs,
    cacheDirectory: path.join(directory, 'test-result-cache'), executable: process.env.HARNESS_NODE,
    args: [fileURLToPath(import.meta.url), '--collector-child', envelope.runNonce], cwd: packageRoot,
    directory, label: 'web-collector', limitBytes: contract.policy.reportLimitBytes,
    env: { HARNESS_OUTPUT: childOutput, HARNESS_NONCE: envelope.runNonce, HARNESS_GATE: gate.id } });
  for (const stream of ['stdout', 'stderr']) supervisor.command[stream].sha256 = await core.hashFile(path.join(directory, supervisor.command[stream].file));
  for (const [key, file] of [['childObservation', 'web-child-observation.json'], ['childLifetime', 'web-child-lifetime.json']]) {
    if (existsSync(path.join(directory, file))) supervisor[key] = { file, sha256: await core.hashFile(path.join(directory, file)) };
  }
  const child = supervisor.childObservation ? core.readJson(childOutput) : { ...envelope, error: 'Web collector child did not produce a complete observation' };
  core.writeJson(output, { ...child, supervisor });
  if (supervisor.recoveryError) console.error(supervisor.recoveryError);
  process.exitCode = core.processVerdict(supervisor.command) === 'PASS' && !supervisor.recoveryError
    && supervisor.childObservation && supervisor.childLifetime ? 0 : 1;
}

if (process.argv[2] === '--collector-child') await collectChild();
else await supervise();

