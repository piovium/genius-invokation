// Linux process-tree cleanup, as a testable module.
//
// The measured editor spawns language services, and those services re-exec
// themselves. A cleanup that only signals the direct child (or only its
// process group) leaves `setsid` descendants and additional process groups
// alive. This module snapshots the real `/proc` identities of the whole
// descendant tree, signals the root process group first, then signals every
// recorded survivor by pid, and finally re-reads /proc to confirm they are
// gone. Pid reuse is detected by comparing the recorded start time, so a
// recycled pid is never mistaken for a survivor and never killed.
//
// Windows uses the existing job-object helper in `harness/windows-job.ps1`;
// this module deliberately does nothing there and reports that it did not run.
import fs from 'node:fs';
import path from 'node:path';

export const defaultProcRoot = '/proc';

export function readProcIdentity(pid, { procRoot = defaultProcRoot } = {}) {
  try {
    const stat = fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8');
    const close = stat.lastIndexOf(')');
    const fields = stat.slice(close + 2).trim().split(/\s+/);
    return {
      pid: Number(pid), state: fields[0], ppid: Number(fields[1]),
      pgid: Number(fields[2]), sid: Number(fields[3]), startTicks: fields[19],
      cmdline: fs.readFileSync(path.join(procRoot, String(pid), 'cmdline'), 'utf8').split('\0').filter(Boolean),
    };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return null;
    throw error;
  }
}

export function readProcessTable({ procRoot = defaultProcRoot } = {}) {
  const table = new Map();
  for (const entry of fs.readdirSync(procRoot)) {
    if (!/^\d+$/.test(entry)) continue;
    const identity = readProcIdentity(entry, { procRoot });
    if (identity) table.set(identity.pid, identity);
  }
  return table;
}

/** Collect the root process and every descendant, regardless of process group. */
export function collectProcessTree({ rootPid, procRoot = defaultProcRoot, table }) {
  const processes = table ?? readProcessTable({ procRoot });
  const root = processes.get(rootPid);
  if (!root) return { root: null, members: [], groups: [], escapedFromGroup: [] };
  const children = new Map();
  for (const identity of processes.values()) {
    const list = children.get(identity.ppid) ?? [];
    list.push(identity.pid);
    children.set(identity.ppid, list);
  }
  const members = [];
  const seen = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length) {
    const pid = queue.shift();
    members.push(processes.get(pid));
    for (const child of children.get(pid) ?? []) if (!seen.has(child)) { seen.add(child); queue.push(child); }
  }
  const groups = [...new Set(members.map(item => item.pgid))].sort((left, right) => left - right);
  const escapedFromGroup = members.filter(item => item.pgid !== root.pgid);
  return { root, members, groups, escapedFromGroup };
}

/**
 * Build the cleanup plan. The harness's own process, its group and its
 * ancestors are excluded so cleanup can never terminate the acceptance run.
 */
export function planProcessTermination({ rootPid, procRoot = defaultProcRoot, self = process.pid, table }) {
  const tree = collectProcessTree({ rootPid, procRoot, table });
  if (!tree.root) return { rootPid, supported: true, members: [], groupSignals: [], pidSignals: [], protected: [], empty: true };
  const processes = table ?? readProcessTable({ procRoot });
  const ancestors = new Set();
  let cursor = self;
  while (cursor > 1) {
    ancestors.add(cursor);
    const identity = processes.get(cursor);
    if (!identity) break;
    cursor = identity.ppid;
  }
  const selfGroup = processes.get(self)?.pgid ?? null;
  const safe = tree.members.filter(member => member.pid !== self && !ancestors.has(member.pid) && member.pgid !== selfGroup);
  const protectedMembers = tree.members.filter(member => !safe.includes(member));
  const groupSignals = [...new Set(safe.map(member => member.pgid))]
    .filter(pgid => pgid > 1 && pgid !== selfGroup)
    .sort((left, right) => left - right)
    .map(pgid => ({ pgid, signal: 'SIGKILL' }));
  return {
    rootPid, supported: true, root: tree.root.pid, members: safe,
    escapedFromGroup: safe.filter(member => member.pgid !== tree.root.pgid).map(member => member.pid),
    groups: tree.groups, groupSignals,
    pidSignals: safe.map(member => ({ pid: member.pid, startTicks: member.startTicks, signal: 'SIGKILL' })),
    protected: protectedMembers.map(member => member.pid),
  };
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Re-read /proc and classify each recorded member as gone, alive or reused. */
export function verifyTerminated({ members, procRoot = defaultProcRoot }) {
  const gone = [], alive = [], reused = [];
  for (const member of members) {
    const current = readProcIdentity(member.pid, { procRoot });
    if (!current) { gone.push(member.pid); continue; }
    if (current.startTicks === member.startTicks) alive.push(member.pid);
    else reused.push({ pid: member.pid, recordedStart: member.startTicks, currentStart: current.startTicks });
  }
  return { gone, alive, reused, terminated: alive.length === 0 };
}

/**
 * Terminate the whole recorded tree and prove it is gone.
 *
 * Returns a record of what was signalled and what was verified. It never
 * pretends success: surviving members are reported, and `terminated` is false.
 */
export async function terminateProcessTree({
  rootPid, procRoot = defaultProcRoot, platform = process.platform,
  kill = process.kill.bind(process), wait = delay, attempts = 5, graceMs = 200, self = process.pid, table,
}) {
  if (platform !== 'linux') {
    return { supported: false, platform, reason: 'Linux process cleanup was not executed on this platform' };
  }
  const plan = planProcessTermination({ rootPid, procRoot, self, table });
  if (!plan.supported || plan.empty) return { supported: true, ...plan, terminated: true, gone: [], alive: [], reused: [], kills: [] };
  const kills = [];
  const signal = (target, kind) => {
    try { kill(target, 'SIGKILL'); kills.push({ kind, target, delivered: true }); }
    catch (error) {
      if (error.code === 'ESRCH') kills.push({ kind, target, delivered: false, reason: 'ESRCH' });
      else throw error;
    }
  };
  for (const { pgid } of plan.groupSignals) signal(-pgid, 'group');
  await wait(graceMs);
  let verdict = verifyTerminated({ members: plan.members, procRoot });
  for (let attempt = 0; attempt < attempts && !verdict.terminated; attempt++) {
    for (const pid of verdict.alive) signal(pid, 'pid');
    await wait(graceMs);
    verdict = verifyTerminated({ members: plan.members, procRoot });
  }
  return { supported: true, rootPid, root: plan.root, members: plan.members.length,
    escapedFromGroup: plan.escapedFromGroup, protected: plan.protected,
    kills, gone: verdict.gone, alive: verdict.alive, reused: verdict.reused,
    terminated: verdict.terminated };
}

/**
 * Find every live process that belongs to one isolated VS Code launch.
 *
 * On Linux the sealed executor terminates only the direct child's process
 * group, and it does not return the child pid, so a `setsid` descendant can
 * escape a hard timeout. The launch's isolated profile and extension
 * directories are unique to that launch, so scanning `/proc/<pid>/cmdline` for
 * them finds the whole tree — including processes that left their group.
 */
export function discoverLaunchProcesses({ profile, extensionsDirectory, procRoot = defaultProcRoot, self = process.pid, table }) {
  const markers = [profile, extensionsDirectory].filter(value => typeof value === 'string' && value);
  if (!markers.length) throw new Error('A launch marker is required to discover its processes');
  const processes = table ?? readProcessTable({ procRoot });
  const matched = [...processes.values()]
    .filter(identity => identity.pid !== self && identity.cmdline.some(argument => markers.some(marker => argument.includes(marker))))
    .sort((left, right) => left.pid - right.pid);
  const matchedPids = new Set(matched.map(identity => identity.pid));
  const roots = matched.filter(identity => {
    let parent = identity.ppid;
    while (parent > 1) {
      if (matchedPids.has(parent)) return false;
      const next = processes.get(parent);
      if (!next) break;
      parent = next.ppid;
    }
    return true;
  });
  return { markers, matched, roots };
}

/**
 * Terminate every process of one launch and prove none survived.
 *
 * Windows is reported explicitly instead of being silently skipped: there the
 * sealed executor owns the whole tree through a job object with
 * KILL_ON_JOB_CLOSE and a child-leak check, so this module does not run.
 */
export async function cleanupLaunchTree({
  profile, extensionsDirectory, procRoot = defaultProcRoot, platform = process.platform,
  kill = process.kill.bind(process), wait = delay, attempts = 5, graceMs = 200, self = process.pid, table,
}) {
  if (platform !== 'linux') {
    return {
      platform, executed: false, owner: 'windows-job-object',
      reason: `The sealed executor owns process-tree termination through a Windows job object; `
        + `the Linux cleanup module does not run on ${platform}.`,
      marker: { profile, extensionsDirectory },
    };
  }
  const discovered = discoverLaunchProcesses({ profile, extensionsDirectory, procRoot, self, table });
  const results = [];
  for (const root of discovered.roots) {
    results.push(await terminateProcessTree({
      rootPid: root.pid, procRoot, platform, kill, wait, attempts, graceMs, self, table,
    }));
  }
  const remaining = discoverLaunchProcesses({ profile, extensionsDirectory, procRoot, self, table });
  return {
    platform, executed: true, owner: 'linux-cleanup-module',
    marker: { profile, extensionsDirectory },
    discovered: discovered.matched.map(identity => identity.pid),
    roots: discovered.roots.map(identity => identity.pid),
    results, survivors: remaining.matched.map(identity => identity.pid),
    terminated: remaining.matched.length === 0 && results.every(result => result.terminated),
  };
}
