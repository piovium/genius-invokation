import assert from 'node:assert/strict';
import { readFile, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveTrace, testNames } from './web-observations.mjs';
import { readNativeRuns } from './web-evidence.mjs';
import { packageInventory, testCacheEntries } from '../command/command-validator.mjs';
import { validateVitestResultCacheEvidence } from '../shared/vitest-result-cache.mjs';
import { recoveryReserveMs } from '../shared/command-supervisor.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const fatal = /\bpanic:|heap out of memory|fatal error|allocation failed|Unhandled Rejection/i;

export async function webCacheEntries(root, contract) {
  const repo = path.join(root, contract.repositories.main.path);
  const gate = contract.gates.find(gate => gate.id === 'main-tests');
  assert.ok(gate && gate.repository === 'main', 'Original main test inventory is missing');
  const expectations = await readJson(new URL('../command/command-expectations.json', import.meta.url));
  const packages = (await packageInventory(root, repo, contract.repositories.main, gate, expectations))
    .filter(pkg => pkg.path === 'packages/custom-data-loader');
  assert.equal(packages.length, 1, 'Known custom-loader test package is missing');
  return testCacheEntries(repo, packages);
}

export async function validateWebSupervisor(observation, run, { directory, gate, nonce, packageRoot, node, processVerdict, platform = process.platform }) {
  const supervisor = observation.supervisor;
  const timeoutMs = gate.timeoutMs - recoveryReserveMs;
  assert.equal(supervisor?.timeoutMs, timeoutMs);
  assert.equal(supervisor.recoveryError, null);
  const command = supervisor.command;
  const collector = fileURLToPath(new URL('./web-collector.mjs', import.meta.url));
  const args = [collector, '--collector-child', nonce];
  assert.equal(command.executable, node);
  assert.equal(command.cwd, packageRoot);
  assert.deepEqual(command.args, args);
  assert.equal(processVerdict(command), 'PASS');
  assert.ok(Number.isSafeInteger(command.durationMs) && command.durationMs > 0 && command.durationMs <= timeoutMs);
  for (const stream of ['stdout', 'stderr']) {
    assert.equal(command[stream].file, `web-collector.${stream}.log`);
    const file = path.join(directory, command[stream].file);
    assert.ok(!(await lstat(file)).isSymbolicLink());
    const bytes = await readFile(file);
    assert.equal(command[stream].sha256, hash(bytes));
    assert.ok(!fatal.test(bytes.toString('utf8')));
  }
  for (const [key, file] of [['childObservation', 'web-child-observation.json'], ['childLifetime', 'web-child-lifetime.json']]) {
    assert.equal(supervisor[key]?.file, file);
    assert.ok(!(await lstat(path.join(directory, file))).isSymbolicLink());
    assert.equal(supervisor[key].sha256, hash(await readFile(path.join(directory, file))));
  }
  const childObservation = await readJson(path.join(directory, supervisor.childObservation.file));
  const { supervisor: omitted, ...outer } = observation;
  assert.deepEqual(childObservation, outer);
  const lifetime = await readJson(path.join(directory, supervisor.childLifetime.file));
  assert.equal(lifetime.runNonce, nonce); assert.equal(lifetime.gateId, gate.id);
  assert.equal(lifetime.executable, node); assert.equal(lifetime.cwd, packageRoot);
  assert.deepEqual(lifetime.args, args);
  for (const value of [lifetime.pid, lifetime.parentPid]) assert.ok(Number.isSafeInteger(value) && value > 0);
  const supervisorStart = Date.parse(supervisor.startedAt), supervisorEnd = Date.parse(supervisor.finishedAt);
  const commandStart = Date.parse(command.startedAt), commandEnd = commandStart + command.durationMs;
  const childStart = Date.parse(lifetime.startedAt), childEnd = Date.parse(lifetime.finishedAt);
  assert.ok([supervisorStart, supervisorEnd, commandStart, childStart, childEnd].every(Number.isFinite));
  assert.ok(supervisorStart <= commandStart && commandStart <= childStart && childStart <= childEnd
    && childEnd <= commandEnd + 100 && commandEnd <= supervisorEnd + 100 && supervisorEnd - supervisorStart <= gate.timeoutMs);
  assert.ok(Date.parse(run.command.startedAt) >= childStart && Date.parse(run.command.startedAt) + run.command.durationMs <= childEnd + 100);
  if (platform === 'win32') {
    const invocation = await readJson(path.join(directory, 'web-collector.invocation.json'));
    assert.equal(invocation.executable, node); assert.equal(await realpath(invocation.cwd), packageRoot);
    assert.deepEqual(invocation.args, args);
  }
}

export async function validate(observation, { contract, expectations, nonce, root, directory, gate }) {
  try {
    const { processVerdict } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
    assert.equal(observation.runNonce, nonce);
    assert.equal(observation.gateId, gate.id);
    assert.equal(observation.platform, process.platform);
    assert.equal(observation.error, undefined);
    const evidence = async file => {
      assert.equal(path.basename(file), file, 'Evidence must be a direct child of the bound run directory');
      assert.ok(file.startsWith('web-') || ['browser-events.json', 'browser.png'].includes(file));
      const target = path.join(directory, file);
      assert.ok(!(await lstat(target)).isSymbolicLink(), 'Evidence symlinks are forbidden');
      return target;
    };
    assert.equal(observation.run, 'web-run.json');
    assert.equal(observation.raw, 'web-session-events.json');
    assert.equal(observation.report, 'web-vitest.json');
    const run = await readJson(await evidence(observation.run));
    const report = await readJson(await evidence(observation.report));
    const raw = await readJson(await evidence(observation.raw));
    const packageRoot = await realpath(path.join(root, contract.repositories.main.path, 'packages/custom-data-loader'));
    const require = createRequire(path.join(packageRoot, 'package.json'));
    const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
    assert.equal(run.cwd, packageRoot);
    assert.equal(run.runNonce, nonce);
    assert.equal(run.exitCode, 0); assert.equal(run.signal, null);
    assert.ok(run.startedAtMs < run.completedAtMs);
    let local = {};
    try { local = await readJson(path.join(root, 'harness/local.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const configuredNode = local.node ? path.resolve(root, local.node) : process.execPath;
    assert.equal(run.executable, await realpath(configuredNode));
    assert.deepEqual(run.args, [vitest, 'run', '--config', 'vite.browser.config.ts', '--reporter=default', '--reporter=json', `--outputFile=${path.join(directory, 'web-vitest.json')}`]);
    assert.equal(processVerdict(run.command), 'PASS');
    assert.equal(run.command.executable, run.executable);
    assert.equal(run.command.cwd, run.cwd);
    assert.deepEqual(run.command.args, run.args);
    assert.equal(run.command.exitCode, run.exitCode); assert.equal(run.command.signal, run.signal);
    assert.equal(Date.parse(run.command.startedAt), run.startedAtMs);
    assert.ok(Number.isSafeInteger(run.command.durationMs) && run.command.durationMs > 0 && run.command.durationMs <= gate.timeoutMs);
    for (const stream of ['stdout', 'stderr']) {
      assert.equal(run[stream], `web-vitest.${stream}.log`);
      assert.equal(run.command[stream].file, run[stream]);
      assert.equal(run.command[stream].sha256, hash(await readFile(await evidence(run[stream]))));
    }
    await validateWebSupervisor(observation, run, { directory, gate, nonce, packageRoot, node: await realpath(configuredNode), processVerdict });
    validateVitestResultCacheEvidence(path.join(directory, 'test-result-cache'), await webCacheEntries(root, contract));
    assert.equal(run.scenario, fileURLToPath(new URL('./web-scenario.mjs', import.meta.url)));
    assert.equal(run.preload, fileURLToPath(new URL('./web-native-preload.cjs', import.meta.url)));
    assert.equal(report.success, true);
    assert.equal(report.numTotalTests, 3); assert.equal(report.numPassedTests, 3);
    for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests']) assert.equal(report[key] ?? 0, 0);
    const tests = report.testResults.flatMap(file => file.assertionResults);
    assert.deepEqual(tests.map(test => test.title).sort(), [...testNames].sort());
    for (const test of tests) { assert.equal(test.status, 'passed'); assert.deepEqual(test.failureMessages, []); }
    assert.equal(observation.executedTests, tests.length);
    assert.equal(observation.failedTests, 0); assert.equal(observation.skippedTests, 0);
    for (const file of [run.stdout, run.stderr]) assert.ok(!fatal.test(await readFile(await evidence(file), 'utf8')), 'Native failure in real test log');
    assert.equal(raw.runNonce, nonce); assert.equal(raw.platform, observation.platform);
    assert.match(raw.browserVersion, /Chrome\//);
    assert.ok(raw.startedAtMs >= run.startedAtMs && raw.completedAtMs <= run.completedAtMs);
    const browser = await readJson(await evidence('browser-events.json'));
    assert.ok(browser.length > 0);
    assert.deepEqual(browser.filter(event => event.kind === 'pageerror'), []);
    assert.deepEqual(browser.filter(event => event.kind === 'card-loaded').map(event => event.detail.route), ['browser-local', 'backend-tnb']);
    const lastReady = browser.findLastIndex(event => event.kind === 'ready' && event.detail.route === 'backend-tnb-reloaded');
    assert.ok(lastReady >= 0, 'Real reload/persistence scenario missing');
    for (const worker of raw.workers.filter(worker => worker.sessionId)) for (const script of worker.scripts) {
      const source = await readFile(await evidence(script.file), 'utf8');
      assert.equal(script.sha256, hash(source));
      assert.equal(script.url, 'https://cdn.jsdelivr.net/npm/typescript@6.0.3/lib/typescript.js');
      assert.match(source, /version\s*=\s*["']6\.0\.3["']/);
      assert.ok(worker.sdk.atMs >= worker.attachedAtMs - 100 && worker.sdk.atMs <= raw.completedAtMs);
    }
    const native = await readNativeRuns(directory);
    const derived = deriveTrace(raw, native, expectations);
    assert.deepEqual(observation.trace, derived.trace);
    assert.deepEqual(observation.bindings, derived.bindings);
    const modulePath = await realpath(require.resolve('typescript'));
    const sdkPath = path.dirname(modulePath);
    assert.equal(run.sdk, sdkPath);
    const manifestPath = path.resolve(sdkPath, '../package.json');
    const manifest = await readJson(manifestPath);
    assert.equal(manifest.name, 'typescript-native-bridge'); assert.equal(manifest.version, contract.tnbVersion);
    const nativeName = `@typescript-native-bridge/${process.platform}-${process.arch}`;
    const nativeManifestPath = createRequire(manifestPath).resolve(`${nativeName}/package.json`);
    const nativeManifest = await readJson(nativeManifestPath);
    assert.equal(nativeManifest.name, nativeName); assert.equal(nativeManifest.version, contract.tnbVersion);
    const nativePath = await realpath(path.join(path.dirname(nativeManifestPath), 'native/bridge.node'));
    const preloadHash = hash(await readFile(run.preload));
    for (const binding of derived.bindings) {
      await evidence(binding.file);
      const child = native.find(child => child.file === binding.file);
      for (const row of child.rows) { assert.equal(row.runNonce, nonce); assert.equal(row.pid, child.pid); }
      const process = child.rows[0];
      assert.equal(process.kind, 'process'); assert.ok(process.detail.argv.includes('--stdio'));
      assert.equal(await realpath(process.detail.argv[1]), await realpath(require.resolve('@gi-tcg/gts-language-server/node')));
      assert.equal(process.detail.execPath, run.executable);
      assert.equal(process.detail.preloadSha256, preloadHash);
      assert.equal(process.detail.platform, observation.platform);
      assert.equal(child.identity.modulePath, modulePath);
      assert.equal(child.identity.moduleSha256, hash(await readFile(modulePath)));
      assert.equal(child.identity.manifestSha256, hash(await readFile(manifestPath)));
      assert.equal(child.identity.packageName, manifest.name); assert.equal(child.identity.packageVersion, manifest.version);
      assert.match(child.stderr, /TNB ACTIVE/); assert.ok(!fatal.test(child.stderr));
      assert.ok(child.identity.native.length >= 1);
      for (const addon of child.identity.native) {
        assert.equal(await realpath(addon.path), nativePath);
        assert.equal(addon.sha256, hash(await readFile(addon.path)));
      }
    }
    return { status: 'PASS', reason: 'Three real Chrome tests, both loaded engines, raw versioned sessions, native RPC growth and lifecycle evidence validated' };
  } catch (error) {
    return { status: 'FAIL', reason: error.stack ?? String(error) };
  }
}
