import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { codes, sha, stable, readJson, writeJson, inside, hashFile, verifySeal, git,
  sourcePaths, gitLinks, snapshot, snapshotRepository, acquireLock, execute, processVerdict, requiredGateIds, fatalPattern, evidenceManifest } from './core.mjs';

export const builtInGateKinds = ['environment', 'inventory', 'engine'];

export function validateContract(contract, { root } = {}) {
  if (contract.schemaVersion !== 1 || !['harness-only', 'migration'].includes(contract.phase)) {
    throw new Error('Unsupported contract or phase');
  }
  const ids = new Set();
  for (const gate of contract.gates) {
    if (!/^[a-z0-9-]+$/.test(gate.id) || ids.has(gate.id)) throw new Error('Invalid/duplicate gate');
    ids.add(gate.id);
    if (!contract.repositories[gate.repository] || !Number.isSafeInteger(gate.timeoutMs)
      || gate.timeoutMs < 1) throw new Error(`Invalid gate: ${gate.id}`);
  }
  for (const gate of contract.gates) {
    for (const dependency of gate.requires ?? []) if (!ids.has(dependency)) throw new Error('Unknown dependency');
  }
  const visited = new Set(), active = new Set();
  function visit(id) {
    if (active.has(id)) throw new Error('Cyclic gate dependencies');
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of contract.gates.find(gate => gate.id === id).requires ?? []) visit(dependency);
    active.delete(id); visited.add(id);
  }
  ids.forEach(visit);
  for (const id of Object.keys(contract.adapters ?? {})) if (!ids.has(id)) throw new Error('Unknown adapter gate');
  // A gate is executable only through a built-in implementation or a registered,
  // sealed reviewed adapter. Every other gate must declare why it cannot run
  // inside the sealed contract itself, so a missing collector stays a reviewed,
  // visible gap instead of an implicit omission.
  for (const gate of contract.gates) {
    const wired = builtInGateKinds.includes(gate.kind) || contract.adapters?.[gate.id];
    if (wired && gate.blocked) throw new Error(`Wired gate declares a blocking reason: ${gate.id}`);
    if (!wired && !(typeof gate.blocked === 'string' && gate.blocked.trim())) {
      throw new Error(`Gate has no implementation and no declared blocking reason: ${gate.id}`);
    }
  }
  const gateById = id => contract.gates.find(gate => gate.id === id);
  for (const role of Object.values(contract.roles)) {
    if (!contract.repositories[role.repository] || !role.paths?.length) throw new Error('Invalid role');
    if (role.gates.some(id => !ids.has(id))) throw new Error('Unknown role gate');
    // Acceptance must run where the owned sources live: a gate bound to another
    // checkout reports on code the role cannot change. A cross-repository gate is
    // only accepted when the sealed contract declares it as inherited from the
    // role's reviewed prior assignment, never as an implied permission.
    const inherited = role.inheritedGates ?? [];
    if (inherited.some(id => !role.gates.includes(id))) {
      throw new Error('Inherited gate is outside the role gate list');
    }
    if (role.gates.some(id => gateById(id).repository !== role.repository && !inherited.includes(id))) {
      throw new Error(`Role gate is bound to a different repository: ${role.gates.join(', ')}`);
    }
  }
  for (const transition of contract.scopeTransitions ?? []) {
    if (!/^[a-f0-9]{64}$/.test(transition.previousRecordSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(transition.previousControlDigest ?? '')
      || !transition.previousTaskId || !transition.reason || !transition.review
      || stable(transition.to) !== stable(contract.roles[transition.role])
      || transition.from?.repository !== transition.to?.repository
      || !transition.from.paths.every(file => transition.to.paths.includes(file))
      || !transition.from.gates.every(id => transition.to.gates.includes(id))) {
      throw new Error('Invalid reviewed scope transition');
    }
  }
  // The binding above is only self-consistent. When the bound task record is
  // still present locally, recheck it: artifacts/ is deliberately unsealed, so a
  // fresh checkout cannot perform this check and must not be failed for it.
  if (root) {
    for (const transition of contract.scopeTransitions ?? []) {
      const file = path.join(root, 'artifacts', 'tasks', transition.previousTaskId, 'task.json');
      if (!fs.existsSync(file)) continue;
      const bytes = fs.readFileSync(file);
      const record = JSON.parse(bytes);
      if (sha(bytes) !== transition.previousRecordSha256
        || record.controlDigest !== transition.previousControlDigest
        || record.role !== transition.role
        || stable(record.roleSpec) !== stable(transition.from)) {
        throw new Error('Bound previous task record no longer matches its reviewed scope transition');
      }
    }
  }
}
export async function loadHarness(root) {
  const seal = await verifySeal(root);
  const contract = readJson(inside(root, 'harness/contract.json'));
  validateContract(contract, { root });
  const localFile = inside(root, 'harness/local.json');
  const local = fs.existsSync(localFile) ? readJson(localFile) : {};
  const allowed = ['node', 'pnpmMain', 'pnpmGts', 'npm', 'volar'];
  for (const key of Object.keys(local)) {
    if (!allowed.includes(key) || (local[key] !== null && typeof local[key] !== 'string')) {
      throw new Error(`local.json only accepts known runtime paths: ${key}`);
    }
  }
  const runtimePaths = {};
  for (const key of allowed.filter(key => key !== 'volar')) {
    runtimePaths[key] = local[key] ? path.resolve(root, local[key]) : key === 'node' ? process.execPath : null;
  }
  return { root, seal, contract, runtimePaths };
}
const verdict = (status, reason, extra = {}) => ({ status, reason, ...extra });
const environmentVersions = [['node', '^26.1.0'], ['pnpmMain', '12.0.0'], ['pnpmGts', '11.5.2'], ['npm', null]];
function correctVersion(id, version, expected) {
  return id === 'node' ? /^v26\.(?:[1-9]\d*)\.\d+$/.test(version) : !expected || version === expected;
}
function environmentContext(gate, id) {
  return { ...gate, repository: id === 'pnpmGts' ? 'gts' : id === 'npm' ? 'tnb' : gate.repository };
}
function checkCommand(context, gate, cmd, args, label) {
  if (cmd.executable !== context.runtimePaths.node || stable(cmd.args) !== stable(args)
    || cmd.cwd !== context.before.repositories[gate.repository].path
    || cmd.stdout.file !== `${label}.stdout.log` || cmd.stderr.file !== `${label}.stderr.log`) {
    throw new Error('Executed command does not match approved collector/probe');
  }
}
function safeEnvironment(contract) {
  const forbidden = [...contract.policy.forbidEnvironment, 'NODE_OPTIONS', 'NODE_PATH'];
  const keys = Object.keys(process.env).filter(key => forbidden.some(item => item.toLowerCase() === key.toLowerCase()));
  if (keys.length) throw new Error(`Remove environment overrides before acceptance: ${keys.join(', ')}`);
}
async function command(context, gate, executable, args, label) {
  const runtimeEnv = runtimeEnvironment(context, gate);
  const result = await execute({ executable, args,
    cwd: inside(context.root, context.contract.repositories[gate.repository].path),
    directory: context.directory, label, timeoutMs: gate.timeoutMs,
    limitBytes: context.contract.policy.reportLimitBytes,
    env: { HARNESS_NONCE: context.nonce, HARNESS_GATE: gate.id,
      HARNESS_SEAL: context.seal.digest, HARNESS_SOURCE_DIGEST: sha(stable(context.before)),
      HARNESS_PLATFORM: process.platform,
      HARNESS_RUN_DIRECTORY: context.directory,
      HARNESS_ROOT: context.root, HARNESS_OUTPUT: path.join(context.directory, `${gate.id}.observation.json`),
      ...runtimeEnv },
  });
  for (const stream of ['stdout', 'stderr']) {
    result[stream].sha256 = await hashFile(inside(context.directory, result[stream].file));
  }
  return result;
}
export function runtimeEnvironment(context, gate) {
  const managerId = context.contract.repositories[gate.repository].manager;
  const manager = context.runtimePaths[managerId];
  const directory = path.join(context.directory, `runtime-${managerId ?? 'node'}`);
  fs.mkdirSync(directory, { recursive: true });
  const environment = { HARNESS_NODE: context.runtimePaths.node,
    HARNESS_MANAGER: manager ?? '', HARNESS_NPM: context.runtimePaths.npm ?? '' };
  for (const [name, variable] of [['pnpm', 'HARNESS_MANAGER'], ['npm', 'HARNESS_NPM']]) {
    if (!environment[variable] || name === 'pnpm' && managerId === 'npm') continue;
    // ASCII command files: non-ASCII workspace paths travel through environment
    // variables, not through cmd.exe's legacy code-page decoding of a batch file.
    const file = path.join(directory, name + (process.platform === 'win32' ? '.cmd' : ''));
    const content = process.platform === 'win32'
      ? `@echo off\r\n"%HARNESS_NODE%" "%${variable}%" %*\r\n`
      : `#!/bin/sh\nexec "$HARNESS_NODE" "$${variable}" "$@"\n`;
    if (!fs.existsSync(file)) fs.writeFileSync(file, content, { flag: 'wx', mode: 0o755 });
    else if (fs.readFileSync(file, 'utf8') !== content) throw new Error('Runtime shim changed during run');
  }
  return { ...environment,
    PATH: [directory, path.dirname(context.runtimePaths.node), process.env.PATH ?? process.env.Path ?? ''].join(path.delimiter) };
}
async function environmentGate(context, gate) {
  const commands = [];
  const missing = [];
  for (const [id, expected] of environmentVersions) {
    const runtime = context.runtimePaths[id];
    if (!runtime || !fs.existsSync(runtime)) { missing.push(`${id}: runtime not configured/available`); continue; }
    const toolGate = environmentContext(gate, id);
    if (context.before.repositories[toolGate.repository]?.status !== 'PASS') {
      missing.push(`${id}: associated checkout unavailable`); continue;
    }
    const cmd = await command(context, toolGate, context.runtimePaths.node,
      id === 'node' ? ['--version'] : [runtime, '--version'], `${gate.id}-${id.toLowerCase()}`);
    commands.push(cmd);
    if (processVerdict(cmd) !== 'PASS') return verdict('FAIL', `${id} failed`, { commands });
    const version = fs.readFileSync(inside(context.directory, cmd.stdout.file), 'utf8').trim();
    if (!correctVersion(id, version, expected)) {
      missing.push(`${id}: expected ${expected}, got ${version}`);
    }
  }
  for (const [id, repo] of Object.entries(context.before.repositories)) {
    if (repo.status !== 'PASS') missing.push(`${id}: ${repo.reason}`);
  }
  return verdict(missing.length ? 'BLOCKED' : 'PASS', missing.join('; ') || 'Pinned runtimes and checkouts available', { commands });
}
export function inventoryGate(context) {
  const baseline = readJson(inside(context.root, 'harness/baselines/main.json'));
  const repo = inside(context.root, context.contract.repositories.main.path);
  if (!fs.existsSync(repo)) return verdict('BLOCKED', 'Main checkout missing');
  const files = sourcePaths(repo).filter(file => file.endsWith('.gts') && fs.existsSync(path.join(repo, file)));
  const checks = sourcePaths(repo).filter(file => /^packages\/[^/]+\/package\.json$/.test(file))
    .filter(file => fs.existsSync(path.join(repo, file)))
    .map(file => ({ file, data: readJson(path.join(repo, file)) })).filter(row => row.data.scripts?.check)
    .map(row => ({ path: path.posix.dirname(row.file), name: row.data.name, command: row.data.scripts.check }));
  if (stable(files) !== stable(baseline.files) || stable(checks) !== stable(baseline.checkPackages)) {
    return verdict('FAIL', 'GTS inventory or check package/command set changed; review the exact diff against baseline', { files, checks });
  }
  return verdict('PASS', 'Exact source/check inventory matches; actual program coverage remains a separate gate', { files, checks });
}
function registeredAdapter(context, gate) {
  const adapter = context.contract.adapters?.[gate.id];
  if (!adapter) return null;
  for (const key of ['collector', 'validator', 'expectations']) {
    if (typeof adapter[key] !== 'string' || !adapter[key].startsWith('harness/collectors/')) {
      throw new Error(`Adapter ${gate.id}.${key} must be a reviewed harness/collectors file`);
    }
    const file = inside(context.root, adapter[key]);
    if (!context.seal.files[adapter[key]] || !fs.existsSync(file)) throw new Error(`Unsealed adapter: ${adapter[key]}`);
  }
  return adapter;
}
async function validateObservation(context, gate, adapter, evidence) {
  if (evidence.runNonce !== context.nonce || evidence.gateId !== gate.id
    || evidence.controlDigest !== context.seal.digest || evidence.platform !== process.platform
    || evidence.sourceDigest !== sha(stable(context.before))) {
    return verdict('FAIL', 'Collector provenance does not match this run/gate/source/platform');
  }
  const { validate } = await import(pathToFileURL(inside(context.root, adapter.validator)).href);
  if (typeof validate !== 'function') return verdict('FAIL', 'Approved adapter has no validate function');
  const result = await validate(evidence, {
    contract: context.contract, expectations: readJson(inside(context.root, adapter.expectations)),
    nonce: context.nonce, root: context.root, directory: context.directory, gate,
  });
  if (!result || !['PASS', 'FAIL', 'BLOCKED'].includes(result.status)) return verdict('FAIL', 'Invalid validator result');
  if (result.status !== 'PASS') return result;
  if (gate.kind === 'session') {
    const { validateTrace } = await import(pathToFileURL(inside(context.root, 'harness/probes/session-evidence.mjs')).href);
    const session = validateTrace(evidence.trace, gate.case, {
      rounds: context.contract.policy.desktopEditRounds, nonce: context.nonce,
      tnbVersion: context.contract.tnbVersion,
      expectations: readJson(inside(context.root, adapter.expectations)),
    });
    if (session.status !== 'PASS') return session;
    if (gate.case === 'desktop') {
      const required = context.contract.policy.desktopScenarios;
      if (!required.every(id => evidence.scenarios?.some(scenario => scenario.id === id))) {
        return verdict('BLOCKED', 'Real editor/workspace/scenario evidence is incomplete');
      }
    }
  }
  if (gate.kind === 'coverage') {
    const { compareCoverage } = await import(pathToFileURL(inside(context.root, 'harness/probes/coverage.mjs')).href);
    const repo = inside(context.root, context.contract.repositories.main.path);
    const coverage = compareCoverage({ repo,
      baseline: readJson(inside(context.root, 'harness/baselines/main.json')).files,
      actual: sourcePaths(repo).filter(file => file.endsWith('.gts') && fs.existsSync(path.join(repo, file))),
      observed: evidence.files,
    });
    if (coverage.status !== 'PASS') return coverage;
    if (!context.contract.policy.coverageScenarios.every(id => evidence.scenarios?.some(scenario => scenario.id === id))) {
      return verdict('BLOCKED', 'CLI negative/repair scenarios are incomplete');
    }
  }
  if (result.status === 'PASS' && gate.id.endsWith('tests')
    && !(Number.isSafeInteger(evidence.executedTests) && evidence.executedTests > 0
      && evidence.failedTests === 0 && evidence.skippedTests === 0)) {
    return verdict('FAIL', 'No complete executed test suite (empty/skipped/failed tests)');
  }
  return result;
}
async function adapterGate(context, gate) {
  const adapter = registeredAdapter(context, gate);
  if (!adapter) return verdict('BLOCKED', gate.blocked
    ? `Declared blocking reason: ${gate.blocked}`
    : `No independently reviewed collector/validator registered for ${gate.id}`);
  const cmd = await command(context, gate, context.runtimePaths.node,
    [inside(context.root, adapter.collector)], gate.id);
  const commands = [cmd];
  if (processVerdict(cmd) !== 'PASS') return verdict(processVerdict(cmd), 'Collector process failed', { commands });
  const file = `${gate.id}.observation.json`;
  if (!fs.existsSync(inside(context.directory, file))) return verdict('BLOCKED', 'Collector produced no observation', { commands });
  if (fs.statSync(inside(context.directory, file)).size > context.contract.policy.reportLimitBytes) {
    return verdict('FAIL', 'Observation exceeds evidence limit', { commands });
  }
  const observation = readJson(inside(context.directory, file));
  const result = await validateObservation(context, gate, adapter, observation);
  return { ...result, commands, observation: { file, sha256: await hashFile(inside(context.directory, file)) } };
}
async function engineGate(context, gate) {
  const baseline = readJson(inside(context.root, `harness/baselines/${gate.repository}.json`));
  const commands = [], observations = [];
  for (const [index, pkg] of baseline.checkPackages.entries()) {
    const repo = inside(context.root, `${context.contract.repositories[gate.repository].path}/${pkg.path}`);
    const cmd = await command(context, gate, context.runtimePaths.node,
      [inside(context.root, 'harness/probes/engine.mjs'), '--repo', repo, '--version', context.contract.tnbVersion], `engine-${index}`);
    commands.push(cmd);
    if (cmd.reason || cmd.signal || cmd.fatal || ![0, 1, 2].includes(cmd.exitCode)) {
      return verdict('FAIL', 'Engine probe process failed', { commands });
    }
    const result = readJson(inside(context.directory, cmd.stdout.file));
    if (!['PASS', 'FAIL', 'BLOCKED'].includes(result.status) || codes[result.status] !== cmd.exitCode) {
      return verdict('FAIL', 'Engine probe and exit code disagree', { commands });
    }
    observations.push(result);
    if (result.status !== 'PASS') return { ...result, reason: result.details?.reason, commands, observations };
  }
  return verdict('PASS', 'Compiler API native proof in all check package contexts; CLI/LSP proof is separate', { commands, observations });
}
export async function runSelection(harness, selection) {
  const { root, contract, seal, runtimePaths } = harness;
  safeEnvironment(contract);
  if (contract.phase === 'harness-only' && selection !== 'preflight') {
    throw new Error('Product runs paused: phase is harness-only; only run preflight is enabled');
  }
  if (!['all', 'preflight', ...contract.gates.map(gate => gate.id)].includes(selection)) throw new Error('Unknown gate selection');
  const release = acquireLock(root);
  try {
    const before = await snapshot(root, contract, runtimePaths);
    const nonce = crypto.randomUUID();
    const directory = path.join(root, 'artifacts', 'runs', nonce);
    fs.mkdirSync(directory, { recursive: true });
    const context = { ...harness, before, nonce, directory };
    const required = requiredGateIds(contract, before);
    const dependencies = new Set();
    function include(id) {
      if (dependencies.has(id)) return;
      dependencies.add(id);
      for (const dep of contract.gates.find(gate => gate.id === id).requires ?? []) include(dep);
    }
    if (selection !== 'all' && selection !== 'preflight') include(selection);
    const selected = selection === 'all' ? required : selection === 'preflight'
      ? ['environment', 'inventory'].filter(id => contract.gates.some(gate => gate.id === id))
      : contract.gates.map(gate => gate.id).filter(id => dependencies.has(id));
    const results = [];
    const startedAt = new Date().toISOString();
    // Contract order is reviewed; unmet dependencies are BLOCKED, not implicitly skipped.
    for (const id of selected) {
      const gate = contract.gates.find(gate => gate.id === id);
      let result;
      const missing = (gate.requires ?? []).filter(id => !results.some(row => row.id === id && row.status === 'PASS'));
      if (missing.length) result = verdict('BLOCKED', `Missing passed dependencies in this run: ${missing.join(', ')}`);
      else if (before.repositories[gate.repository]?.status !== 'PASS') result = verdict('BLOCKED', 'Checkout unavailable');
      else {
        try {
          if (gate.kind === 'environment') result = await environmentGate(context, gate);
          else if (gate.kind === 'inventory') result = inventoryGate(context);
          else if (gate.kind === 'engine') result = await engineGate(context, gate);
          else result = await adapterGate(context, gate);
        } catch (error) { result = verdict('FAIL', error.message); }
      }
      results.push({ id, ...result });
    }
    const after = await snapshot(root, contract, runtimePaths);
    const stableInputs = stable(before) === stable(after);
    const unchangedControls = (await verifySeal(root)).digest === seal.digest;
    const receipt = { schemaVersion: 1, nonce, directory, selection, controlDigest: seal.digest,
      phase: contract.phase, platform: process.platform, startedAt, finishedAt: new Date().toISOString(),
      before, after, stableInputs, unchangedControls, results,
      artifacts: await evidenceManifest(directory) };
    writeJson(path.join(directory, 'receipt.json'), receipt);
    fs.writeFileSync(path.join(directory, 'receipt.sha256'), `${await hashFile(path.join(directory, 'receipt.json'))}\n`, { flag: 'wx' });
    return { status: !stableInputs ? 'FAIL' : results.some(row => row.status === 'FAIL') ? 'FAIL'
      : results.some(row => row.status !== 'PASS') ? 'BLOCKED' : 'PASS', directory,
      scope: selection === 'all' ? 'local migration gates; finish is still required' : 'partial evidence only',
      stableInputs, results: results.map(({ id, status, reason }) => ({ id, status, reason })) };
  } finally { release(); }
}
export async function verifyReceipt(harness, directory) {
  if (!path.isAbsolute(directory)) directory = path.resolve(harness.root, directory);
  const allowed = path.join(harness.root, 'artifacts', 'runs');
  const relative = path.relative(allowed, directory).split(path.sep).join('/');
  inside(allowed, relative);
  const file = inside(directory, 'receipt.json');
  if (fs.statSync(file).size > harness.contract.policy.reportLimitBytes) throw new Error('Receipt too large');
  const receipt = readJson(file);
  if (fs.readFileSync(inside(directory, 'receipt.sha256'), 'utf8').trim() !== await hashFile(file)) throw new Error('Receipt hash mismatch');
  if (receipt.schemaVersion !== 1 || receipt.controlDigest !== harness.seal.digest
    || receipt.directory !== directory || receipt.platform !== process.platform
    || !receipt.nonce || path.basename(directory) !== receipt.nonce) throw new Error('Receipt identity mismatch');
  if (stable(receipt.artifacts) !== stable(await evidenceManifest(directory))) throw new Error('Evidence/log hash manifest mismatch (missing, added or modified file)');
  if (receipt.phase !== harness.contract.phase || !receipt.stableInputs || !receipt.unchangedControls
    || stable(receipt.before) !== stable(receipt.after)) throw new Error('Run inputs changed');
  if (stable(await snapshot(harness.root, harness.contract, harness.runtimePaths)) !== stable(receipt.after)) throw new Error('Stale receipt: sources, dependencies, executable artifacts or environment changed');
  if (!Array.isArray(receipt.results)) throw new Error('Missing gate results');
  const ids = new Set();
  const context = { ...harness, directory, nonce: receipt.nonce, before: receipt.before };
  for (const row of receipt.results) {
    const gate = harness.contract.gates.find(gate => gate.id === row.id);
    if (!gate || ids.has(row.id) || !['PASS', 'FAIL', 'BLOCKED'].includes(row.status)) throw new Error('Duplicate/unknown/invalid gate result');
    ids.add(row.id);
    for (const cmd of row.commands ?? []) {
      for (const stream of ['stdout', 'stderr']) {
        if (await hashFile(inside(directory, cmd[stream].file)) !== cmd[stream].sha256) throw new Error('Command log hash mismatch');
        if (row.status === 'PASS' && fatalPattern.test(fs.readFileSync(inside(directory, cmd[stream].file), 'utf8'))) throw new Error('Successful gate contains fatal process output');
      }
      if (row.status === 'PASS' && processVerdict(cmd) !== 'PASS') throw new Error('Successful gate has unsuccessful process');
    }
    if (row.status !== 'PASS') continue;
    if ((gate.requires ?? []).some(id => !receipt.results.some(item => item.id === id && item.status === 'PASS'))) throw new Error('Missing passed dependency');
    if (gate.kind === 'inventory') {
      if (inventoryGate(context).status !== 'PASS') throw new Error('Inventory no longer valid');
    } else if (gate.kind === 'environment') {
      if (row.commands?.length !== 4) throw new Error('Incomplete environment evidence');
      for (const [index, [id, expected]] of environmentVersions.entries()) {
        const cmd = row.commands[index];
        checkCommand(context, environmentContext(gate, id), cmd, id === 'node' ? ['--version'] : [harness.runtimePaths[id], '--version'], `environment-${id.toLowerCase()}`);
        if (!correctVersion(id, fs.readFileSync(inside(directory, cmd.stdout.file), 'utf8').trim(), expected)) throw new Error('Environment version evidence mismatch');
      }
    } else if (gate.kind === 'engine') {
      const packages = readJson(inside(harness.root, `harness/baselines/${gate.repository}.json`)).checkPackages;
      const count = packages.length;
      if (row.commands?.length !== count || row.observations?.length !== count) throw new Error('Incomplete engine context evidence');
      for (const [index, cmd] of row.commands.entries()) {
        const repo = inside(harness.root, `${harness.contract.repositories[gate.repository].path}/${packages[index].path}`);
        checkCommand(context, gate, cmd, [inside(harness.root, 'harness/probes/engine.mjs'), '--repo', repo, '--version', harness.contract.tnbVersion], `engine-${index}`);
        const observation = readJson(inside(directory, cmd.stdout.file));
        if (stable(observation) !== stable(row.observations[index])) throw new Error('Engine observation differs from raw probe output');
        await verifyEngineObservation(observation, repo, harness.contract.tnbVersion);
      }
    } else {
      const adapter = registeredAdapter(context, gate);
      if (!adapter || row.commands?.length !== 1 || !row.observation) throw new Error('PASS lacks executed approved collector');
      const cmd = row.commands[0];
      checkCommand(context, gate, cmd, [inside(harness.root, adapter.collector)], gate.id);
      const observationPath = inside(directory, row.observation.file);
      if (await hashFile(observationPath) !== row.observation.sha256) throw new Error('Observation hash mismatch');
      const result = await validateObservation(context, gate, adapter, readJson(observationPath));
      if (result.status !== 'PASS') throw new Error(`Observation fails current assertions: ${result.reason}`);
    }
  }
  return receipt;
}

async function verifyEngineObservation(observation, repo, version) {
  const d = observation.details;
  if (observation.status !== 'PASS' || d?.context !== repo || d.packageName !== 'typescript-native-bridge'
    || d.packageVersion !== version || !d.native?.length
    || !(d.counters?.afterNegative.rpcCount > d.counters?.before.rpcCount)
    || !(d.counters?.afterPositive.rpcCount > d.counters?.afterNegative.rpcCount)
    || d.fixture?.negative?.length !== 1 || d.fixture?.positive?.length !== 0
    || d.fixture.negative[0].code !== 2322 || d.fixture.negative[0].category !== 1
    || d.fixture.negative[0].start !== d.fixture.invalidSource.indexOf('probeValue')
    || d.fixture.negative[0].length !== 'probeValue'.length
    || d.process?.exitCode !== 0 || d.process.signal || d.process.error
    || fatalPattern.test(d.process.stderr ?? '')) throw new Error('Incomplete native semantic engine proof');
  const require = createRequire(path.join(repo, 'package.json'));
  for (const [key, target] of [['module', 'typescript'], ['package', 'typescript/package.json']]) {
    const file = fs.realpathSync(require.resolve(target));
    if (d[key]?.path !== file || d[key].sha256 !== await hashFile(file)) throw new Error('Actual SDK resolution differs from engine evidence');
  }
  for (const artifact of d.native) {
    if (path.basename(artifact.path) !== 'bridge.node' || await hashFile(artifact.path) !== artifact.sha256) throw new Error('Native addon evidence changed');
  }
}
export async function finishRun(harness, directory) {
  if (harness.contract.phase !== 'migration') throw new Error('Migration completion paused: phase is harness-only');
  const receipt = await verifyReceipt(harness, directory);
  const required = requiredGateIds(harness.contract, receipt.before);
  const missing = required.filter(id => !receipt.results.some(row => row.id === id && row.status === 'PASS'));
  if (receipt.selection !== 'all') missing.push('full run all (subset receipts cannot finish)');
  // Cross-platform proof requires its own reviewed collector. A local platform label
  // or a copied JSON receipt is never a Linux execution attestation.
  if (harness.contract.policy.requiredPlatforms.some(platform => platform !== process.platform)
    && !receipt.results.some(row => row.id === 'platforms' && row.status === 'PASS')) missing.push('platforms collector: Windows and Linux execution proof');
  return verdict(missing.length ? 'BLOCKED' : 'PASS', missing.length ? 'Migration acceptance incomplete' : 'All sealed acceptance gates passed', { missing, directory: receipt.directory });
}
export async function generateTask(harness, roleName, previousFile) {
  if (harness.contract.phase !== 'migration') throw new Error('Product task dispatch paused: phase is harness-only');
  const role = harness.contract.roles[roleName];
  if (!role) throw new Error('Unknown task role');
  await verifyReadiness(harness);
  // Assignments bind source ownership. Acceptance runs independently fingerprint
  // every executable input; do not rescan other workers' installing dependencies here.
  const before = { repositories: { [role.repository]: await snapshotRepository(harness.root,
    harness.contract.repositories[role.repository], { includeRuntime: false }) } };
  const repo = before.repositories[role.repository];
  if (repo.status !== 'PASS') throw new Error('Task checkout unavailable');
  let previous;
  let scopeTransition;
  if (previousFile) {
    previous = readTask(harness, previousFile);
    const base = harness.contract.repositories[role.repository].base;
    if (previous.role !== roleName
      || previous.before?.repositories?.[role.repository]?.base !== base
      || previous.before.repositories[role.repository].head !== base) {
      throw new Error('Task revision cannot change ownership or its sealed starting baseline');
    }
    if (stable(previous.roleSpec) !== stable(role)) {
      const digest = await hashFile(previousFile);
      scopeTransition = harness.contract.scopeTransitions?.find(item => item.role === roleName
        && item.previousTaskId === previous.id && item.previousControlDigest === previous.controlDigest
        && item.previousRecordSha256 === digest && stable(item.from) === stable(previous.roleSpec)
        && stable(item.to) === stable(role));
      if (!scopeTransition) throw new Error('Task revision cannot change ownership without an exact reviewed scope transition');
      // Expansion is prospective: it cannot retrospectively bless edits already
      // outside the worker's original assignment.
      if (scopeChanges(harness, previous.roleSpec).outside.length) {
        throw new Error('Resolve out-of-scope changes under the original assignment before reassignment');
      }
    }
    if (scopeChanges(harness, role).outside.length) throw new Error('Resolve out-of-scope changes before revising a task');
  } else if (repo.changed) throw new Error('Task checkout must start clean at its pinned base; use revise for an existing assignment');
  const id = crypto.randomUUID();
  const directory = path.join(harness.root, 'artifacts', 'tasks', id);
  const record = { schemaVersion: 1, id, role: roleName, controlDigest: harness.seal.digest,
    before: previous?.before ?? before, roleSpec: role,
    ...(previous ? { previousTaskId: previous.id, previousControlDigest: previous.controlDigest,
      revisionSnapshot: before, previousRecordSha256: await hashFile(previousFile),
      ...(scopeTransition ? { scopeTransition } : {}) } : {}) };
  writeJson(path.join(directory, 'task.json'), record);
  const prompt = `Read ${path.join(harness.root, 'AGENTS.md')} and ${path.join(harness.root, 'HARNESS.md')} first.\n`
    + `Harness ${harness.contract.version}; seal ${harness.seal.digest}. Verify with node harness/cli.mjs verify in ${harness.root}.\n`
    + `Task record: ${path.join(directory, 'task.json')}\nRole: ${roleName}. Work only in ${repo.path}, base ${repo.base}.\n`
    + (previous ? `Continues task ${previous.id}; retain its changes and original base. Previous task records are superseded.\n` : '')
    + `Allowed paths: ${role.paths.join(', ')}. Do not edit harness controls or other worktrees.\n`
    + `Required gates: ${role.gates.join(', ')}. Run evidence via node harness/cli.mjs run all from the harness root; coordinate the heavy-run lock.\n`
    + `Missing collectors are BLOCKED; request coordinator integration using existing project tests. Do not write PASS receipts.\n`
    + `Hand off with node harness/cli.mjs handoff ${path.join(directory, 'task.json')}; include exact changes, commands and evidence.\n`
    + `Only final integrated acceptance via node harness/cli.mjs finish RUN_DIRECTORY can declare migration complete.\n`;
  fs.writeFileSync(path.join(directory, 'prompt.md'), prompt, { flag: 'wx' });
  return { status: 'PASS', file: path.join(directory, 'task.json'), prompt };
}
function readTask(harness, file) {
  const taskRoot = path.join(harness.root, 'artifacts', 'tasks');
  inside(taskRoot, path.relative(taskRoot, path.resolve(file)).split(path.sep).join('/'));
  const task = readJson(file);
  if (path.basename(path.dirname(file)) !== task.id || path.basename(file) !== 'task.json') throw new Error('Wrong task record location');
  return task;
}
function scopeChanges(harness, role) {
  const repo = inside(harness.root, harness.contract.repositories[role.repository].path);
  const base = harness.contract.repositories[role.repository].base;
  const changed = [...new Set([...git(repo, ['diff', '--name-only', '-z', '--no-renames', base, '--']).split('\0'),
    ...git(repo, ['ls-files', '-z', '--others', '--exclude-standard']).split('\0')].filter(Boolean))];
  const submodules = new Set([...gitLinks(repo, base).keys(), ...gitLinks(repo).keys()]);
  for (const file of submodules) {
    const stat = fs.lstatSync(path.join(repo, file), { throwIfNoEntry: false });
    if (stat && !stat.isDirectory()) {
      submodules.delete(file);
      // Git can treat a dangling link as an uninitialized submodule and omit
      // it from diff output. Its invalid replacement still belongs in review.
      if (!changed.includes(file)) changed.push(file);
    }
  }
  const outside = changed.filter(file => !role.paths.some(prefix => prefix.endsWith('/')
    ? file.startsWith(prefix) || file === prefix.slice(0, -1) && submodules.has(file)
    : file === prefix));
  return { changed, outside };
}
export async function reviseTask(harness, file) {
  return generateTask(harness, readTask(harness, file).role, file);
}
export async function handoff(harness, file) {
  if (harness.contract.phase !== 'migration') throw new Error('Product handoff paused: phase is harness-only');
  const task = readTask(harness, file);
  if (task.controlDigest !== harness.seal.digest || stable(task.roleSpec) !== stable(harness.contract.roles[task.role])) throw new Error('Task contract is stale or modified');
  const role = task.roleSpec;
  const base = harness.contract.repositories[role.repository].base;
  if (task.before?.repositories?.[role.repository]?.base !== base
    || task.before.repositories[role.repository].head !== base) throw new Error('Task baseline differs from sealed contract');
  const { changed, outside } = scopeChanges(harness, role);
  return verdict(outside.length ? 'FAIL' : 'PASS', outside.length ? 'Changes outside assigned ownership' : 'Scope check passed; this is not product acceptance', { changed, outside, requiredGates: role.gates });
}

export async function verifyReadiness(harness) {
  const pointer = readJson(path.join(harness.root, 'artifacts', 'selftest.json'));
  const allowed = path.join(harness.root, 'artifacts', 'selftests');
  const file = inside(allowed, path.relative(allowed, pointer.file).split(path.sep).join('/'));
  if (await hashFile(file) !== pointer.sha256) throw new Error('Selftest receipt changed');
  const record = readJson(file);
  const tests = Object.keys(harness.seal.files).filter(file => /^harness\/tests\/.*\.test\.mjs$/.test(file));
  if (record.controlDigest !== harness.seal.digest || record.status !== 'PASS'
    || record.platform !== process.platform || record.directory !== path.dirname(file)
    || stable(record.tests) !== stable(tests) || !tests.length
    || record.command.executable !== process.execPath
    || stable(record.command.args) !== stable(['--test', '--test-reporter=tap', ...tests.map(file => inside(harness.root, file))])
    || record.command.cwd !== fs.realpathSync.native(harness.root)
    || processVerdict(record.command) !== 'PASS') throw new Error('Current sealed harness selftests must pass before dispatch');
  for (const stream of ['stdout', 'stderr']) {
    if (await hashFile(inside(record.directory, record.command[stream].file)) !== record.command[stream].sha256) throw new Error('Selftest log changed');
  }
  const tap = fs.readFileSync(inside(record.directory, record.command.stdout.file), 'utf8');
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
    .map(key => [key, Number(tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? NaN)]));
  if (!(counts.tests > 0 && counts.tests === counts.pass
    && ['fail', 'cancelled', 'skipped', 'todo'].every(key => counts[key] === 0))) throw new Error('Incomplete selftest run');
  return record;
}
