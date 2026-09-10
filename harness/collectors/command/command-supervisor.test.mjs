import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { executeWithCacheRecovery, recoveryReserveMs } from '../shared/command-supervisor.mjs';
import { validateVitestResultCacheEvidence } from '../shared/vitest-result-cache.mjs';

let root = path.dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(path.join(root, 'harness/core.mjs'))) {
  const parent = path.dirname(root);
  if (parent === root) throw new Error('Harness root not found');
  root = parent;
}
const { execute, processVerdict } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'command-supervisor-'));
  t.after(() => {
    const resolved = fs.realpathSync.native(base);
    assert.equal(path.dirname(resolved), fs.realpathSync.native(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('command-supervisor-'));
    fs.rmSync(resolved, { recursive: true });
  });
  const repo = path.join(base, 'repo');
  const file = path.join(repo, 'node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const original = Buffer.from('{"version":"4.1.10","results":[[":original.test.ts",{"duration":12.5,"failed":false}]]}\n');
  fs.writeFileSync(file, original);
  const cacheDirectory = path.join(base, 'cache-evidence');
  fs.mkdirSync(cacheDirectory);
  const entries = [{ root: fs.realpathSync.native(repo), file: fs.realpathSync.native(file), keys: [':original.test.ts'] }];
  const child = path.join(base, 'actual-child.mjs');
  const helper = new URL('../shared/vitest-result-cache.mjs', import.meta.url).href;
  fs.writeFileSync(child, `import fs from 'node:fs';
import { prepareVitestResultCaches } from ${JSON.stringify(helper)};
const entries = ${JSON.stringify(entries)};
prepareVitestResultCaches(${JSON.stringify(cacheDirectory)}, entries);
const value = JSON.parse(fs.readFileSync(entries[0].file));
value.results[0][1] = { duration: 99.5, failed: true };
fs.writeFileSync(entries[0].file, JSON.stringify(value));
fs.writeFileSync(${JSON.stringify(path.join(base, 'child-start.json'))}, JSON.stringify({ pid: process.pid, mode: process.argv[2] }), { flush: true });
console.log('actual child mutated its cache');
// Deliberately no finally or exit restoration: the independent parent must
// recover from durable metadata after the actual executor terminates this child.
if (process.argv[2] === 'timeout') setInterval(() => {}, 1000);
else if (process.argv[2] === 'failure') process.exitCode = 23;
`);
  return { base, repo, child, original, cacheDirectory, entries };
}

for (const mode of ['timeout', 'failure', 'success']) {
  test(`actual supervised child ${mode} retains its outcome and restores cache bytes`, { timeout: 15000 }, async t => {
    const f = fixture(t);
    const gateTimeoutMs = 7500;
    const result = await executeWithCacheRecovery({ execute, gateTimeoutMs, cacheDirectory: f.cacheDirectory,
      executable: process.execPath, args: [f.child, mode], cwd: f.repo, directory: path.join(f.base, 'logs'),
      label: 'actual-child', limitBytes: 1024 * 1024 });
    assert.equal(result.timeoutMs, gateTimeoutMs - recoveryReserveMs);
    assert.equal(result.recoveryError, null);
    assert.equal(processVerdict(result.command), mode === 'success' ? 'PASS' : 'FAIL');
    if (mode === 'timeout') {
      assert.equal(result.command.reason, 'timeout');
      const child = JSON.parse(fs.readFileSync(path.join(f.base, 'child-start.json')));
      assert.equal(child.mode, mode);
      assert.throws(() => process.kill(child.pid, 0), error => error.code === 'ESRCH');
    } else assert.equal(result.command.exitCode, mode === 'failure' ? 23 : 0);
    const before = path.join(f.cacheDirectory, 'cache-0-before.bin');
    const after = path.join(f.cacheDirectory, 'cache-0-after.bin');
    assert.deepEqual(fs.readFileSync(before), f.original);
    assert.deepEqual(fs.readFileSync(f.entries[0].file), f.original);
    const produced = JSON.parse(fs.readFileSync(after));
    assert.deepEqual(produced.results[0][1], { duration: 99.5, failed: true });
    assert.equal(validateVitestResultCacheEvidence(f.cacheDirectory, f.entries).files.length, 1);
    assert.match(fs.readFileSync(path.join(f.base, 'logs', result.command.stdout.file), 'utf8'), /actual child mutated its cache/);
    const start = Date.parse(result.command.startedAt);
    assert.ok(Date.parse(result.startedAt) <= start);
    assert.ok(start + result.command.durationMs <= Date.parse(result.finishedAt) + 100);
  });
}

test('the supervisor cannot remove the fixed recovery reserve', async () => {
  await assert.rejects(() => executeWithCacheRecovery({ gateTimeoutMs: recoveryReserveMs }), /no recovery budget/);
});
