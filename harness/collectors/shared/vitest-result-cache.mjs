import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Draft observation helper. Call capture/restore only after the owned test
// process tree exits, while holding the coordinator's workload lock.
// This never configures Vitest, removes transform caches or validates tests.
const ownerName = 'vitest-results-owner.json';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (left, right) => process.platform === 'win32'
  ? left.toLowerCase() === right.toLowerCase() : left === right;
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeNew = (file, bytes) => fs.writeFileSync(file, bytes, { flag: 'wx', flush: true });
const jsonNew = (file, value) => writeNew(file, `${JSON.stringify(value, null, 2)}\n`);

function sourcePath(entry) {
  assert.equal(path.basename(entry.file), 'results.json', 'Only explicit Vitest results.json metadata is supported');
  assert.ok(path.isAbsolute(entry.file) && path.isAbsolute(entry.root), 'Cache paths must be absolute');
  const relative = path.relative(entry.root, entry.file);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Cache escaped its fixture');
  assert.match(relative.split(path.sep).join('/'), /^node_modules\/\.vite\/vitest\/[a-f0-9]{40}\/results\.json$/, 'Only the original default Vitest result cache path is supported');
  assert.ok(same(fs.realpathSync.native(entry.root), entry.root), 'Fixture root changed or follows a link');
  assert.ok(same(fs.realpathSync.native(path.dirname(entry.file)), path.dirname(entry.file)), 'Cache parent follows a link');
  assert.ok(fs.lstatSync(entry.file).isFile() && !fs.lstatSync(entry.file).isSymbolicLink(), 'Cache is not an existing regular file');
  return entry.file;
}

function parsedCache(bytes, keys, version, previousKeys = []) {
  const value = JSON.parse(bytes.toString('utf8'));
  assert.deepEqual(Object.keys(value).sort(), ['results', 'version'], 'Unexpected cache data fields');
  assert.ok(typeof value.version === 'string' && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(value.version), 'Invalid cache version');
  if (version !== undefined) assert.equal(value.version, version, 'Cache version changed');
  assert.ok(Array.isArray(value.results), 'Missing result rows');
  const allowed = new Set(keys);
  assert.equal(allowed.size, keys.length, 'Duplicate approved test keys');
  const observed = new Set();
  for (const row of value.results) {
    assert.ok(Array.isArray(row) && row.length === 2, 'Invalid result row');
    const [key, result] = row;
    assert.ok(typeof key === 'string' && allowed.has(key) && !observed.has(key), 'Unapproved or duplicate cache test key');
    assert.ok(result && typeof result === 'object' && !Array.isArray(result), 'Invalid result metadata');
    assert.deepEqual(Object.keys(result).sort(), ['duration', 'failed'], 'Cache contains fields beyond duration/failed');
    assert.ok(Number.isFinite(result.duration) && result.duration >= 0 && typeof result.failed === 'boolean', 'Invalid duration/failed metadata');
    observed.add(key);
  }
  assert.ok(previousKeys.every(key => observed.has(key)), 'Previously cached test was removed');
  return { version: value.version, keys: [...observed] };
}

function readOwner(directory) {
  const owner = readJson(path.join(directory, ownerName));
  assert.equal(owner.schemaVersion, 1, 'Unrecognized cache recovery record');
  assert.ok(/^[a-f0-9-]{36}$/.test(owner.nonce), 'Invalid cache owner nonce');
  assert.ok(Array.isArray(owner.entries) && owner.entries.length > 0, 'Missing explicit cache entries');
  for (const [index, entry] of owner.entries.entries()) {
    assert.equal(entry.id, `cache-${index}`, 'Cache evidence ownership changed');
    assert.ok(Array.isArray(entry.keys) && entry.keys.length > 0, 'Missing approved cache keys');
  }
  return owner;
}

export function prepareVitestResultCaches(directory, entries) {
  assert.ok(entries.length > 0, 'Supply the exact prepared cache files');
  assert.ok(!fs.existsSync(path.join(directory, ownerName)), 'Preserve previous cache evidence');
  const nonce = crypto.randomUUID();
  const seen = new Set();
  const prepared = entries.map((entry, index) => {
    sourcePath(entry);
    const identity = process.platform === 'win32' ? entry.file.toLowerCase() : entry.file;
    assert.ok(!seen.has(identity), 'Duplicate cache path');
    seen.add(identity);
    assert.ok(Array.isArray(entry.keys) && entry.keys.length > 0, 'Supply independently approved test keys');
    const original = fs.readFileSync(entry.file);
    const parsed = parsedCache(original, entry.keys);
    const id = `cache-${index}`;
    writeNew(path.join(directory, `${id}-before.bin`), original);
    return { id, root: entry.root, file: entry.file, keys: entry.keys, originalKeys: parsed.keys,
      version: parsed.version, originalSha256: hash(original) };
  });
  jsonNew(path.join(directory, ownerName), { schemaVersion: 1, nonce, entries: prepared });
  return { nonce, files: prepared.map(entry => entry.file) };
}

function originalBytes(directory, entry) {
  const bytes = fs.readFileSync(path.join(directory, `${entry.id}-before.bin`));
  assert.equal(hash(bytes), entry.originalSha256, 'Original cache evidence changed');
  const parsed = parsedCache(bytes, entry.keys, entry.version);
  assert.deepEqual(parsed.keys, entry.originalKeys, 'Original cache key identity changed');
  return bytes;
}

function captureOne(directory, entry) {
  originalBytes(directory, entry);
  const afterFile = path.join(directory, `${entry.id}-after.json`);
  if (fs.existsSync(afterFile)) {
    const record = readJson(afterFile);
    assert.equal(record.id, entry.id, 'Generated cache ownership changed');
    const bytes = fs.readFileSync(path.join(directory, `${entry.id}-after.bin`));
    assert.equal(hash(bytes), record.sha256, 'Generated cache evidence changed');
    parsedCache(bytes, entry.keys, entry.version, entry.originalKeys);
    return record;
  }
  const bytes = fs.readFileSync(sourcePath(entry));
  // Preserve the observed bytes even when an interrupted writer left invalid
  // JSON. Invalid/unapproved content blocks restoration instead of being lost.
  const observedFile = path.join(directory, `${entry.id}-after.bin`);
  if (fs.existsSync(observedFile)) assert.ok(fs.readFileSync(observedFile).equals(bytes), 'Uncommitted generated cache evidence differs from current file');
  else writeNew(observedFile, bytes);
  parsedCache(bytes, entry.keys, entry.version, entry.originalKeys);
  const record = { id: entry.id, sha256: hash(bytes), capturedAt: new Date().toISOString() };
  jsonNew(afterFile, record);
  return record;
}

export function captureVitestResultCaches(directory) {
  const owner = readOwner(directory);
  const errors = [];
  for (const entry of owner.entries) {
    try { captureOne(directory, entry); }
    catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Could not preserve all generated Vitest result caches');
}

export function restoreVitestResultCaches(directory) {
  if (!fs.existsSync(path.join(directory, ownerName))) return;
  const owner = readOwner(directory);
  const errors = [];
  for (const entry of owner.entries) {
    try {
      const original = originalBytes(directory, entry);
      const after = captureOne(directory, entry);
      const file = sourcePath(entry);
      const current = fs.readFileSync(file);
      if (hash(current) === entry.originalSha256) continue;
      if (hash(current) !== after.sha256) {
        writeNew(path.join(directory, `${entry.id}-conflict-${crypto.randomUUID()}.bin`), current);
        throw new Error(`Concurrent cache change preserved: ${file}`);
      }
      const temporary = path.join(path.dirname(file), `.harness-cache-${owner.nonce}-${entry.id}.tmp`);
      if (fs.existsSync(temporary)) {
        assert.ok(fs.lstatSync(temporary).isFile() && !fs.lstatSync(temporary).isSymbolicLink(), 'Cache restore staging path changed');
        assert.ok(fs.readFileSync(temporary).equals(original), 'Interrupted cache staging bytes need investigation');
      } else writeNew(temporary, original);
      // Do not overwrite a second writer between capture and restoration.
      assert.equal(hash(fs.readFileSync(sourcePath(entry))), after.sha256, 'Cache changed during restoration');
      fs.renameSync(temporary, file);
      assert.ok(fs.readFileSync(file).equals(original), 'Cache bytes were not restored');
    } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Some Vitest result caches require investigation; other owned caches were restored');
}

// Independently verify captured evidence against the caller's reviewed source
// inventory. This function never creates, captures, repairs or restores files.
export function validateVitestResultCacheEvidence(directory, expectedEntries) {
  const owner = readOwner(directory);
  assert.equal(owner.entries.length, expectedEntries.length, 'Cache evidence omits or adds an approved cache');
  const evidence = [];
  for (const [index, entry] of owner.entries.entries()) {
    const expected = expectedEntries[index];
    assert.equal(entry.root, expected.root, 'Cache fixture differs from approved input');
    assert.equal(entry.file, expected.file, 'Cache file differs from approved input');
    assert.deepEqual([...entry.keys].sort(), [...expected.keys].sort(), 'Cache keys differ from independent test inventory');
    const original = originalBytes(directory, entry);
    const after = readJson(path.join(directory, `${entry.id}-after.json`));
    assert.equal(after.id, entry.id, 'Generated cache record belongs to another input');
    assert.ok(Number.isFinite(Date.parse(after.capturedAt)), 'Missing cache capture time');
    const generated = fs.readFileSync(path.join(directory, `${entry.id}-after.bin`));
    assert.equal(hash(generated), after.sha256, 'Generated cache hash changed');
    parsedCache(generated, expected.keys, entry.version, entry.originalKeys);
    assert.ok(fs.readFileSync(sourcePath(entry)).equals(original), 'Current cache is not the original byte sequence');
    evidence.push({ file: entry.file, beforeSha256: entry.originalSha256, afterSha256: after.sha256 });
  }
  return { nonce: owner.nonce, files: evidence };
}
