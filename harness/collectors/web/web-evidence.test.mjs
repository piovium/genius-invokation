import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveTrace } from './web-observations.mjs';
import { parseNativeRun } from './web-evidence.mjs';
import { validateWebSupervisor } from './web-validator.mjs';
import { recoveryReserveMs } from '../shared/command-supervisor.mjs';

let root = path.dirname(fileURLToPath(import.meta.url));
while (!existsSync(path.join(root, 'harness/probes/session-evidence.mjs'))) {
  const parent = path.dirname(root);
  if (parent === root) throw new Error('Harness root not found');
  root = parent;
}
const { validateTrace } = await import(pathToFileURL(path.join(root, 'harness/probes/session-evidence.mjs')).href);
const { processVerdict } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);

// These tests exercise rejection using a recorded real run. They are validator
// selftests only and cannot supply a product acceptance receipt.
const fixture = JSON.parse(gunzipSync(await readFile(new URL('./web-evidence.fixture.json.gz', import.meta.url))));
for (const file of fixture.files) assert.equal(createHash('sha256').update(file.text).digest('hex'), file.sha256);
const raw = JSON.parse(fixture.files.find(file => file.name === 'web-session-events.json').text);
const native = fixture.files.filter(file => /^web-native-\d+\.jsonl$/.test(file.name)).map(file => parseNativeRun(file.name, file.text));
const expectations = JSON.parse(await readFile(new URL('./web-expectations.json', import.meta.url), 'utf8'));
const options = { nonce: raw.runNonce, tnbVersion: '6.0.3-bridge.16.tsgo.7.0.2', expectations };
const copy = value => structuredClone(value);
const derived = deriveTrace(raw, native, expectations);
const validate = trace => validateTrace(trace, 'web', options);
function refusesRaw(change) {
  const altered = copy(raw), nativeCopy = copy(native);
  change(altered, nativeCopy);
  let trace;
  try { trace = deriveTrace(altered, nativeCopy, expectations).trace; }
  catch (error) { assert.equal(error.code, 'ERR_ASSERTION'); return; }
  assert.equal(validate(trace).status, 'FAIL');
}
test('the recorded real five-session trace satisfies the unchanged schema', () => {
  assert.equal(derived.trace.sessions.length, 5);
  assert.equal(derived.bindings.length, 3);
  assert.deepEqual(validate(derived.trace).details, []);
  assert.equal(validate(derived.trace).status, 'PASS');
});
test('a missing edit/repair phase is rejected', () => refusesRaw(raw => raw.phases.splice(1, 1)));
test('stale versioned diagnostic pushes are rejected', () => refusesRaw(raw => {
  for (const event of raw.editorEvents) if (event.kind === 'protocol-receive' && event.detail.method === 'textDocument/publishDiagnostics') event.detail.params.version -= 1;
}));
test('real transport results cannot be replaced by empty displayed diagnostics', () => refusesRaw(raw => {
  for (const event of raw.editorEvents) if (event.kind === 'diagnostics-displayed') event.detail.diagnostics = [];
}));
test('configured SDK URL cannot conceal a different loaded TypeScript version', () => refusesRaw(raw => {
  raw.workers.find(worker => worker.sessionId).sdk.observedVersion = '5.0.0';
}));
test('native activation without real RPC growth is rejected', () => refusesRaw((raw, native) => {
  for (const run of native) for (const row of run.rows) if (row.kind === 'counters') row.detail.rpcCount = 1;
}));
test('a native child with different semantic results is rejected', () => refusesRaw((raw, native) => {
  for (const run of native) for (const frame of run.output) if (frame.message.method === 'textDocument/publishDiagnostics') frame.message.params.diagnostics = [];
}));
test('missing actual backend processes cannot be replaced by declared identity', () => refusesRaw((raw, native) => native.splice(0)));
test('diagnostics after the retired client stops are rejected', () => {
  const trace = copy(derived.trace);
  trace.switches[0].retired.diagnosticsAfterStop.push({ stale: true });
  assert.equal(validate(trace).status, 'FAIL');
});
test('missing Worker disposal is rejected', () => {
  const trace = copy(derived.trace);
  delete trace.switches[0].retired.workerTerminatedAtMs;
  assert.equal(validate(trace).status, 'FAIL');
});
test('source snapshots cannot hide source loss on switch', () => {
  const trace = copy(derived.trace);
  trace.switches[0].after.text += '// lost original version';
  assert.equal(validate(trace).status, 'FAIL');
});
test('backend outage cannot silently select the local route', () => {
  const trace = copy(derived.trace);
  trace.outages[0].observations[0].activeRoute = 'browser-local';
  assert.equal(validate(trace).status, 'FAIL');
});
test('an old run nonce is rejected', () => {
  const trace = copy(derived.trace);
  trace.runNonce = 'not-this-run';
  assert.equal(validate(trace).status, 'FAIL');
});

async function supervisionFixture(t) {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'web-supervision-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const node = await realpath(process.execPath), nonce = 'web-supervision-fixture';
  const gate = { id: 'web', timeoutMs: 30000 };
  const collector = fileURLToPath(new URL('./web-collector.mjs', import.meta.url));
  const args = [collector, '--collector-child', nonce];
  const at = n => new Date(1700000000000 + n).toISOString();
  const child = { runNonce: nonce, gateId: gate.id, platform: process.platform, run: 'web-run.json' };
  const lifetime = { runNonce: nonce, gateId: gate.id, pid: 100, parentPid: 99, executable: node, args, cwd: directory, startedAt: at(100), finishedAt: at(500) };
  const digest = value => createHash('sha256').update(value).digest('hex');
  const supervisor = { timeoutMs: gate.timeoutMs - recoveryReserveMs, startedAt: at(0), finishedAt: at(700), recoveryError: null,
    command: { executable: node, args, cwd: directory, startedAt: at(20), durationMs: 580, exitCode: 0, signal: null, reason: null, fatal: false } };
  for (const stream of ['stdout', 'stderr']) {
    const file = `web-collector.${stream}.log`, text = stream === 'stdout' ? 'real command output\n' : '';
    await writeFile(path.join(directory, file), text);
    supervisor.command[stream] = { file, sha256: digest(text) };
  }
  async function update(key, file, value) {
    const text = JSON.stringify(value);
    await writeFile(path.join(directory, file), text);
    supervisor[key] = { file, sha256: digest(text) };
  }
  await update('childObservation', 'web-child-observation.json', child);
  await update('childLifetime', 'web-child-lifetime.json', lifetime);
  await writeFile(path.join(directory, 'web-collector.invocation.json'), JSON.stringify({ executable: node, args, cwd: directory }));
  const observation = { ...child, supervisor };
  const run = { command: { startedAt: at(200), durationMs: 200 } };
  const context = { directory, gate, nonce, packageRoot: directory, node, processVerdict };
  return { directory, observation, run, context, lifetime, update, validate: () => validateWebSupervisor(observation, run, context) };
}

test('supervisor provenance binds the original command and child lifetime', async t => {
  await (await supervisionFixture(t)).validate();
});
for (const [name, mutate] of [
  ['wrong fixed child arguments', f => { f.observation.supervisor.command.args[2] = 'another-nonce'; }],
  ['omitted cleanup reserve', f => { f.observation.supervisor.timeoutMs = f.context.gate.timeoutMs; }],
  ['recovery failure', f => { f.observation.supervisor.recoveryError = 'conflicting cache writer'; }],
  ['altered outer observation', f => { f.observation.run = 'fabricated.json'; }],
  ['changed raw supervisor log', f => writeFile(path.join(f.directory, 'web-collector.stdout.log'), 'changed')],
  ['invalid child timestamp', f => { delete f.lifetime.startedAt; return f.update('childLifetime', 'web-child-lifetime.json', f.lifetime); }],
  ['overlapping outer lifetime', f => { f.lifetime.finishedAt = new Date(1700000002000).toISOString(); return f.update('childLifetime', 'web-child-lifetime.json', f.lifetime); }],
  ['test run outside child lifetime', f => { f.run.command.durationMs = 2000; }],
]) test(`supervisor rejects ${name}`, async t => {
  const fixture = await supervisionFixture(t);
  await mutate(fixture);
  await assert.rejects(fixture.validate);
});
