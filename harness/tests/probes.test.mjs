import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { probeEngine, verifyIdentity } from '../probes/engine.mjs';
import { compareCoverage, probeCoverage } from '../probes/coverage.mjs';

const expectedVersion = '6.0.3-bridge.16.tsgo.7.0.2';
const baseline = ['packages/data/src/current.gts', 'packages/data/src/old_versions/v3.3.0.gts'];
const root = path.resolve(os.tmpdir(), 'gts-coverage-unit');

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gts-harness-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function write(directory, relative, content) {
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

test('stock package identity is rejected; matching metadata alone never passes', () => {
  assert.equal(verifyIdentity({ name: 'typescript', version: '6.0.3' }, expectedVersion).status, 'FAIL');
  assert.equal(verifyIdentity({ name: 'typescript-native-bridge', version: 'wrong' }, expectedVersion).status, 'FAIL');
  assert.equal(verifyIdentity({ name: 'typescript-native-bridge', version: expectedVersion }, expectedVersion).status, 'BLOCKED');
});

test('engine resolves the package context and rejects a stock stub without loading it', t => {
  // Unit fixture only: this stub is not evidence of any real compiler execution.
  const repo = temporary(t);
  write(repo, 'node_modules/typescript/package.json', JSON.stringify({
    name: 'typescript', version: '6.0.3', main: 'index.cjs',
  }));
  write(repo, 'node_modules/typescript/index.cjs', 'throw new Error("must not execute stock fixture");');
  const result = probeEngine({ repo, version: expectedVersion });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.details.actualName, 'typescript');
  assert.match(result.details.module.sha256, /^[a-f0-9]{64}$/);
});

test('missing compiler dependencies block instead of passing', t => {
  assert.equal(probeEngine({ repo: temporary(t), version: expectedVersion }).status, 'BLOCKED');
});

test('matching name and version without native proof cannot pass', t => {
  const repo = temporary(t);
  write(repo, 'node_modules/typescript/package.json', JSON.stringify({
    name: 'typescript-native-bridge', version: expectedVersion, main: 'index.cjs',
  }));
  // Deliberately inert unit stub: it is never labelled a compiler validation.
  write(repo, 'node_modules/typescript/index.cjs', 'module.exports = { version: "6.0.3" };');
  const result = probeEngine({ repo, version: expectedVersion });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.details.reason, /native RPC counters/);
});

test('correct-looking fake diagnostics without native execution fail', t => {
  const repo = temporary(t);
  write(repo, 'node_modules/typescript/package.json', JSON.stringify({
    name: 'typescript-native-bridge', version: expectedVersion, main: 'index.cjs',
  }));
  // Adversarial unit stub only: simulate convincing output but no native calls.
  write(repo, 'node_modules/typescript/index.cjs', `
    const fs = require("node:fs");
    const path = require("node:path");
    module.exports = {
      version: "6.0.3", sys: {}, DiagnosticCategory: { Error: 1 },
      getTsgoProfileStats: () => ({ rpcCount: 0, projectsLoaded: 0 }),
      flattenDiagnosticMessageText: (value) => value,
      getParsedCommandLineOfConfigFile: (file) => ({
        fileNames: [path.join(path.dirname(file), "fixture.ts")], options: {}, errors: [],
      }),
      createProgram: (options) => options,
      getPreEmitDiagnostics: ({ rootNames }) => {
        const source = fs.readFileSync(rootNames[0], "utf8");
        return source.includes("native-engine-witness") ? [{
          code: 2322, category: 1, file: { fileName: rootNames[0] },
          start: source.indexOf("probeValue"), length: 10, messageText: "fake diagnostic",
        }] : [];
      },
    };
  `);
  const result = probeEngine({ repo, version: expectedVersion });
  assert.equal(result.status, 'FAIL');
  assert.match(result.details.reason, /loaded bridge.node and increasing native RPC/);
});

test('semantic worker crash and hang are FAIL, never empty-result success', t => {
  for (const code of ['process.exit(73);', 'while (true) {};']) {
    const repo = temporary(t);
    write(repo, 'node_modules/typescript/package.json', JSON.stringify({
      name: 'typescript-native-bridge', version: expectedVersion, main: 'index.cjs',
    }));
    write(repo, 'node_modules/typescript/index.cjs', code);
    const result = probeEngine({ repo, version: expectedVersion, timeoutMs: 500 });
    assert.equal(result.status, 'FAIL');
    assert.match(result.details.reason, /crashed, timed out, or produced no result/);
    assert.ok(result.details.process.exitCode === 73 || result.details.process.error);
  }
});

test('coverage requires exact disk and observed paths, preserving Chinese and spaces', () => {
  const files = [...baseline, 'packages/data/src/中文 路径.gts'];
  const result = compareCoverage({ repo: root, baseline: files, actual: files,
    observed: files.map(file => path.join(root, file)) });
  assert.equal(result.status, 'PASS');
  assert.equal(result.details.observedCount, 3);
});

test('missing historical source fails even without observations', () => {
  const result = compareCoverage({ repo: root, baseline, actual: baseline.slice(0, 1) });
  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.details.missingSources, [baseline[1]]);
});

test('same-count replacement cannot satisfy source or program coverage', () => {
  const substituted = [baseline[0], 'packages/data/src/replacement.gts'];
  const disk = compareCoverage({ repo: root, baseline, actual: substituted, observed: substituted });
  assert.equal(disk.status, 'FAIL');
  assert.deepEqual(disk.details.missingSources, [baseline[1]]);
  assert.deepEqual(disk.details.unexpectedSources, [substituted[1]]);
  const program = compareCoverage({ repo: root, baseline, actual: baseline, observed: substituted });
  assert.equal(program.status, 'FAIL');
  assert.deepEqual(program.details.missingProgramFiles, [baseline[1]]);
});

test('disk inventory alone remains blocked, empty observation fails', () => {
  assert.equal(compareCoverage({ repo: root, baseline, actual: baseline }).status, 'BLOCKED');
  assert.equal(compareCoverage({ repo: root, baseline, actual: baseline, observed: [] }).status, 'FAIL');
});

test('outside-root and duplicate evidence is rejected in every input set', () => {
  for (const key of ['baseline', 'actual', 'observed']) {
    for (const invalid of ['../outside.gts', path.resolve(root, '../outside.gts'),
      'Z:\\outside.gts', baseline[0], `packages/data/src/../src/current.gts`]) {
      const data = { repo: root, baseline, actual: baseline, observed: baseline };
      data[key] = [...baseline, invalid];
      const result = compareCoverage(data);
      assert.equal(result.status, 'FAIL', `${key}: ${invalid}`);
      assert.match(result.details.reason, /outside-root|duplicate/);
    }
  }
});

test('coverage reads actual disk files and cannot accept deleted source based on supplied evidence', t => {
  const repo = temporary(t);
  for (const file of baseline) write(repo, file, 'export const value = 1;\n');
  const inventory = write(repo, 'inventory.json', JSON.stringify({ files: baseline, checkPackages: [] }));
  const observed = write(repo, 'observed.json', JSON.stringify({ files: baseline }));
  assert.equal(probeCoverage({ repo, inventory, observed }).status, 'PASS');
  fs.unlinkSync(path.join(repo, baseline[1]));
  assert.equal(probeCoverage({ repo, inventory, observed }).status, 'FAIL');
});

test('coverage ignores dependency files but malformed or unavailable observations never pass', t => {
  const repo = temporary(t);
  for (const file of baseline) write(repo, file, '');
  write(repo, 'node_modules/other/source.gts', '');
  const inventory = write(repo, 'inventory.json', JSON.stringify({ files: baseline }));
  assert.equal(probeCoverage({ repo, inventory }).status, 'BLOCKED');
  const malformed = write(repo, 'observed.json', JSON.stringify({ count: baseline.length }));
  assert.equal(probeCoverage({ repo, inventory, observed: malformed }).status, 'FAIL');
  assert.equal(probeCoverage({ repo, inventory, observed: path.join(repo, 'missing.json') }).status, 'BLOCKED');
});

test('CLI emits one JSON result and status-specific exit codes', t => {
  const repo = temporary(t);
  for (const file of baseline) write(repo, file, '');
  const inventory = write(repo, 'inventory.json', JSON.stringify({ files: baseline }));
  const observed = write(repo, 'observed.json', JSON.stringify({ files: baseline }));
  const cli = fileURLToPath(new URL('../probes/coverage.mjs', import.meta.url));
  for (const [args, status, exit] of [
    [['--repo', repo, '--inventory', inventory, '--observed', observed], 'PASS', 0],
    [['--repo', repo, '--inventory', inventory], 'BLOCKED', 2],
    [['--repo', 'relative', '--inventory', inventory], 'FAIL', 1],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, exit, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, status);
  }
});

test('contained directory links are traversed and cannot hide GTS sources', t => {
  const repo = temporary(t);
  for (const file of baseline) write(repo, file, '');
  write(repo, 'proto/schema.proto', 'syntax = "proto3";');
  fs.mkdirSync(path.join(repo, 'packages/typings'), { recursive: true });
  fs.symlinkSync(path.join(repo, 'proto'), path.join(repo, 'packages/typings/proto'), 'junction');
  const inventory = write(repo, 'inventory.json', JSON.stringify({ files: baseline }));
  const observed = write(repo, 'observed.json', JSON.stringify({ files: baseline }));
  assert.equal(probeCoverage({ repo, inventory, observed }).status, 'PASS');
  write(repo, 'proto/new.gts', '');
  const result = probeCoverage({ repo, inventory, observed });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.details.unexpectedSources.includes('packages/typings/proto/new.gts'));
});

test('outside-root, cyclic and broken inventory links remain BLOCKED', t => {
  for (const kind of ['outside', 'cycle', 'broken']) {
    const repo = temporary(t);
    for (const file of baseline) write(repo, file, '');
    const inventory = write(repo, 'inventory.json', JSON.stringify({ files: baseline }));
    const observed = write(repo, 'observed.json', JSON.stringify({ files: baseline }));
    const target = kind === 'cycle' ? repo : kind === 'outside' ? temporary(t) : path.join(repo, 'missing');
    fs.symlinkSync(target, path.join(repo, 'link'), 'junction');
    assert.equal(probeCoverage({ repo, inventory, observed }).status, 'BLOCKED', kind);
  }
});
