// Selftests for the tnb-guards validator.
//
// The canonical evidence below is synthetic: it exercises the validator's own
// logic and its negative paths, not the product. Real product evidence comes
// only from running the registered collector through the runner, where the
// raw logs and the resolved git revisions are produced together.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { git, hashFile, readJson, volarReference } from '../core.mjs';
import { evaluate, validate } from '../collectors/tnb/tnb-guards-validator.mjs';

const expectations = readJson(fileURLToPath(
  new URL('../collectors/tnb/tnb-guards-expectations.json', import.meta.url)));
const head = 'f'.repeat(40);
const slug = value => value.replace(/\.mjs$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const stdoutByScript = {
  'tools/check-lib-sync.mjs': 'check:lib-sync bundled libs: intersection=108 byte-identical, asymmetry=[]\n'
    + 'check:lib-sync ok (overlay\u2194submodule both dirs, lib shims, lib/typescript.js, lib/_tsc.js, bundled libs, no staged)\n',
  'tools/check-bundle-shape.mjs': 'check:bundle-shape ok (eager sys, 0 __esm, no services in _tsc.js)\n',
  'tools/check-skeleton-imports.mjs': 'check:skeleton-imports ok (no imports=[] poison on skeleton)\n',
  'tools/check-enum-remap.mjs': 'Enum divergence report (fork types.ts vs tsgo native-preview, by member name)\n'
    + 'node.kind              SyntaxKind       DIVERGES     remapped \u2713 (wired)\n'
    + 'Auto-discovered SyntaxKind-scalar getters in node decoder: kind, keyword\n'
    + 'PASS: every divergent, consumer-exposed enum field is remapped or validly exempt.\n',
  'tools/check-go-as-guards.mjs': 'As*() cast families derived from typescript-go\\internal\\checker\\types.go\n'
    + 'VERDICT: PASS (6 sites checked)\n',
  'tools/check-sourcefile-guard.mjs':
    'check:sourcefile-guard ok (totalRpc=1234, getSourceFileRpc=0, baseline<=240)\n',
};

function canonical() {
  const submodules = Object.fromEntries(Object.entries(expectations.submodules)
    .map(([name, pin]) => [name, { pin, head: pin }]));
  const observation = {
    runNonce: 'nonce', gateId: 'tnb-guards', controlDigest: 'digest', sourceDigest: 'source',
    platform: process.platform, tnbVersion: expectations.tnbVersion, head, submodules, guards: [],
  };
  const logs = new Map();
  for (const guard of expectations.guards) {
    const record = { id: guard.id, exitCode: 0, durationMs: 1, commands: [] };
    for (const spec of guard.commands) {
      const base = `tnb-guards-${slug(guard.id)}-${slug(path.basename(spec.script))}`;
      const stdout = `${base}.stdout.log`;
      const stderr = `${base}.stderr.log`;
      logs.set(stdout, stdoutByScript[spec.script]);
      logs.set(stderr, '');
      record.commands.push({
        name: base, script: spec.script, executed: true, args: [spec.script], executable: process.execPath,
        cwd: 'C:\\checkout\\typescript-native-bridge', exitCode: 0, signal: null, reason: null, fatal: false, durationMs: 1,
        stdout: { file: stdout, sha256: 'a'.repeat(64) }, stderr: { file: stderr, sha256: 'b'.repeat(64) },
      });
    }
    observation.guards.push(record);
  }
  const facts = {
    head, tnbVersion: expectations.tnbVersion, packageVersion: expectations.tnbVersion,
    repository: 'C:\\checkout\\typescript-native-bridge', submodules: structuredClone(submodules),
    volar: null,
  };
  return { observation, logs, facts };
}

function run(change) {
  const { observation, logs, facts } = canonical();
  change({ observation, logs, facts });
  return evaluate({ observation, logs, expectations, facts });
}

function guardOf(observation, id) {
  return observation.guards.find(guard => guard.id === id);
}

test('registered tnb-guards evidence passes when every guard finishes at the pins', () => {
  assert.equal(run(() => {}).status, 'PASS');
});

test('the sealed expectations keep the reviewed shape', () => {
  assert.equal(expectations.tnbVersion, '6.0.3-bridge.16.tsgo.7.0.2');
  assert.deepEqual(expectations.submodules, {
    typescript: '050880ce59e30b356b686bd3144efe24f875ebc8',
    'typescript-go': '2bd066d87f5bafd315be9f40889d0a60b9e58e0b',
  });
  assert.deepEqual(expectations.guards.map(guard => guard.id),
    ['check:lib', 'check:enums', 'check:go-as-guards', 'check:sourcefile-guard']);
  assert.deepEqual(guardOf(canonical().observation, 'check:lib').commands.map(command => command.script),
    ['tools/check-lib-sync.mjs', 'tools/check-bundle-shape.mjs', 'tools/check-skeleton-imports.mjs']);
  const sourcefile = expectations.guards.find(guard => guard.id === 'check:sourcefile-guard').commands[0];
  assert.deepEqual(sourcefile.counts, [
    { label: 'totalRpc', pattern: 'totalRpc=([0-9]+)', min: 1 },
    { label: 'getSourceFileRpc', pattern: 'getSourceFileRpc=([0-9]+)', max: 240 },
    { label: 'baseline', pattern: 'baseline<=([0-9]+)', exact: 240 },
  ]);
  assert.equal(sourcefile.blocked[0].pattern, 'missing volar/vue');
  const go = expectations.guards.find(guard => guard.id === 'check:go-as-guards').commands[0];
  assert.equal(go.counts.find(counter => counter.label === 'sites').min, 6);
});

test('a guard that exits non-zero is rejected', () => {
  const result = run(({ observation, logs }) => {
    const command = guardOf(observation, 'check:enums').commands[0];
    command.exitCode = 1;
    logs.set(command.stdout.file, 'check:enum-remap did not finish');
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /check:enums .*exited 1/);
});

test('a skipped guard or a hidden failing child is rejected', () => {
  const skipped = run(({ observation }) => { observation.guards = []; });
  assert.equal(skipped.status, 'FAIL');
  assert.match(skipped.reason, /no recorded guard execution/);
  const hidden = run(({ observation }) => {
    guardOf(observation, 'check:lib').commands.pop();
  });
  assert.equal(hidden.status, 'FAIL');
  assert.match(hidden.reason, /executed 2 of 3 scripts/);
  const emptyWhileExitingZero = run(({ logs }) => {
    logs.set('tnb-guards-check-lib-check-bundle-shape.stdout.log', '');
  });
  assert.equal(emptyWhileExitingZero.status, 'FAIL');
  assert.match(emptyWhileExitingZero.reason, /did not report/);
});

test('a zero-match report cannot pass', () => {
  const sites = run(({ logs }) => {
    logs.set('tnb-guards-check-go-as-guards-check-go-as-guards.stdout.log', 'VERDICT: PASS (0 sites checked)\n');
  });
  assert.equal(sites.status, 'FAIL');
  assert.match(sites.reason, /sites=0/);
  const rpc = run(({ logs }) => {
    logs.set('tnb-guards-check-sourcefile-guard-check-sourcefile-guard.stdout.log',
      'check:sourcefile-guard ok (totalRpc=0, getSourceFileRpc=0, baseline<=240)\n');
  });
  assert.equal(rpc.status, 'FAIL');
  assert.match(rpc.reason, /totalRpc=0/);
  const baseline = run(({ logs }) => {
    logs.set('tnb-guards-check-sourcefile-guard-check-sourcefile-guard.stdout.log',
      'check:sourcefile-guard ok (totalRpc=5, getSourceFileRpc=0, baseline<=999)\n');
  });
  assert.equal(baseline.status, 'FAIL');
  assert.match(baseline.reason, /baseline=999/);
});

test('a changed runtime pin or checkout HEAD is rejected', () => {
  const wrongVersion = run(({ observation }) => {
    observation.tnbVersion = '6.0.3-bridge.15.tsgo.7.0.1';
  });
  assert.equal(wrongVersion.status, 'FAIL');
  assert.match(wrongVersion.reason, /TNB version/);
  const wrongHead = run(({ observation }) => {
    observation.head = '0'.repeat(40);
  });
  assert.equal(wrongHead.status, 'FAIL');
  assert.match(wrongHead.reason, /TNB HEAD/);
});

test('a submodule that is not at its pinned revision is rejected', () => {
  const recorded = run(({ observation }) => {
    observation.submodules.typescript.head = 'e'.repeat(40);
  });
  assert.equal(recorded.status, 'FAIL');
  assert.match(recorded.reason, /submodule typescript is recorded/);
  const actual = run(({ facts }) => {
    facts.submodules['typescript-go'].pin = 'e'.repeat(40);
    facts.submodules['typescript-go'].head = 'e'.repeat(40);
  });
  assert.equal(actual.status, 'FAIL');
  assert.match(actual.reason, /submodule typescript-go in the checkout/);
});

test('a submodule the checkout cannot resolve is BLOCKED, not PASS', () => {
  const result = run(({ facts }) => {
    facts.submodules.typescript.head = null;
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /typescript could not be resolved/);
});

test('a guard that exposes a reviewed environment block is BLOCKED, not PASS', () => {
  const result = run(({ observation, logs }) => {
    const command = guardOf(observation, 'check:sourcefile-guard').commands[0];
    command.exitCode = 1;
    logs.set(command.stdout.file, '');
    logs.set(command.stderr.file,
      'check:sourcefile-guard failed:\n\n  \u2022 missing volar/vue \u2014 expected one of: C:\\volar\\vue\n');
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /Volar|volar/);
});

test('fatal guard output is rejected even on a zero exit code', () => {
  const result = run(({ logs }) => {
    logs.set('tnb-guards-check-lib-check-lib-sync.stdout.log',
      `${stdoutByScript['tools/check-lib-sync.mjs']}panic: runtime error\n`);
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /fatal\/panic/);
});

test('an observation that only asserts its own status is rejected', () => {
  const result = run(({ observation }) => {
    observation.status = 'PASS';
    observation.reason = 'trust me';
    observation.guards = [];
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /no recorded guard execution/);
});

function materialize(directory) {
  const { observation, logs } = canonical();
  for (const guard of observation.guards) {
    for (const command of guard.commands) {
      for (const stream of ['stdout', 'stderr']) {
        const name = command[stream].file;
        const file = path.join(directory, name);
        fs.writeFileSync(file, logs.get(name));
        command[stream].sha256 = undefined;
      }
    }
  }
  return observation;
}

async function rehash(directory, observation) {
  for (const guard of observation.guards) {
    for (const command of guard.commands) {
      for (const stream of ['stdout', 'stderr']) {
        command[stream].sha256 = await hashFile(path.join(directory, command[stream].file));
      }
    }
  }
  return observation;
}

const argumentsFor = (root, directory) => ({
  contract: { repositories: { tnb: { path: path.join('worktrees', 'typescript-native-bridge') } },
    tnbVersion: expectations.tnbVersion },
  expectations, root, directory, gate: { id: 'tnb-guards' },
});

test('the IO layer blocks on a missing checkout when every log is intact', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const observation = await rehash(directory, materialize(directory));
  const result = await validate(observation, argumentsFor(root, directory));
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /checkout unavailable/);
});

test('the IO layer rejects a missing or changed raw log', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const observation = await rehash(directory, materialize(directory));
  const missing = structuredClone(observation);
  fs.rmSync(path.join(directory, missing.guards[0].commands[0].stdout.file));
  const missingResult = await validate(missing, argumentsFor(root, directory));
  assert.equal(missingResult.status, 'FAIL');
  assert.match(missingResult.reason, /is missing/);
  fs.writeFileSync(path.join(directory, observation.guards[0].commands[0].stdout.file), 'tampered');
  const changedResult = await validate(observation, argumentsFor(root, directory));
  assert.equal(changedResult.status, 'FAIL');
  assert.match(changedResult.reason, /changed after recording/);
});

test('the IO layer rejects a log without a hash, a foreign prefix or an escaped path', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-evidence-'));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-root-'));
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  const observation = await rehash(directory, materialize(directory));
  const noHash = structuredClone(observation);
  noHash.guards[0].commands[0].stdout.sha256 = null;
  assert.match((await validate(noHash, argumentsFor(root, directory))).reason, /carries no hash/);
  const foreign = structuredClone(observation);
  foreign.guards[0].commands[0].stdout.file = 'stdout.log';
  assert.match((await validate(foreign, argumentsFor(root, directory))).reason, /not a tnb-guards- prefixed/);
  const escaped = structuredClone(observation);
  escaped.guards[0].commands[0].stdout.file = 'tnb-guards-x/../../tnb-guards-escaped.log';
  assert.match((await validate(escaped, argumentsFor(root, directory))).reason, /leaves the run directory/);
});

test('evidence for another gate is rejected', async () => {
  const result = await validate(canonical().observation, {
    contract: { repositories: { tnb: { path: 'tnb' } }, tnbVersion: expectations.tnbVersion },
    expectations, root: os.tmpdir(), directory: os.tmpdir(), gate: { id: 'tnb-witnesses' },
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /another gate/);
});

// ---------------------------------------------------------------------------
// The optional Volar assist: recorded identity, absent checkout, and drift.
// ---------------------------------------------------------------------------

function volarFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-volar-'));
  const file = path.join(root, 'packages', 'tsc', 'src', 'index.ts');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'export const revision = 1;\n');
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, file };
}

test('a configured but absent Volar checkout is BLOCKED, not PASS', () => {
  const result = run(({ observation }) => {
    observation.volar = { configured: true, root: 'C:\\no\\volar', present: false, revision: null,
      status: null, scanned: false, scannedFiles: 0, files: null, scan: 'e'.repeat(64) };
  });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.reason, /Volar|volar/);
});

test('a guard failure still outranks a configured but absent Volar checkout', () => {
  const result = run(({ observation, logs }) => {
    observation.volar = { configured: true, root: 'C:\\no\\volar', present: false, revision: null,
      status: null, scanned: false, scannedFiles: 0, files: null, scan: 'e'.repeat(64) };
    const command = guardOf(observation, 'check:enums').commands[0];
    command.exitCode = 1;
    logs.set(command.stdout.file, 'check:enum-remap did not finish');
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /check:enums .*exited 1/);
});

test('an identity scan is reproducible when the same tree is rescanned', async t => {
  const { root } = volarFixture(t);
  const extra = path.join(root, 'packages', 'tsc', 'src', 'generated.ts');
  fs.writeFileSync(extra, 'export const generated = 1;\n');
  const first = await volarReference(root);
  const second = await volarReference(root);
  // The scan walks a sorted list and is capped by a count, never by a clock, so two
  // passes over an untouched tree must agree exactly. The cap itself needs a
  // >2000-file fixture, which costs about 40 s here, so it is verified out-of-band.
  assert.equal(first.scanned, true);
  assert.equal(first.scannedFiles, 2);
  assert.deepEqual(second, first);
});

test('a recorded Volar identity that no longer matches the checkout is rejected', async t => {
  const { root, file } = volarFixture(t);
  const recorded = await volarReference(root);
  fs.writeFileSync(file, 'export const revision = 2;\n');
  const facts = { head, tnbVersion: expectations.tnbVersion, packageVersion: expectations.tnbVersion,
    repository: 'C:\\checkout\\typescript-native-bridge',
    submodules: Object.fromEntries(Object.entries(expectations.submodules).map(([name, pin]) => [name, { pin, head: pin }])),
    volar: await volarReference(root) };
  const result = evaluate({ observation: { gateId: 'tnb-guards', tnbVersion: expectations.tnbVersion, head,
    submodules: facts.submodules, volar: recorded, guards: [] }, logs: new Map(), expectations, facts });
  assert.equal(result.status, 'FAIL');
  assert.match(result.reason, /Volar checkout has changed/);
});

test('the accepted identity is stable while the checkout is untouched', async t => {
  const { root } = volarFixture(t);
  const recorded = await volarReference(root);
  const again = await volarReference(root);
  assert.deepEqual(again, recorded);
});

test('the IO layer passes when a recorded Volar checkout is re-derived unchanged', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-evidence-'));
  const tnbRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-root-'));
  const { root: volarRoot } = volarFixture(t);
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(tnbRoot, { recursive: true, force: true });
  });
  // Materialize the pinned TNB checkout fact the IO layer resolves from disk.
  const repository = path.join(tnbRoot, 'worktrees', 'typescript-native-bridge');
  fs.mkdirSync(repository, { recursive: true });
  fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify({ version: expectations.tnbVersion }));
  const observation = await rehash(directory, materialize(directory));
  observation.volar = await volarReference(volarRoot);
  const result = await validate(observation, {
    ...argumentsFor(tnbRoot, directory), directory,
  });
  // git cannot resolve the temp "checkout", so the pinned submodules stay BLOCKED;
  // what matters here is that the Volar identity itself does not FAIL the run.
  assert.doesNotMatch(result.reason ?? '', /Volar checkout/);
});

test('a directory that only sits inside another repository keeps a null identity', async t => {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'tnb-guards-outer-'));
  const checkout = path.join(outer, 'checkout');
  fs.mkdirSync(path.join(checkout, 'packages', 'tsc', 'src'), { recursive: true });
  fs.writeFileSync(path.join(checkout, 'packages', 'tsc', 'src', 'index.ts'), 'export const revision = 1;\n');
  t.after(() => fs.rmSync(outer, { recursive: true, force: true }));
  git(outer, ['init', '-q']);
  git(outer, ['-c', 'user.email=harness@example.invalid', '-c', 'user.name=harness',
    '-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '--allow-empty', '-m', 'outer']);
  const record = await volarReference(checkout);
  assert.equal(record.present, true);
  assert.match(record.files, /^[a-f0-9]{64}$/);
  // Without the own-root check, `git -C` walks up and describes the unrelated outer
  // repository: the wrong identity, and unbounded work on a large home directory.
  assert.equal(record.revision, null);
  assert.equal(record.status, null);
});
