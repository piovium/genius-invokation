// Registered collector for the tnb-guards gate.
//
// It runs the TNB repository's four existing guard scripts (`check:lib`,
// `check:enums`, `check:go-as-guards`, `check:sourcefile-guard`) as bounded,
// separately observed children inside the pinned worktree, ties the run to the
// actual pinned inputs (git HEAD, the two submodule revisions and the exact
// bridge version), and writes one observation. It never decides PASS/FAIL: the
// validator re-derives every claim from the raw, hash-matched logs and from git.
//
// The collector exits zero even when a guard fails, and records the raw child
// result; that keeps "a guard could not run in this environment" a BLOCKED
// verdict the validator can justify, and never a PASS. An internal collector
// error (missing runner environment, unreadable contract) is a hard failure.
import fs from 'node:fs';
import path from 'node:path';

const e = process.env;
const { execute, git, gitLinks, hashFile, readJson, writeJson, processVerdict,
  volarReference, volarReferenceMatches } = await import(new URL('../../core.mjs', import.meta.url).href);

const required = ['HARNESS_ROOT', 'HARNESS_RUN_DIRECTORY', 'HARNESS_OUTPUT', 'HARNESS_NODE',
  'HARNESS_NONCE', 'HARNESS_GATE', 'HARNESS_SEAL', 'HARNESS_SOURCE_DIGEST'];
const slug = value => value.replace(/\.mjs$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

function submoduleRevisions(repo, names) {
  const links = gitLinks(repo, 'HEAD');
  const revisions = {};
  for (const name of names) {
    let head = null;
    try { head = git(path.join(repo, name), ['rev-parse', 'HEAD']); } catch { head = null; }
    revisions[name] = { pin: links.get(name) ?? null, head };
  }
  return revisions;
}

async function collect() {
  const observation = {
    runNonce: e.HARNESS_NONCE,
    gateId: e.HARNESS_GATE,
    controlDigest: e.HARNESS_SEAL,
    sourceDigest: e.HARNESS_SOURCE_DIGEST,
    platform: process.platform,
  };
  try {
    for (const name of required) if (!e[name]) throw new Error(`Missing ${name}`);
    if (e.HARNESS_GATE !== 'tnb-guards') throw new Error('TNB guard collector requested for another gate');
    const contract = readJson(path.join(e.HARNESS_ROOT, 'harness/contract.json'));
    const expectations = readJson(new URL('./tnb-guards-expectations.json', import.meta.url));
    const gate = contract.gates.find(candidate => candidate.id === 'tnb-guards');
    if (!gate || gate.kind !== 'tnb-guards' || gate.repository !== 'tnb') throw new Error('Unreviewed TNB guard gate');
    const repo = path.join(e.HARNESS_ROOT, contract.repositories.tnb.path);
    if (!fs.existsSync(path.join(repo, 'package.json'))) throw new Error(`Missing TNB checkout: ${repo}`);
    // The runner resolves the optional machine-local Volar checkout from
    // harness/local.json and exports it here. It is recorded as a bounded
    // identity so a changed checkout invalidates the run, and it is passed to
    // the guard as the guard's own VOLAR_ROOT override only when the directory
    // is really present. When it is absent the variable is omitted and the
    // guard's honest "missing volar/vue" branch runs and BLOCKS the gate.
    const volarRoot = e.HARNESS_VOLAR_ROOT || null;
    const volarBefore = await volarReference(volarRoot);
    const volarEnvironment = volarBefore.present ? { VOLAR_ROOT: volarBefore.root } : {};

    observation.runDirectory = e.HARNESS_RUN_DIRECTORY;
    observation.repository = repo;
    observation.runtime = { node: e.HARNESS_NODE, manager: e.HARNESS_MANAGER ?? null, npm: e.HARNESS_NPM ?? null };
    observation.tnbVersion = contract.tnbVersion;
    observation.head = git(repo, ['rev-parse', 'HEAD']);
    observation.submodules = submoduleRevisions(repo, Object.keys(expectations.submodules));
    observation.volar = volarBefore;

    const started = Date.now();
    observation.guards = [];
    for (const guard of expectations.guards) {
      const record = { id: guard.id, exitCode: 0, durationMs: 0, commands: [] };
      for (const spec of guard.commands) {
        const label = `${gate.id}-${slug(guard.id)}-${slug(path.basename(spec.script))}`;
        const remaining = gate.timeoutMs - (Date.now() - started);
        if (remaining <= 0) {
          record.exitCode = 1;
          record.commands.push({ name: label, script: spec.script, executed: false, reason: 'gate deadline elapsed' });
          continue;
        }
        const command = await execute({
          executable: e.HARNESS_NODE, args: [spec.script], cwd: repo,
          directory: e.HARNESS_RUN_DIRECTORY, label, timeoutMs: remaining,
          limitBytes: contract.policy.reportLimitBytes, env: volarEnvironment,
        });
        for (const stream of ['stdout', 'stderr']) {
          command[stream].sha256 = await hashFile(path.join(e.HARNESS_RUN_DIRECTORY, command[stream].file));
        }
        record.exitCode ||= processVerdict(command) === 'PASS' ? 0 : 1;
        record.durationMs += command.durationMs;
        record.commands.push({
          name: label, script: spec.script, executed: true, args: command.args,
          executable: command.executable, cwd: command.cwd, exitCode: command.exitCode,
          signal: command.signal, reason: command.reason, fatal: command.fatal,
          durationMs: command.durationMs,
          stdout: { file: command.stdout.file, sha256: command.stdout.sha256 },
          stderr: { file: command.stderr.file, sha256: command.stderr.sha256 },
        });
      }
      observation.guards.push(record);
    }
    // A guard that wrote into a present checkout would change its identity
    // mid-run; record that fact instead of letting a later reader discover it.
    observation.volarAfter = await volarReference(volarRoot);
    try { observation.volarChangedDuringRun = volarReferenceMatches(volarBefore, observation.volarAfter, volarBefore.root) !== null; }
    catch { observation.volarChangedDuringRun = true; }
    console.log(`tnb-guards: ${observation.guards.length} guards, volar=${volarBefore.present ? 'present' : 'absent'}, ${observation.head}`);
  } catch (error) {
    observation.error = error.stack ?? String(error);
    console.error(observation.error);
    process.exitCode = 1;
  } finally {
    if (e.HARNESS_OUTPUT) writeJson(e.HARNESS_OUTPUT, observation);
  }
}

await collect();