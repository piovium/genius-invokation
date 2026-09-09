import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeSeal, hashFile, writeJson, readJson, git, stable } from '../core.mjs';
import { loadHarness, runSelection, verifyReceipt, finishRun, generateTask, handoff,
  validateContract } from '../runner.mjs';

const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
const collector = `import fs from 'node:fs';
const e=process.env;
fs.writeFileSync(e.HARNESS_OUTPUT, JSON.stringify({runNonce:e.HARNESS_NONCE,gateId:e.HARNESS_GATE,
controlDigest:e.HARNESS_SEAL,sourceDigest:e.HARNESS_SOURCE_DIGEST,platform:process.platform,
observed:'real-fixture-response',executedTests:1,failedTests:0,skippedTests:0}));`;
const validator = `export function validate(evidence, {expectations}) {
return {status:evidence.observed===expectations.observed?'PASS':'FAIL',reason:'semantic observation comparison'};
}`;
async function fixture(t, { phase = 'migration', count = 1, collectorText = collector, registered = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-runner-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value); };
  for (const file of ['AGENTS.md', 'HARNESS.md', 'package.json', '.gitignore', '.gitattributes', '.github/workflows/test.yml']) write(file, '{}\n');
  for (const file of ['core.mjs', 'runner.mjs', 'cli.mjs', 'windows-job.ps1']) write(`harness/${file}`, fs.readFileSync(path.join(sourceRoot, 'harness', file)));
  write('harness/tests/control.test.mjs', "import test from 'node:test'; import assert from 'node:assert/strict'; test('fixture control',()=>assert.equal(2+2,4));\n");
  write('repos/main/.gitignore', 'node_modules/\ndist/\n');
  write('repos/main/src/input.ts', 'export const n: number = 1;\n');
  write('repos/main/package.json', '{"name":"fixture"}\n');
  const repo = path.join(root, 'repos/main');
  git(repo, ['init', '-q']);
  git(repo, ['add', '.']);
  git(repo, ['-c', 'user.name=Harness Fixture', '-c', 'user.email=harness@example.invalid', 'commit', '-qm', 'fixture baseline']);
  const base = git(repo, ['rev-parse', 'HEAD']);
  const contract = { schemaVersion: 1, version: 'test', phase,
    policy: { forbidEnvironment: [], reportLimitBytes: 1024 * 1024, requiredPlatforms: [process.platform] },
    repositories: { main: { path: 'repos/main', base } }, roles: {
      integration: { repository: 'main', paths: ['src/'], gates: ['gate-0'] },
    }, adapters: {}, gates: [] };
  for (let i = 0; i < count; i++) {
    const id = `gate-${i}`;
    contract.gates.push({ id, kind: 'collector', repository: 'main', timeoutMs: 15000 });
    if (registered) contract.adapters[id] = { collector: 'harness/collectors/fixture.mjs',
      validator: 'harness/collectors/validate.mjs', expectations: 'harness/collectors/expectations.json' };
  }
  write('harness/collectors/fixture.mjs', collectorText);
  write('harness/collectors/validate.mjs', validator);
  write('harness/collectors/expectations.json', JSON.stringify({ observed: 'real-fixture-response' }));
  write('harness/contract.json', JSON.stringify(contract));
  writeJson(path.join(root, 'harness/seal.json'), await makeSeal(root));
  return { root, repo, contract, write, harness: await loadHarness(root) };
}
async function rewriteReceipt(directory, change) {
  const file = path.join(directory, 'receipt.json');
  const receipt = readJson(file);
  change(receipt);
  fs.writeFileSync(file, JSON.stringify(receipt));
  fs.writeFileSync(path.join(directory, 'receipt.sha256'), await hashFile(file));
}
test('actual approved subprocess observations can finish a complete temporary contract', async t => {
  const f = await fixture(t);
  const run = await runSelection(f.harness, 'all');
  assert.equal(run.status, 'PASS', stable(run));
  assert.equal((await finishRun(f.harness, run.directory)).status, 'PASS');
});
test('subset PASS cannot redefine the final required gate set', async t => {
  const f = await fixture(t, { count: 2 });
  const run = await runSelection(f.harness, 'gate-0');
  assert.equal(run.status, 'PASS');
  const final = await finishRun(f.harness, run.directory);
  assert.equal(final.status, 'BLOCKED');
  assert.ok(final.missing.includes('gate-1'));
  assert.ok(final.missing.some(value => value.includes('subset')));
});
test('missing registration never executes a coincidentally named collector', async t => {
  const f = await fixture(t, { registered: false, collectorText: 'throw new Error("must not run")' });
  const run = await runSelection(f.harness, 'all');
  assert.equal(run.status, 'BLOCKED');
  assert.equal(readJson(path.join(run.directory, 'receipt.json')).results[0].commands, undefined);
});
test('exit zero with no observation is BLOCKED', async t => {
  const f = await fixture(t, { collectorText: 'process.exit(0);' });
  assert.equal((await runSelection(f.harness, 'all')).status, 'BLOCKED');
});
test('raw PASS output without the contract semantic observation fails', async t => {
  const f = await fixture(t, { collectorText: collector.replace("observed:'real-fixture-response'", "status:'PASS'") });
  assert.equal((await runSelection(f.harness, 'all')).status, 'FAIL');
});
test('foreign run nonce is rejected', async t => {
  const f = await fixture(t, { collectorText: collector.replace('runNonce:e.HARNESS_NONCE', "runNonce:'copied-run'") });
  assert.equal((await runSelection(f.harness, 'all')).status, 'FAIL');
});
test('malformed/truncated collector evidence fails', async t => {
  const f = await fixture(t, { collectorText: "import fs from 'node:fs';fs.writeFileSync(process.env.HARNESS_OUTPUT,'{');" });
  assert.equal((await runSelection(f.harness, 'all')).status, 'FAIL');
});
test('harness-only phase rejects product execution, dispatch and completion', async t => {
  const f = await fixture(t, { phase: 'harness-only' });
  await assert.rejects(runSelection(f.harness, 'all'), /harness-only/);
  await assert.rejects(generateTask(f.harness, 'integration'), /harness-only/);
  await assert.rejects(finishRun(f.harness, 'unused'), /harness-only/);
});
test('source mutation during collector execution invalidates the result', async t => {
  const f = await fixture(t, { collectorText: collector + "\nfs.appendFileSync('src/input.ts','// changed\\n');" });
  const run = await runSelection(f.harness, 'all');
  assert.equal(run.status, 'FAIL');
  await assert.rejects(finishRun(f.harness, run.directory), /inputs changed/);
});
for (const [label, file] of [['source', 'src/input.ts'], ['lockfile', 'pnpm-lock.yaml'],
  ['untracked source', 'src/new.ts'], ['ignored compiler addon', 'node_modules/tnb/bridge.node'],
  ['ignored build output', 'dist/entry.js']]) {
  test(`${label} changes invalidate old evidence without a HEAD change`, async t => {
    const f = await fixture(t);
    const run = await runSelection(f.harness, 'all');
    f.write(`repos/main/${file}`, 'changed');
    await assert.rejects(verifyReceipt(f.harness, run.directory), /Stale receipt/);
  });
}
test('deleted or tampered command logs invalidate receipt', async t => {
  const f = await fixture(t);
  const run = await runSelection(f.harness, 'all');
  fs.appendFileSync(path.join(run.directory, 'gate-0.stdout.log'), 'forged');
  await assert.rejects(verifyReceipt(f.harness, run.directory), /log hash/);
  fs.unlinkSync(path.join(run.directory, 'gate-0.stdout.log'));
  await assert.rejects(verifyReceipt(f.harness, run.directory), /manifest mismatch/);
});
test('duplicate, unknown and omitted gates cannot satisfy completion even with recomputed receipt hash', async t => {
  const f = await fixture(t);
  const run = await runSelection(f.harness, 'all');
  await rewriteReceipt(run.directory, r => r.results.push(r.results[0]));
  await assert.rejects(verifyReceipt(f.harness, run.directory), /Duplicate/);
  await rewriteReceipt(run.directory, r => { r.results = [{ ...r.results[0], id: 'invented' }]; });
  await assert.rejects(verifyReceipt(f.harness, run.directory), /unknown/);
  await rewriteReceipt(run.directory, r => { r.results = []; });
  assert.equal((await finishRun(f.harness, run.directory)).status, 'BLOCKED');
});
test('approved command cannot be replaced by an exit-zero stub in a receipt', async t => {
  const f = await fixture(t);
  const run = await runSelection(f.harness, 'all');
  await rewriteReceipt(run.directory, r => { r.results[0].commands[0].args = ['-e', 'process.exit(0)']; });
  await assert.rejects(verifyReceipt(f.harness, run.directory), /approved collector/);
});
test('collector observations are revalidated instead of trusting receipt PASS', async t => {
  const f = await fixture(t);
  const run = await runSelection(f.harness, 'all');
  const file = path.join(run.directory, 'gate-0.observation.json');
  const evidence = readJson(file); evidence.observed = 'wrong';
  fs.writeFileSync(file, JSON.stringify(evidence));
  const digest = await hashFile(file);
  await rewriteReceipt(run.directory, r => {
    r.results[0].observation.sha256 = digest;
    r.artifacts['gate-0.observation.json'] = digest;
  });
  await assert.rejects(verifyReceipt(f.harness, run.directory), /current assertions/);
});
test('empty/skipped tests cannot pass a test gate', async t => {
  const f = await fixture(t, { collectorText: collector.replace('executedTests:1', 'executedTests:0') });
  f.contract.gates[0].id = 'fixture-tests';
  f.contract.adapters['fixture-tests'] = f.contract.adapters['gate-0']; delete f.contract.adapters['gate-0'];
  f.contract.roles.integration.gates = ['fixture-tests'];
  f.write('harness/contract.json', JSON.stringify(f.contract));
  f.write('harness/seal.json', JSON.stringify(await makeSeal(f.root)));
  const run = await runSelection(await loadHarness(f.root), 'all');
  assert.equal(run.status, 'FAIL');
});
test('foreign platform label and absent required Linux proof cannot finish', async t => {
  const f = await fixture(t);
  f.contract.policy.requiredPlatforms = ['win32', 'linux'];
  f.write('harness/contract.json', JSON.stringify(f.contract));
  f.write('harness/seal.json', JSON.stringify(await makeSeal(f.root)));
  const h = await loadHarness(f.root);
  const run = await runSelection(h, 'all');
  assert.equal((await finishRun(h, run.directory)).status, 'BLOCKED');
  await rewriteReceipt(run.directory, r => { r.platform = 'invented-linux'; });
  await assert.rejects(verifyReceipt(h, run.directory), /identity/);
});
test('dispatch requires current executed selftests; handoff catches renamed and untracked outside-scope files', async t => {
  const f = await fixture(t);
  await assert.rejects(generateTask(f.harness, 'integration'), /ENOENT/);
  const cli = path.join(f.root, 'harness/cli.mjs');
  const output = execFileSync(process.execPath, [cli, 'selftest'], { cwd: f.root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(JSON.parse(output).status, 'PASS');
  const task = await generateTask(f.harness, 'integration');
  f.write('repos/main/src/new.ts', 'valid scope');
  assert.equal((await handoff(f.harness, task.file)).status, 'PASS');
  f.write('repos/main/package.json', '{}');
  f.write('repos/main/中文 outside.txt', 'outside');
  const result = await handoff(f.harness, task.file);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.outside.includes('package.json'));
  assert.ok(result.outside.includes('中文 outside.txt'));
  const taskRecord = readJson(task.file);
  taskRecord.before.repositories.main.base = 'forged-base';
  fs.writeFileSync(task.file, JSON.stringify(taskRecord));
  await assert.rejects(handoff(f.harness, task.file), /baseline differs/);
  const pointer = readJson(path.join(f.root, 'artifacts/selftest.json'));
  const record = readJson(pointer.file);
  fs.appendFileSync(path.join(record.directory, record.command.stdout.file), 'tamper');
  await assert.rejects(generateTask(f.harness, 'integration'), /Selftest log changed/);
});
test('builtin engine receipts cannot launder a successful arbitrary command', async t => {
  const f = await fixture(t);
  f.contract.gates[0].kind = 'engine';
  f.write('harness/baselines/main.json', JSON.stringify({ files: [], checkPackages: [{ path: 'src' }] }));
  f.write('harness/probes/engine.mjs', fs.readFileSync(path.join(sourceRoot, 'harness/probes/engine.mjs')));
  f.write('harness/contract.json', JSON.stringify(f.contract));
  f.write('harness/seal.json', JSON.stringify(await makeSeal(f.root)));
  const h = await loadHarness(f.root);
  const run = await runSelection(h, 'all');
  // A parent directory may supply stock TypeScript; either missing or stock is
  // an honest non-PASS prerequisite. The assertion under test is the forged command.
  assert.notEqual(run.status, 'PASS', stable(run));
  await rewriteReceipt(run.directory, r => {
    const row = r.results[0]; row.status = 'PASS'; row.observations = [{ status: 'PASS' }];
    row.commands[0].exitCode = 0;
    row.commands[0].args = ['-e', 'console.log(JSON.stringify({status:"PASS"}))'];
  });
  await assert.rejects(verifyReceipt(h, run.directory), /approved collector\/probe/);
});
test('contract rejects duplicate gates, unknown references and dependency cycles', async t => {
  const f = await fixture(t);
  const duplicate = structuredClone(f.contract); duplicate.gates.push(duplicate.gates[0]);
  assert.throws(() => validateContract(duplicate), /duplicate/);
  const cycle = structuredClone(f.contract); cycle.gates[0].requires = ['gate-0'];
  assert.throws(() => validateContract(cycle), /Cyclic/);
  const unknown = structuredClone(f.contract); unknown.gates[0].requires = ['absent'];
  assert.throws(() => validateContract(unknown), /Unknown/);
});
test('preflight probes each package manager in its own repository', async t => {
  const f = await fixture(t);
  for (const id of ['gts', 'tnb']) {
    git(f.repo, ['clone', '--local', '-q', f.repo, path.join(f.root, 'repos', id)]);
    f.contract.repositories[id] = { path: `repos/${id}`, base: f.contract.repositories.main.base };
  }
  f.contract.gates[0] = { id: 'environment', kind: 'environment', repository: 'main', timeoutMs: 15000 };
  f.contract.roles.integration.gates = ['environment'];
  f.contract.adapters = {};
  for (const [name, repo, version] of [['pnpmMain', 'main', '12.0.0'], ['pnpmGts', 'gts', '11.5.2'], ['npm', 'tnb', '11.0.0']]) {
    f.write(`tools/${name}/package.json`, '{}');
    f.write(`tools/${name}/cli.mjs`, `import path from 'node:path'; if(path.basename(process.cwd())!==${JSON.stringify(repo)})process.exit(9); console.log(${JSON.stringify(version)});`);
  }
  f.write('harness/local.json', JSON.stringify({ pnpmMain: 'tools/pnpmMain/cli.mjs', pnpmGts: 'tools/pnpmGts/cli.mjs', npm: 'tools/npm/cli.mjs' }));
  f.write('harness/contract.json', JSON.stringify(f.contract));
  f.write('harness/seal.json', JSON.stringify(await makeSeal(f.root)));
  const h = await loadHarness(f.root);
  const run = await runSelection(h, 'preflight');
  const receipt = readJson(path.join(run.directory, 'receipt.json'));
  assert.notEqual(run.status, 'FAIL', stable(run));
  assert.equal(receipt.results[0].commands.length, 4);
  assert.equal(path.basename(receipt.results[0].commands[2].cwd), 'gts');
  assert.equal(path.basename(receipt.results[0].commands[3].cwd), 'tnb');
});
