#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { codes, sha, stable, hashFile, readJson, writeJson, inside, verifySeal,
  execute, processVerdict } from './core.mjs';
import { loadHarness, runSelection, finishRun, generateTask, reviseTask, handoff, verifyReceipt,
  builtInGateKinds } from './runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function selftest(harness) {
  const tests = Object.keys(harness.seal.files).filter(file => /^harness\/tests\/.*\.test\.mjs$/.test(file));
  if (!tests.length) throw new Error('No sealed selftests found');
  const directory = path.join(root, 'artifacts', 'selftests', crypto.randomUUID());
  const command = await execute({ executable: process.execPath,
    args: ['--test', '--test-reporter=tap', ...tests.map(file => inside(root, file))],
    cwd: root, directory, label: 'selftest', timeoutMs: 120000, limitBytes: 8 * 1024 * 1024,
    env: { NODE_TEST_CONTEXT: undefined } });
  for (const stream of ['stdout', 'stderr']) command[stream].sha256 = await hashFile(inside(directory, command[stream].file));
  const tap = fs.readFileSync(inside(directory, command.stdout.file), 'utf8');
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
    .map(key => [key, Number(tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? NaN)]));
  const status = processVerdict(command) === 'PASS' && counts.tests > 0 && counts.tests === counts.pass
    && ['fail', 'cancelled', 'skipped', 'todo'].every(key => counts[key] === 0) ? 'PASS' : 'FAIL';
  await verifySeal(root);
  const record = { schemaVersion: 1, status, controlDigest: harness.seal.digest, platform: process.platform,
    directory, command, counts, tests, finishedAt: new Date().toISOString() };
  writeJson(path.join(directory, 'receipt.json'), record);
  // The pointer is replaceable; immutable run records and their raw logs are checked at dispatch.
  fs.writeFileSync(path.join(root, 'artifacts', 'selftest.json'), `${JSON.stringify({
    file: path.join(directory, 'receipt.json'), sha256: await hashFile(path.join(directory, 'receipt.json')),
  }, null, 2)}\n`);
  return { status, counts, directory, scope: 'harness controls only; no product migration checks' };
}
async function main() {
  const [action, ...args] = process.argv.slice(2);
  const arities = { verify: [0], selftest: [0], run: [1], status: [0, 1], task: [1], revise: [1], handoff: [1], finish: [1] };
  if (!arities[action]?.includes(args.length) || args.some(arg => arg.startsWith('--'))) {
    throw new Error('Usage: node harness/cli.mjs verify | selftest | run preflight|all|GATE | status [RUN_DIRECTORY] | task ROLE | revise TASK_FILE | handoff TASK_FILE | finish RUN_DIRECTORY');
  }
  const harness = await loadHarness(root);
  if (action === 'verify') return { status: 'PASS', version: harness.contract.version, phase: harness.contract.phase,
    controlDigest: harness.seal.digest, sealedFiles: Object.keys(harness.seal.files).length };
  if (action === 'selftest') return selftest(harness);
  if (action === 'run') return runSelection(harness, args[0]);
  if (action === 'task') return generateTask(harness, args[0]);
  if (action === 'revise') return reviseTask(harness, path.resolve(root, args[0]));
  if (action === 'handoff') return handoff(harness, path.resolve(root, args[0]));
  if (action === 'finish') return finishRun(harness, args[0]);
  if (args.length) {
    const receipt = await verifyReceipt(harness, args[0]);
    return { status: 'PASS', scope: 'receipt integrity only', selection: receipt.selection,
      results: receipt.results.map(({ id, status, reason }) => ({ id, status, reason })) };
  }
  return { status: 'PASS', scope: 'configuration only', phase: harness.contract.phase,
    controlDigest: harness.seal.digest,
    gates: harness.contract.gates.map(gate => ({ id: gate.id, status: 'NOT_RUN',
      wiring: builtInGateKinds.includes(gate.kind) ? 'built-in'
        : harness.contract.adapters?.[gate.id] ? 'reviewed-adapter' : 'BLOCKED: no reviewed collector',
      ...(gate.blocked ? { blocked: gate.blocked } : {}) })) };
}
try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = codes[result.status] ?? 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ status: 'FAIL', reason: error.message }, null, 2)}\n`);
  process.exitCode = 1;
}
