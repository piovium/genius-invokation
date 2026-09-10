import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashFile } from '../core.mjs';

test('file hashing reads exact bytes, detects equal-size equal-mtime edits, and rejects missing inputs', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hash-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const contents = [Buffer.alloc(0), Buffer.from('中文\r\nzero\0tail'), Buffer.alloc(65536, 251), Buffer.alloc(3 * 1024 * 1024 + 7, 197)];
  const files = contents.map((bytes, index) => {
    const file = path.join(directory, `输入 ${index}.bin`); fs.writeFileSync(file, bytes); return file;
  });
  assert.deepEqual(await Promise.all(files.map(hashFile)), contents.map(bytes => crypto.createHash('sha256').update(bytes).digest('hex')));
  const file = files[1];
  const before = fs.statSync(file);
  const originalHash = await hashFile(file);
  fs.writeFileSync(file, Buffer.alloc(before.size, 33));
  fs.utimesSync(file, before.atime, before.mtime);
  assert.equal(fs.statSync(file).size, before.size);
  assert.equal(fs.statSync(file).mtime.getTime(), before.mtime.getTime());
  assert.notEqual(await hashFile(file), originalHash);
  await assert.rejects(hashFile(path.join(directory, 'missing')), { code: 'ENOENT' });
  await assert.rejects(hashFile(directory));
});

test('hashing allows pending event-loop work for empty, small and large inputs', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hash-yield-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const bytes of [0, 32, 3 * 1024 * 1024 + 7]) {
    const file = path.join(directory, `${bytes}.bin`); fs.writeFileSync(file, Buffer.alloc(bytes, 9));
    let yielded = false;
    setImmediate(() => { yielded = true; });
    await hashFile(file);
    assert.equal(yielded, true, `Pending work starved while hashing ${bytes} bytes`);
  }
});
