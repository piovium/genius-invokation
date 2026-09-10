import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { git, hashFile, makeSeal } from '../core.mjs';

test('all sealed control bytes survive a real Git checkout including binary fixtures', async t => {
  const source = fileURLToPath(new URL('../..', import.meta.url));
  const seal = await makeSeal(source);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-checkout-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const repository = path.join(temporary, 'repository');
  const checkout = path.join(temporary, 'checkout');
  fs.mkdirSync(repository);
  fs.mkdirSync(checkout);
  for (const relative of Object.keys(seal.files)) {
    const target = path.join(repository, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, relative), target);
  }
  git(repository, ['init', '-q']);
  git(repository, ['add', '--force', '--', ...Object.keys(seal.files)]);
  git(repository, ['checkout-index', '--all', '--prefix=' + checkout.replaceAll('\\', '/') + '/']);
  for (const [relative, expected] of Object.entries(seal.files)) {
    assert.equal(await hashFile(path.join(checkout, relative)), expected,
      'Git filters or line endings change sealed control bytes: ' + relative);
  }
});
