// Raw-evidence readers and native-process bindings for the desktop gate.
//
// Nothing here decides acceptance. `readRawEvidence` opens a record that the
// collector wrote *inside* its run directory, refuses a symlink anywhere on the
// path, and re-hashes the bytes against the reference the observation carries,
// so the validator can re-derive every later conclusion from the same raw bytes
// that were recorded. The native bindings only describe what the real Electron
// services did; the validator compares them against the checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Resolve one recorded path inside the run directory, rejecting links and escapes. */
export function evidenceFile(directory, relative) {
  assert.equal(typeof relative, 'string');
  assert.ok(relative && !path.isAbsolute(relative), `Evidence path must be relative: ${relative}`);
  const file = path.resolve(directory, relative);
  const inside = path.relative(path.resolve(directory), file);
  assert.ok(inside && inside !== '..' && !inside.startsWith(`..${path.sep}`) && !path.isAbsolute(inside),
    `Evidence path leaves the run directory: ${relative}`);
  let current = path.resolve(directory);
  for (const part of inside.split(path.sep)) {
    current = path.join(current, part);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Evidence symlinks are forbidden');
  }
  return file;
}

/**
 * Read one raw record and prove it is still the bytes the observation named.
 *
 * The reference must carry a full SHA-256; a record that was rewritten, added
 * or replaced after collection therefore fails here instead of quietly feeding
 * a re-derivation with edited raw evidence.
 */
export function readRawEvidence(directory, reference) {
  assert.ok(reference && typeof reference.file === 'string', 'An evidence reference must name a file');
  assert.match(reference.sha256 ?? '', /^[a-f0-9]{64}$/, `Evidence reference for ${reference.file} carries no SHA-256`);
  const file = evidenceFile(directory, reference.file);
  assert.ok(fs.existsSync(file), `Missing evidence file ${reference.file}`);
  const bytes = fs.readFileSync(file);
  assert.equal(sha256(bytes), reference.sha256, `Evidence file ${reference.file} changed after collection`);
  return { file, sha256: reference.sha256, bytes, text: () => bytes.toString('utf8') };
}

/** Every passive native observation log in one workspace directory. */
export function readNativeRuns(directory, nonce, limitBytes = 67108864) {
  assert.ok(fs.existsSync(directory), `Missing native evidence directory ${directory}`);
  return fs.readdirSync(directory).filter(name => /^desktop-native-\d+\.jsonl$/.test(name)).map(file => {
    const location = evidenceFile(directory, file);
    assert.ok(fs.statSync(location).size <= limitBytes, 'Oversized native evidence');
    const bytes = fs.readFileSync(location);
    const rows = bytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
    const first = rows[0];
    assert.equal(first.kind, 'process');
    assert.ok(Number.isInteger(first.pid) && first.pid > 0);
    assert.equal(file, `desktop-native-${first.pid}.jsonl`, 'Native filename changed process identity');
    assert.equal(rows.filter(row => row.kind === 'process').length, 1, 'Process restarted or evidence was replayed in one native log');
    const exits = rows.filter(row => row.kind === 'exit');
    assert.ok(exits.length <= 1, 'Repeated native exit');
    if (exits.length) assert.ok(rows.slice(rows.indexOf(exits[0]) + 1)
      .every(row => ['counters', 'stdout', 'stderr'].includes(row.kind)), 'Native protocol continued after exit');
    let previous = -Infinity;
    for (const row of rows) {
      assert.equal(row.schemaVersion, 1);
      assert.equal(row.runNonce, nonce);
      assert.equal(row.pid, first.pid);
      assert.ok(Number.isFinite(row.atMs) && row.atMs >= previous);
      previous = row.atMs;
    }
    return { file, sha256: sha256(bytes), pid: first.pid, rows };
  });
}

/**
 * Bind the recorded native processes to the two measured language services.
 *
 * A service is only accepted when its own log names the TNB package, the exact
 * contract pin, a loaded native addon and the raw activation line, and when its
 * request/response counters actually moved during the measured rounds.
 */
export function bindNativeServices({ nativeRuns, report, version, activation, routes }) {
  assert.ok(Array.isArray(routes) && routes.length > 0, 'The gate must declare its required language services');
  const services = {};
  const firstObservation = report.records.find(row => row.operation === 'observation')?.at;
  const lastObservation = report.records.findLast(row => row.operation === 'observation')?.at;
  assert.ok(firstObservation <= lastObservation, 'No real editor session');
  for (const native of nativeRuns) {
    const process = native.rows[0];
    const argv = process.detail.argv;
    const basename = (argv[1] ?? '').replaceAll('\\', '/').split('/').at(-1);
    const route = basename === 'server.js' ? 'gts-lsp'
      : basename === 'tsserver.js' && !argv.includes('partialSemantic') ? 'tsserver' : null;
    if (!route) continue;
    const identityRow = native.rows.find(row => row.kind === 'identity');
    if (!identityRow) {
      const spawn = native.rows.find(row => row.kind === 'spawn-sync-start');
      if (spawn) {
        const child = nativeRuns.find(candidate => candidate.rows[0].ppid === native.pid && candidate.rows.some(row => row.kind === 'identity'));
        assert.ok(child, 'Bootstrap parent has no observed native child');
        assert.deepEqual(child.rows[0].detail.argv, argv, 'Bootstrap child changed service command');
        assert.equal(spawn.detail.executable, process.detail.execPath);
        assert.ok(spawn.detail.args.includes(argv[1]));
        assert.equal(spawn.detail.tnbGodebugReexec, '1');
        assert.match(spawn.detail.godebug, /(?:^|,)asyncpreemptoff=1(?:,|$)/);
        assert.equal(child.rows[0].detail.tnbGodebugReexec, '1');
        assert.equal(child.rows[0].detail.godebug, spawn.detail.godebug);
        assert.ok(spawn.atMs <= child.rows[0].atMs && child.rows[0].atMs < firstObservation);
        assert.ok(!native.rows.some(row => row.kind === 'ipc-in' || row.kind === 'ipc-out'), 'Bootstrap parent handled measured service messages');
        continue;
      }
      // VS Code may have started a stock server before GamingTS activated it.
      assert.ok(native.rows.every(row => row.atMs < firstObservation), 'Unidentified service remained active during measured rounds');
      continue;
    }
    assert.equal(services[route], undefined, 'Service restarted during the measured session');
    const identity = identityRow.detail;
    assert.equal(identity.packageName, 'typescript-native-bridge');
    assert.equal(identity.packageVersion, version);
    assert.ok(identity.native.length > 0);
    const counters = native.rows.filter(row => row.kind === 'counters');
    assert.ok(counters.length >= 2);
    assert.ok(counters.at(-1).detail.rpcCount > counters[0].detail.rpcCount, 'No native work was observed');
    assert.ok(native.rows.some(row => row.kind === 'ipc-in'));
    assert.ok(native.rows.some(row => row.kind === 'ipc-out'));
    const output = native.rows.filter(row => row.kind === 'stdout' || row.kind === 'stderr')
      .map(row => Buffer.from(row.detail.base64, 'base64').toString('utf8')).join('');
    assert.match(output, new RegExp(activation));
    assert.ok(!/\bpanic:|heap out of memory|FATAL ERROR|fatal error:|Unhandled Rejection/i.test(output));
    assert.ok(process.atMs <= firstObservation);
    const exit = native.rows.find(row => row.kind === 'exit');
    if (exit) assert.ok(exit.atMs >= lastObservation && exit.detail.code === 0);
    services[route] = { file: native.file, sha256: native.sha256, pid: native.pid,
      lifetime: { startedAtMs: process.atMs, lastObservedAtMs: native.rows.at(-1).atMs,
        exitedAtMs: exit?.atMs ?? null, parentPid: process.ppid },
      observedIdentity: identity, process: process.detail,
      identity: { packageName: identity.packageName, packageVersion: identity.packageVersion,
        sdkPath: identity.sdkPath, checker: 'tsgo', nativeLibraryPath: identity.native[0].path,
        nativeLoadLog: output.split(/\r?\n/).filter(line => line.includes(activation)).join('\n') } };
  }
  assert.deepEqual(Object.keys(services).sort(), [...routes].sort(), 'The measured host did not exercise exactly the required language services');
  return services;
}

// A numeric PID can be assigned again after the earlier cold start has ended.
// Use completion of the owned launch command as the conservative lifetime
// bound, even with a Node exit event; later exit handlers may still run.
export function validateDesktopLifetimes(runs) {
  const seen = new Map(), lifetimes = [];
  let priorCompletedAtMs = -Infinity;
  for (const { workspaceId, launch, nativeRuns } of runs) {
    const commandStart = Date.parse(launch.command.startedAt);
    assert.ok(Number.isSafeInteger(launch.command.durationMs) && launch.command.durationMs > 0);
    assert.ok(Number.isFinite(commandStart) && launch.startedAtMs <= commandStart);
    assert.ok(launch.completedAtMs >= commandStart && launch.completedAtMs > launch.startedAtMs);
    assert.ok(Math.abs(launch.completedAtMs - commandStart - launch.command.durationMs) <= 100,
      'Launch lifetime differs from the completed command');
    assert.ok(launch.startedAtMs >= priorCompletedAtMs, 'Cold-start launch lifetimes overlap or were replayed');
    priorCompletedAtMs = launch.completedAtMs;
    const local = new Set();
    for (const native of nativeRuns) {
      assert.ok(!local.has(native.pid), 'Process restarted or native evidence was replayed');
      local.add(native.pid);
      assert.equal(native.rows.filter(row => row.kind === 'process').length, 1, 'Process restarted in one native log');
      const first = native.rows[0], last = native.rows.at(-1);
      assert.ok(first.atMs >= commandStart && last.atMs <= launch.completedAtMs,
        'Native process evidence falls outside its actual launch lifetime');
      const exits = native.rows.filter(row => row.kind === 'exit');
      assert.ok(exits.length <= 1, 'Invalid native exit lifetime');
      if (exits.length) assert.ok(native.rows.slice(native.rows.indexOf(exits[0]) + 1)
        .every(row => ['counters', 'stdout', 'stderr'].includes(row.kind)), 'Native protocol continued after exit');
      const endedAtMs = launch.completedAtMs;
      const previous = seen.get(native.pid);
      if (previous) assert.ok(first.atMs > previous.endedAtMs, 'Numeric PID was reused while its earlier lifetime overlapped');
      const item = { workspaceId, file: native.file, sha256: native.sha256, pid: native.pid,
        startedAtMs: first.atMs, lastObservedAtMs: last.atMs, endedAtMs,
        exitEventAtMs: exits[0]?.atMs ?? null, endEvidence: 'owned-launch-completion' };
      seen.set(native.pid, item); lifetimes.push(item);
    }
  }
  return lifetimes;
}
