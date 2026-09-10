// Self-tests for the desktop collector's validator.
//
// The evidence below is synthetic and produced by `desktop-testkit.mjs`. It
// exercises the validator's own re-derivation and its negative paths, and it is
// never acceptance evidence: real evidence comes only from running the
// registered collector through the sealed runner. A synthetic fixture that the
// validator accepts proves the checks are coherent, not that the product works.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDesktopFixture } from '../collectors/desktop/desktop-testkit.mjs';
import { validate } from '../collectors/desktop/desktop-validator.mjs';
import { deriveCycles } from '../collectors/desktop/desktop-observations.mjs';
import { assertLaunchArguments, launchArguments } from '../collectors/desktop/desktop-launch.mjs';
import { evidenceFile, readJsonFile, readRawEvidence, sha256 } from '../collectors/desktop/desktop-evidence.mjs';
import { packVsix } from '../collectors/desktop/desktop-vsix.mjs';

const here = new URL('./', import.meta.url);
const read = name => readJsonFile(fileURLToPath(new URL(`../collectors/desktop/${name}`, here)));
const contract = readJsonFile(fileURLToPath(new URL('../contract.json', here)));
const expectations = read('desktop-expectations.json');
const plan = read('desktop-plan.json');
const rounds = contract.policy.desktopEditRounds;
// Mirror of the validator's list: the collector may never write a conclusion.
const statusFields = ['status', 'result', 'outcome', 'verdict', 'pass', 'fail', 'passed', 'failed', 'success'];
// The reference digest a raw evidence record must carry; mirrors the validator.
const hashPattern = /^[a-f0-9]{64}$/;

/** A run directory that this test owns and can always remove again. */
function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-selftest-'));
  t.after(() => {
    const actual = fs.realpathSync.native(root);
    assert.equal(path.dirname(actual), fs.realpathSync.native(os.tmpdir()));
    assert.ok(path.basename(actual).startsWith('desktop-selftest-'));
    fs.rmSync(actual, { recursive: true, force: true });
  });
  return root;
}

function fixtureFor(t, { roundCount = rounds, packed = true } = {}) {
  const root = temporaryRoot(t);
  const fixture = buildDesktopFixture({ root, rounds: roundCount, contract, expectations, plan, packed });
  fixture.commit();
  return fixture;
}

const run = fixture => validate(fixture.observation,
  { contract, expectations, root: fixture.root, directory: fixture.directory, gate: { id: 'desktop' }, nonce: fixture.nonce });

/**
 * Rewrite one raw record after collection and keep the reference hash the
 * observation carries in sync, exactly as a collector that recorded the wrong
 * bytes would have. `jsonl` rewrites the passive native process log.
 */
function editEvidence(fixture, reference, change, { jsonl = false } = {}) {
  const file = path.join(fixture.directory, reference.file);
  if (jsonl) {
    const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    change(rows);
    fs.writeFileSync(file, `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
  } else {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    change(value);
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  }
  reference.sha256 = sha256(fs.readFileSync(file));
  return reference;
}

const cycleRecords = (report, operation) => report.records.filter(row => row.operation === operation);

test('the sealed default is 100 real edit cycles and the complete run is accepted', async t => {
  const fixture = fixtureFor(t);
  const observation = fixture.observation;
  assert.equal(observation.rounds, 100);
  assert.equal(observation.completedRounds, 100);
  assert.equal(observation.executions.length, 2, 'both sealed workspaces are measured');
  for (const session of observation.trace.sessions) {
    const derived = deriveCycles(session, rounds);
    assert.equal(derived.cycles, rounds + 2, 'the opening and external cycles plus every editor cycle');
  }
  for (const host of fixture.hosts) {
    assert.equal(cycleRecords(host.report, 'GTS invalid').length, rounds);
    assert.equal(cycleRecords(host.report, 'unsaved cross-file invalid').length, rounds);
    assert.equal(cycleRecords(host.report, 'GTS repair/query').length, rounds);
  }
  const result = await run(fixture);
  assert.equal(result.status, 'PASS', result.reason);
  assert.match(result.reason, /100 real edit cycles/);
  assert.deepEqual(observation.scenarios.map(scenario => scenario.id).sort(), [...plan.scenarios].sort(),
    'every sealed scenario is covered exactly once');
  assert.equal(observation.scenarios.length, plan.scenarios.length, 'no scenario is invented');
});

test('a claimed round counter cannot replace the real measured cycles', async t => {
  const fixture = fixtureFor(t, { roundCount: 3 });
  // Claim the sealed 100 in every summary while the raw records still hold only
  // the three cycles that were actually measured.
  for (const execution of fixture.observation.executions) {
    editEvidence(fixture, execution.report, report => { report.cycles = rounds; });
    editEvidence(fixture, execution.launch, launch => { launch.rounds = rounds; });
  }
  fixture.observation.rounds = rounds;
  fixture.observation.completedRounds = rounds;
  for (const host of fixture.hosts) assert.equal(host.report.cycles, 3, 'the raw report measured three rounds');
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /Missing measured|Subset desktop rounds/, `accepted a claimed counter: ${result.reason}`);
});

test('a short run cannot pass the sealed default', async t => {
  const fixture = fixtureFor(t, { roundCount: 3 });
  assert.equal(fixture.hosts[0].report.cycles, 3);
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /does not record the sealed 100-round default|3 rounds instead of 100|claims 3 rounds/);
});

test('a subset run that measures one workspace cannot pass', async t => {
  const fixture = fixtureFor(t);
  fixture.observation.executions = fixture.observation.executions.slice(0, 1);
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /Expected 2 measured workspaces/);
});

test('evidence produced by another run cannot pass', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.executions[0].report, report => { report.runNonce = 'another-run'; });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /belongs to another run/);
});

test('a measured source outside the GTS checkout cannot pass', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.executions[0].sources, sources => {
    sources.sources[0].actualUri = pathToFileURL(path.join(os.tmpdir(), 'elsewhere', sources.sources[0].name)).href;
  });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /outside its workspace/);
});

test('evidence outside the run directory is refused before it is read', () => {
  const directory = path.join('C:', 'run', 'desktop');
  for (const reference of ['../escape.json', '../../escape.json', '/absolute.json',
    'C:/absolute.json', 'sub\\..\\..\\escape.json', 'sub/../../escape.json', '..', '', '.']) {
    assert.throws(() => evidenceFile(directory, reference),
      /Evidence path must be relative|leaves the run directory/, `accepted ${JSON.stringify(reference)}`);
  }
  assert.throws(() => readRawEvidence(directory,
    { file: '../escape.json', sha256: 'a'.repeat(64) }),
  /Evidence path must be relative|leaves the run directory/);
});

test('a reference without a 64-hex sha256 is refused', () => {
  const directory = path.join('C:', 'run', 'desktop');
  for (const digest of [undefined, '', 'abc', 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65)]) {
    assert.throws(() => readRawEvidence(directory, { file: 'report.json', sha256: digest }),
      /carries no SHA-256/, `accepted ${JSON.stringify(digest)}`);
  }
  assert.ok(hashPattern.test('a'.repeat(64)));
});

test('evidence whose bytes changed after collection is rejected', async t => {
  const fixture = fixtureFor(t);
  const reference = fixture.observation.executions[0].report;
  fs.appendFileSync(path.join(fixture.directory, reference.file), ' ');
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /changed after collection/);
});

test('the two launch modes are distinguished by their arguments', () => {
  const repository = path.join('C:', 'gts');
  const profile = path.join('C:', 'run', 'user-data');
  const extensions = path.join('C:', 'run', 'extensions');
  const workspace = path.join('C:', 'gts');
  const vsix = path.join('C:', 'run', 'packed-vsix', 'gamingts-vscode-0.0.23-win32-x64.vsix');

  const development = launchArguments({ plan, mode: 'development-path', repository, profile, extensionsDirectory: extensions, workspace, vsix: null });
  assert.equal(development.install, null, 'the development path installs nothing');
  assert.ok(development.args.includes('--extensionDevelopmentPath'));
  assert.ok(!development.args.includes('--install-extension'));
  assert.deepEqual(assertLaunchArguments({ mode: 'development-path', args: development.args, install: development.install }),
    { developmentPath: path.join(repository, plan.extension.developmentPath), installExtension: null });

  const packed = launchArguments({ plan, mode: 'packed-vsix-install', repository, profile, extensionsDirectory: extensions, workspace, vsix });
  assert.ok(!packed.args.includes('--extensionDevelopmentPath'), 'the installed mode loads no development path');
  assert.ok(!packed.args.includes('--disable-extensions'));
  assert.deepEqual(assertLaunchArguments({ mode: 'packed-vsix-install', args: packed.args, install: packed.install }),
    { developmentPath: null, installExtension: vsix });

  // Each mode refuses the other's arguments.
  assert.throws(() => assertLaunchArguments({ mode: 'development-path', args: packed.args, install: packed.install }),
    /must set --extensionDevelopmentPath/);
  assert.throws(() => assertLaunchArguments({ mode: 'packed-vsix-install', args: development.args, install: packed.install }),
    /must not set --extensionDevelopmentPath/);
  assert.throws(() => assertLaunchArguments({ mode: 'packed-vsix-install', args: packed.args, install: null }),
    /must install a real \.vsix/);
  assert.throws(() => assertLaunchArguments({ mode: 'development-path', args: development.args, install: packed.install }),
    /must not install an extension/);
  assert.throws(() => assertLaunchArguments({ mode: 'development-path', args: [...development.args, '--install-extension', vsix], install: null }),
    /must not pass --install-extension/);
  assert.throws(() => assertLaunchArguments({ mode: 'packed-vsix-install', args: [...packed.args, '--disable-extensions'], install: packed.install }),
    /must not disable installed extensions/);
});

test('a measured launch that names another mode is rejected', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.executions[0].launch, launch => {
    launch.mode = 'packed-vsix-install';
    launch.args = launchArguments({ plan, mode: 'packed-vsix-install', repository: fixture.repository,
      profile: launch.profile, extensionsDirectory: launch.extensionsDirectory,
      workspace: launch.workspacePath, vsix: path.join(fixture.directory, 'packed-vsix', 'other.vsix') }).args;
  });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /unexpected launch mode packed-vsix-install/);
});

test('a launch that records no process cleanup is rejected', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.executions[0].launch, launch => { delete launch.cleanup; });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /another platform's cleanup record|no process-cleanup record/);

  const linux = fixtureFor(t);
  editEvidence(linux, linux.observation.executions[0].launch, launch => {
    launch.cleanup = { platform: 'linux', executed: false, owner: 'windows-job-object',
      reason: 'pretending the job object ran on Linux', marker: {} };
  });
  const onLinux = await run(linux);
  assert.equal(onLinux.status, 'FAIL');
  assert.match(onLinux.reason, /platform|not cleaned up/);
});

test('the packed artifact is built by the product pack script inside the run', async t => {
  const root = temporaryRoot(t);
  const repository = path.join(root, 'worktrees', 'gts');
  const manifestPath = path.join(repository, plan.extension.manifest);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify({ name: plan.extension.packageName })}\n`);
  const directory = path.join(root, 'run', 'desktop', plan.extension.packOutputDirectory);
  fs.mkdirSync(directory, { recursive: true });
  const output = path.join(directory, 'gamingts-vscode-0.0.23-win32-x64.vsix');

  const node = process.env.HARNESS_NODE, manager = process.env.HARNESS_MANAGER;
  delete process.env.HARNESS_NODE;
  delete process.env.HARNESS_MANAGER;
  t.after(() => {
    if (node === undefined) delete process.env.HARNESS_NODE; else process.env.HARNESS_NODE = node;
    if (manager === undefined) delete process.env.HARNESS_MANAGER; else process.env.HARNESS_MANAGER = manager;
  });
  // Without the pinned toolchain the pack step refuses: it must never fall back
  // to whatever node and pnpm the machine happens to have on PATH.
  await assert.rejects(() => packVsix({ core: { execute: async () => { throw new Error('must not run'); } },
    repository, plan, directory, output, timeoutMs: 1000 }), /HARNESS_NODE\/HARNESS_MANAGER/);

  // With it, exactly the product's own script runs, and it writes its artifact
  // into the run directory rather than finding one left on disk.
  process.env.HARNESS_NODE = path.join(root, 'runtime', 'node.exe');
  process.env.HARNESS_MANAGER = path.join(root, 'runtime', 'pnpm.cjs');
  const calls = [];
  const result = await packVsix({ plan, repository, directory, output, timeoutMs: 1234, limitBytes: 4096,
    core: { execute: async options => { calls.push(options); return { exitCode: 0 }; } } });
  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    executable: process.env.HARNESS_NODE,
    args: [process.env.HARNESS_MANAGER, '--filter', plan.extension.packageName, 'run', plan.extension.packScript, output],
    cwd: repository, directory, label: plan.extension.packLabel, timeoutMs: 1234, limitBytes: 4096, env: {},
  });
  assert.ok(path.resolve(calls[0].args.at(-1)).startsWith(path.resolve(directory) + path.sep),
    'the artifact must be written inside the run directory');
});

test('an artifact left on disk is not accepted in place of a packed run', async t => {
  const fixture = fixtureFor(t);
  const stray = path.join(fixture.directory, plan.extension.packOutputDirectory, 'gamingts-vscode-0.0.23-win32-x64.vsix');
  fs.mkdirSync(path.dirname(stray), { recursive: true });
  fs.writeFileSync(stray, 'an artifact a human left behind');
  fixture.observation.packedVsix = { ...fixture.observation.packedVsix, pack: null,
    vsix: { file: `${plan.extension.packOutputDirectory}/${path.basename(stray)}`,
      sha256: sha256(fs.readFileSync(stray)), bytes: fs.statSync(stray).size } };
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /records no product pack step/);

  const other = fixtureFor(t);
  other.observation.packedVsix.pack.output = path.join(other.directory, plan.extension.packOutputDirectory, 'other.vsix');
  const mismatch = await run(other);
  assert.equal(mismatch.status, 'FAIL');
  assert.match(mismatch.reason, /not the VSIX the run measured/);
});

test('the product pack step must be the one that produced the measured artifact', async t => {
  const fixture = fixtureFor(t);
  fixture.observation.packedVsix.pack.command.exitCode = 1;
  const failed = await run(fixture);
  assert.equal(failed.status, 'FAIL');
  assert.match(failed.reason, /pack script did not succeed/);

  const other = fixtureFor(t);
  other.observation.packedVsix.pack.command.args[4] = 'publish';
  const script = await run(other);
  assert.equal(script.status, 'FAIL');
  assert.match(script.reason, /did not run the product pack script/);
});

test('a packed install that did not succeed is rejected', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.packedVsix.launch, launch => { launch.install.exitCode = 1; });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /never installed into the isolated extension directory/);
});

test('an unavailable packed mode is blocked, never counted as passed', async t => {
  const fixture = fixtureFor(t);
  fixture.observation.packedVsix = { mode: 'packed-vsix-install', unavailable: 'the pack script cannot run here',
    pack: null, vsix: null, package: null, install: null, installed: null, services: null, launch: null, report: null, native: [] };
  const result = await run(fixture);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /packed-vsix-install could not run/);
});

test('an observation that is not tied to the latest document version is rejected', async t => {
  const fixture = fixtureFor(t);
  editEvidence(fixture, fixture.observation.executions[0].report, report => {
    const answers = report.records.filter(row => row.operation === 'observation' && row.name === 'GTS');
    answers.at(-1).version -= 1;
  });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /Stale document diagnostics|Stale or duplicate source version|another document version/);
});

test('a restarted language service is detected rather than ignored', async t => {
  const fixture = fixtureFor(t);
  const native = fixture.observation.executions[0].native[0];
  editEvidence(fixture, native, rows => { rows.push(structuredClone(rows[0])); }, { jsonl: true });
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /restarted|replayed/);
});

test('a service that never loaded the pinned native module is detected', async t => {
  const fixture = fixtureFor(t);
  const execution = fixture.observation.executions[0];
  for (const native of execution.native) {
    editEvidence(fixture, native, rows => {
      for (const row of rows) if (row.kind === 'identity') row.detail.native = [];
    }, { jsonl: true });
  }
  const result = await run(fixture);
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /native/i);
});

test('the collector only records raw evidence and never writes a conclusion', async t => {
  const fixture = fixtureFor(t);
  for (const field of statusFields) {
    assert.ok(!(field in fixture.observation), `the collector wrote a "${field}" field`);
  }
  assert.equal(fixture.observation.error, undefined);
  const result = await run(fixture);
  assert.equal(result.status, 'PASS', result.reason);

  for (const field of statusFields) {
    const shadowed = { ...fixture.observation, [field]: 'PASS' };
    const rejected = await validate(shadowed, { contract, expectations, root: fixture.root,
      directory: fixture.directory, gate: { id: 'desktop' }, nonce: fixture.nonce });
    assert.equal(rejected.status, 'FAIL', `accepted an observation carrying "${field}"`);
    assert.match(rejected.reason, /must only record raw evidence/);
  }
});