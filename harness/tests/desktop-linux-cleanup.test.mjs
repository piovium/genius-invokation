// Self-tests for the shared Linux process-tree cleanup.
//
// No Linux desktop host exists on this machine, so the module is exercised
// against a fake `/proc` written on disk and a fake `kill` that really removes
// those entries. That proves the module's discovery, planning, signalling and
// verification logic without claiming a Linux acceptance run ever happened.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  cleanupLaunchTree, collectProcessTree, defaultProcRoot, discoverLaunchProcesses, planProcessTermination,
  readProcIdentity, readProcessTable, terminateProcessTree, verifyTerminated,
} from '../collectors/desktop/desktop-linux-cleanup.mjs';
import { assertLaunchCleanup } from '../collectors/desktop/desktop-validator.mjs';

const PROFILE = '/run/desktop/user-data';
const EXTENSIONS = '/run/desktop/extensions';
const SELF = 900000;

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-proc-'));
  t.after(() => fs.rmSync(fs.realpathSync.native(root), { recursive: true, force: true }));
  return root;
}

/** `/proc/<pid>/stat` with the field order the kernel really uses. */
function statLine({ pid, ppid, pgid, sid, startTicks, state = 'S' }) {
  const fields = [state, ppid, pgid, sid, ...Array(15).fill(0), startTicks, 0, 0];
  return `${pid} (fake-${pid}) ${fields.join(' ')}\n`;
}

function writeProcess(procRoot, { pid, ppid, pgid = pid, sid = pid, startTicks = 1000 + pid, cmdline }) {
  const directory = path.join(procRoot, String(pid));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'stat'), statLine({ pid, ppid, pgid, sid, startTicks }));
  fs.writeFileSync(path.join(directory, 'cmdline'), `${cmdline.join('\0')}\0`);
  return { pid, ppid, pgid, sid, startTicks, cmdline };
}

/** The launch under test: an editor, a helper and a `setsid` extension host. */
const LAUNCH = [
  { pid: 100, ppid: 7, pgid: 100, sid: 100, startTicks: 1100,
    cmdline: ['/opt/vscode/code', `--user-data-dir=${PROFILE}`, `--extensions-dir=${EXTENSIONS}`, '/worktrees/gts'] },
  { pid: 101, ppid: 100, pgid: 100, sid: 100, startTicks: 1101,
    cmdline: ['/opt/vscode/code', '--type=utility', `--user-data-dir=${PROFILE}`] },
  // A helper that called setsid: it left the launch's process group entirely.
  { pid: 102, ppid: 101, pgid: 102, sid: 102, startTicks: 1102,
    cmdline: ['/opt/vscode/code', '--type=extensionHost', `--extensions-dir=${EXTENSIONS}`] },
  // A descendant that carries no launch marker of its own.
  { pid: 103, ppid: 102, pgid: 102, sid: 102, startTicks: 1103,
    cmdline: ['/opt/vscode/node', 'tsserver.js'] },
];
const UNRELATED = { pid: 200, ppid: 7, pgid: 200, sid: 200, startTicks: 1200,
  cmdline: ['/usr/bin/unrelated', '--user-data-dir=/run/other/profile'] };

function fakeProc(t, entries = [...LAUNCH, UNRELATED]) {
  const procRoot = path.join(temporaryRoot(t), 'proc');
  fs.mkdirSync(procRoot, { recursive: true });
  for (const entry of entries) writeProcess(procRoot, entry);
  return procRoot;
}

const alive = (procRoot, pid) => fs.existsSync(path.join(procRoot, String(pid)));
const esrch = () => Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });

/**
 * A `kill` that behaves like the real one: group kills reach every live member
 * of the group, an unknown target raises ESRCH, and `killable` decides which
 * processes a signal actually removes — the rest survive, as they might on a
 * real host.
 */
function fakeKill({ procRoot, table, killable = () => true, calls = [] }) {
  const kill = (target, signal) => {
    calls.push({ target, signal });
    if (target < 0) {
      const members = [...table.values()].filter(item => item.pgid === -target && alive(procRoot, item.pid));
      if (!members.length) throw esrch();
      for (const member of members) {
        if (killable(member.pid)) fs.rmSync(path.join(procRoot, String(member.pid)), { recursive: true, force: true });
      }
      return;
    }
    if (!alive(procRoot, target)) throw esrch();
    if (killable(target)) fs.rmSync(path.join(procRoot, String(target)), { recursive: true, force: true });
  };
  return { kill, calls };
}

const noWait = async () => {};

const runCleanup = (procRoot, { killable } = {}) => {
  const table = readProcessTable({ procRoot });
  const { kill, calls } = fakeKill({ procRoot, table, ...(killable ? { killable } : {}) });
  return { table, kill, calls,
    result: cleanupLaunchTree({ profile: PROFILE, extensionsDirectory: EXTENSIONS, procRoot,
      platform: 'linux', kill, wait: noWait, self: SELF }) };
};

test('proc identities are read from the process table, and a missing pid is not an error', async t => {
  assert.equal(defaultProcRoot, '/proc');
  const procRoot = fakeProc(t);
  const table = readProcessTable({ procRoot });
  assert.ok(table instanceof Map);
  assert.equal(readProcIdentity(424242, { procRoot }), null);
  assert.throws(() => readProcessTable({ procRoot: path.join(procRoot, 'missing') }), /ENOENT/);
});

test('discovery finds the whole launch, including a setsid descendant, and nothing else', async t => {
  const procRoot = fakeProc(t);
  const table = readProcessTable({ procRoot });
  assert.deepEqual([...table.keys()].sort((a, b) => a - b), [100, 101, 102, 103, 200]);
  const identity = readProcIdentity(102, { procRoot });
  assert.deepEqual({ pid: identity.pid, ppid: identity.ppid, pgid: identity.pgid, sid: identity.sid },
    { pid: 102, ppid: 101, pgid: 102, sid: 102 });
  assert.equal(identity.startTicks, '1102');
  assert.deepEqual(identity.cmdline, LAUNCH[2].cmdline);

  const discovered = discoverLaunchProcesses({ profile: PROFILE, extensionsDirectory: EXTENSIONS, procRoot, self: SELF });
  assert.deepEqual(discovered.matched.map(item => item.pid), [100, 101, 102]);
  assert.deepEqual(discovered.roots.map(item => item.pid), [100], 'only the outermost process is a root');
  assert.deepEqual(discovered.markers, [PROFILE, EXTENSIONS]);
  assert.ok(!discovered.matched.some(item => item.pid === 200), 'an unrelated launch was matched');

  assert.throws(() => discoverLaunchProcesses({ procRoot, self: SELF }), /marker is required/);
});

test('the planned termination covers the escaped process group and protects the harness', async t => {
  const procRoot = fakeProc(t);
  const plan = planProcessTermination({ rootPid: 100, procRoot, self: SELF });
  assert.deepEqual(plan.members.map(item => item.pid), [100, 101, 102, 103]);
  assert.deepEqual(plan.groups, [100, 102]);
  assert.deepEqual(plan.escapedFromGroup, [102, 103], 'the setsid helper and its child left the launch group');
  assert.deepEqual(plan.groupSignals, [{ pgid: 100, signal: 'SIGKILL' }, { pgid: 102, signal: 'SIGKILL' }]);
  assert.deepEqual(plan.pidSignals.map(item => item.pid), [100, 101, 102, 103]);
  assert.deepEqual(plan.protected, [], 'nothing of this launch belongs to the harness');

  // A launch that shares the harness's own process group must never be signalled
  // by group, or the acceptance run would kill itself.
  const shared = fakeProc(t, [
    { pid: 300, ppid: SELF, pgid: SELF, sid: SELF, startTicks: 1300,
      cmdline: ['/opt/vscode/code', `--user-data-dir=${PROFILE}`] },
    { pid: 301, ppid: 300, pgid: SELF, sid: SELF, startTicks: 1301, cmdline: ['/opt/vscode/node', 'server.js'] },
    { pid: SELF, ppid: 1, pgid: SELF, sid: SELF, startTicks: 900, cmdline: ['node', '--test'] },
  ]);
  const guarded = planProcessTermination({ rootPid: 300, procRoot: shared, self: SELF });
  assert.deepEqual(guarded.groupSignals, [], 'the harness process group was scheduled for termination');
  assert.deepEqual(guarded.pidSignals, [], 'a member of the harness process group was scheduled for termination');
  assert.deepEqual(guarded.protected.sort((a, b) => a - b), [300, 301]);
  assert.ok(!guarded.members.some(item => item.pid === SELF));
});

test('cleanupLaunchTree terminates every root and proves no survivor', async t => {
  const procRoot = fakeProc(t);
  const { result, calls } = runCleanup(procRoot);
  const cleanup = await result;
  assert.equal(cleanup.platform, 'linux');
  assert.equal(cleanup.executed, true);
  assert.equal(cleanup.owner, 'linux-cleanup-module');
  assert.deepEqual(cleanup.discovered, [100, 101, 102]);
  assert.deepEqual(cleanup.roots, [100]);
  assert.deepEqual(cleanup.survivors, []);
  assert.equal(cleanup.terminated, true);
  assert.deepEqual(cleanup.results.map(item => item.terminated), [true]);
  assert.ok(calls.some(call => call.target === -102), 'the escaped process group was never signalled');
  assert.ok(!alive(procRoot, 100) && !alive(procRoot, 101) && !alive(procRoot, 102) && !alive(procRoot, 103));
  assert.ok(alive(procRoot, 200), 'an unrelated process was killed');
  assertLaunchCleanup({ cleanup }, 'linux-launch');
});

test('a descendant that survives is reported instead of being counted as success', async t => {
  const procRoot = fakeProc(t);
  const cleanup = await runCleanup(procRoot, { killable: pid => pid !== 103 }).result;
  assert.equal(cleanup.terminated, false, 'cleanup claimed success while a descendant lived');
  assert.deepEqual(cleanup.results[0].alive, [103]);
  assert.ok(alive(procRoot, 103));
  assert.throws(() => assertLaunchCleanup({ cleanup }, 'linux-launch'), /survived|not cleaned up/);

  // A Linux launch that records no cleanup at all must never pass either.
  assert.throws(() => assertLaunchCleanup({}, 'linux-launch'), /no process-cleanup record/);
  assert.throws(() => assertLaunchCleanup({ cleanup: { platform: 'linux', executed: true,
    owner: 'linux-cleanup-module', terminated: true, survivors: [], discovered: [] } }, 'linux-launch'),
  /no process of the Linux launch was ever discovered/);
});

test('Windows records that the sealed job object owns termination and runs nothing', async t => {
  const procRoot = fakeProc(t);
  const table = readProcessTable({ procRoot });
  const { kill, calls } = fakeKill({ procRoot, table });
  const cleanup = await cleanupLaunchTree({ profile: PROFILE, extensionsDirectory: EXTENSIONS, procRoot,
    platform: 'win32', kill, wait: noWait, self: SELF });
  assert.equal(cleanup.executed, false);
  assert.equal(cleanup.owner, 'windows-job-object');
  assert.match(cleanup.reason, /job object/);
  assert.deepEqual(calls, [], 'the Windows branch must not signal anything');
  assert.ok(alive(procRoot, 100));
  assertLaunchCleanup({ cleanup }, 'windows-launch');
  assert.throws(() => assertLaunchCleanup({ cleanup: { ...cleanup, reason: undefined } }, 'windows-launch'),
    /must state why it did not run/);

  const skipped = await terminateProcessTree({ rootPid: 100, procRoot, platform: 'darwin', kill, wait: noWait });
  assert.equal(skipped.supported, false);
  assert.match(skipped.reason, /not executed on this platform/);
});

test('a recycled pid is classified as reused, never as a survivor to kill', async t => {
  const procRoot = fakeProc(t);
  const table = readProcessTable({ procRoot });
  const members = [table.get(102)];
  // The pid was assigned again after the recorded process exited.
  writeProcess(procRoot, { ...LAUNCH[2], startTicks: 2202 });
  const verdict = verifyTerminated({ members, procRoot });
  assert.deepEqual(verdict.gone, []);
  assert.deepEqual(verdict.alive, []);
  assert.deepEqual(verdict.reused, [{ pid: 102, recordedStart: '1102', currentStart: '2202' }]);
  assert.equal(verdict.terminated, true, 'a recycled pid is not a survivor');

  const { kill, calls } = fakeKill({ procRoot, table, killable: pid => pid !== 102 });
  // The recorded identities come from the table as it was when the launch ran;
  // verification re-reads /proc and must classify the recycled pid as reused.
  const result = await terminateProcessTree({ rootPid: 100, procRoot, table, platform: 'linux', kill, wait: noWait,
    self: SELF, attempts: 2 });
  assert.equal(result.terminated, true);
  assert.deepEqual(result.reused.map(item => item.pid), [102]);
  assert.ok(!calls.some(call => call.target === 102), 'a recycled pid was signalled');
});

test('a launch with no live process is not an error', async t => {
  const procRoot = fakeProc(t, [UNRELATED]);
  const cleanup = await runCleanup(procRoot).result;
  assert.deepEqual(cleanup.discovered, []);
  assert.deepEqual(cleanup.roots, []);
  assert.deepEqual(cleanup.survivors, []);
  assert.equal(cleanup.terminated, true);
  assert.ok(alive(procRoot, 200));
});

test('the process tree is collected across process groups', async t => {
  const procRoot = fakeProc(t);
  const tree = collectProcessTree({ rootPid: 100, procRoot });
  assert.equal(tree.root.pid, 100);
  assert.deepEqual(tree.members.map(item => item.pid), [100, 101, 102, 103]);
  assert.deepEqual(tree.escapedFromGroup.map(item => item.pid), [102, 103]);
  assert.deepEqual(collectProcessTree({ rootPid: 424242, procRoot }).members, []);
});