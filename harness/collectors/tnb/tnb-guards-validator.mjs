// Validator for the tnb-guards gate.
//
// `evaluate` re-derives every claim from the raw, hash-checked guard logs and
// from the pinned inputs. It never reads a status/verdict field out of the
// observation: it checks each child's recorded exit code, parses each child's
// own completion report out of the raw log, re-reads the checked-out git
// revision and the two submodule revisions, and compares them to the reviewed
// expectations. `validate` adds the layer that confines every raw log to the
// run directory, requires its 64-digit hash and rejects a changed file.
import fs from 'node:fs';
import path from 'node:path';
import { fatalPattern, git, gitLinks, hashFile, inside } from '../../core.mjs';

const fail = reason => ({ status: 'FAIL', reason });

async function readLog(directory, reference, label) {
  if (!reference || typeof reference.file !== 'string' || !reference.file) return { error: `raw ${label} log reference is missing` };
  if (!reference.file.startsWith('tnb-guards-')) {
    return { error: `raw ${label} log ${reference.file} is not a tnb-guards- prefixed file name` };
  }
  let file;
  try { file = inside(directory, reference.file); } catch { return { error: `raw ${label} log ${reference.file} leaves the run directory` }; }
  if (!/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) return { error: `raw ${label} log ${reference.file} carries no hash` };
  if (!fs.existsSync(file)) return { error: `raw ${label} log ${reference.file} is missing` };
  if (await hashFile(file) !== reference.sha256) return { error: `raw ${label} log ${reference.file} changed after recording` };
  return { file, text: fs.readFileSync(file, 'utf8') };
}

function checkCommand(guard, spec, command, logs) {
  const failures = [];
  const blocked = [];
  if (!command || typeof command !== 'object') return { failures: [`${guard.id}: no record for ${spec.script}`], blocked };
  if (command.script !== spec.script) failures.push(`${guard.id}: command is ${command.script ?? 'missing'}, expected ${spec.script}`);
  if (command.executed === false) failures.push(`${guard.id} ${spec.script}: was not executed (${command.reason ?? 'skipped'})`);
  const stdout = logs.get(command.stdout?.file);
  const stderr = logs.get(command.stderr?.file);
  if (typeof stdout !== 'string' || typeof stderr !== 'string') {
    failures.push(`${guard.id} ${spec.script}: raw log was not read`);
    return { failures, blocked };
  }
  const combined = `${stdout}\n${stderr}`;
  if (fatalPattern.test(combined)) failures.push(`${guard.id} ${spec.script}: raw log contains fatal/panic/OOM/crash output`);
  if (!Number.isInteger(command.exitCode)) {
    failures.push(`${guard.id} ${spec.script}: recorded exit code is ${command.exitCode}`);
    return { failures, blocked };
  }
  if (command.exitCode !== 0) {
    const hit = (spec.blocked ?? []).find(entry => new RegExp(entry.pattern).test(combined));
    if (hit) blocked.push(`${guard.id}: ${hit.reason}`);
    else failures.push(`${guard.id} ${spec.script}: exited ${command.exitCode}${command.signal ? ` (${command.signal})` : command.reason ? ` (${command.reason})` : ''}`);
    return { failures, blocked };
  }
  for (const pattern of spec.forbidden ?? []) {
    if (new RegExp(pattern, 'm').test(combined)) failures.push(`${guard.id} ${spec.script}: reported failure text ${pattern} while exiting 0`);
  }
  for (const pattern of spec.required ?? []) {
    if (!new RegExp(pattern, 'm').test(combined)) failures.push(`${guard.id} ${spec.script}: did not report ${pattern}`);
  }
  for (const counter of spec.counts ?? []) {
    const match = new RegExp(counter.pattern, 'm').exec(combined);
    const value = match ? Number(match[1]) : NaN;
    if (!Number.isFinite(value)) failures.push(`${guard.id} ${spec.script}: no ${counter.label} count in its report`);
    else if (counter.min !== undefined && value < counter.min) failures.push(`${guard.id} ${spec.script}: ${counter.label}=${value} is below the reviewed minimum ${counter.min}`);
    else if (counter.max !== undefined && value > counter.max) failures.push(`${guard.id} ${spec.script}: ${counter.label}=${value} exceeds the frozen ceiling ${counter.max}`);
    else if (counter.exact !== undefined && value !== counter.exact) failures.push(`${guard.id} ${spec.script}: ${counter.label}=${value} is not the pinned ${counter.exact}`);
  }
  return { failures, blocked };
}

export function evaluate({ observation, logs, expectations, facts }) {
  if (!observation || typeof observation !== 'object') return fail('Observation is not an object');
  if (observation.gateId !== 'tnb-guards') return fail('Observation belongs to another gate');
  if (observation.tnbVersion !== expectations.tnbVersion || facts.tnbVersion !== expectations.tnbVersion
    || facts.packageVersion !== expectations.tnbVersion) {
    return fail(`TNB version is not the pinned ${expectations.tnbVersion} (observation ${observation.tnbVersion}, checkout ${facts.packageVersion})`);
  }
  if (!/^[0-9a-f]{40}$/.test(observation.head ?? '') || observation.head !== facts.head) {
    return fail(`recorded TNB HEAD ${observation.head ?? 'missing'} is not the checkout HEAD ${facts.head}`);
  }
  for (const [name, pin] of Object.entries(expectations.submodules)) {
    const recorded = observation.submodules?.[name];
    if (recorded?.pin !== pin) {
      return fail(`submodule ${name} is recorded at pin ${recorded?.pin ?? 'missing'}, expected ${pin}`);
    }
    const actual = facts.submodules?.[name];
    if (!actual?.pin || !actual?.head) {
      return { status: 'BLOCKED', reason: `submodule ${name} could not be resolved from the checkout (pin ${actual?.pin ?? 'missing'}, head ${actual?.head ?? 'missing'})` };
    }
    if (actual.pin !== pin || actual.head !== pin) {
      return fail(`submodule ${name} in the checkout is at pin ${actual.pin} / head ${actual.head}, expected ${pin}`);
    }
    if (recorded.head !== pin) {
      return fail(`submodule ${name} is recorded at head ${recorded.head ?? 'missing'}, expected ${pin}`);
    }
  }
  const failures = [];
  const blocked = [];
  for (const guard of expectations.guards) {
    const record = Array.isArray(observation.guards) ? observation.guards.find(candidate => candidate?.id === guard.id) : undefined;
    if (!record) { failures.push(`${guard.id}: no recorded guard execution`); continue; }
    if (!Array.isArray(record.commands) || record.commands.length !== guard.commands.length) {
      failures.push(`${guard.id}: executed ${Array.isArray(record.commands) ? record.commands.length : 0} of ${guard.commands.length} scripts (a skipped or hidden child cannot pass)`);
      continue;
    }
    for (const [index, spec] of guard.commands.entries()) {
      const result = checkCommand(guard, spec, record.commands[index], logs);
      failures.push(...result.failures);
      blocked.push(...result.blocked);
    }
  }
  if (failures.length) return fail(failures[0]);
  if (blocked.length) return { status: 'BLOCKED', reason: blocked[0] };
  return { status: 'PASS', reason: 'All four original TNB guards executed to completion against the pinned submodules and patches' };
}

export async function validate(evidence, { contract, expectations, root, directory, gate }) {
  if (!evidence || evidence.gateId !== gate.id) return fail('Observation belongs to another gate');
  const logs = new Map();
  for (const guard of expectations.guards) {
    const record = Array.isArray(evidence.guards) ? evidence.guards.find(candidate => candidate?.id === guard.id) : undefined;
    for (const command of record?.commands ?? []) {
      for (const stream of ['stdout', 'stderr']) {
        const reference = command?.[stream];
        if (reference?.file && logs.has(reference.file)) continue;
        const result = await readLog(directory, reference, `${guard.id} ${stream}`);
        if (result.error) return fail(result.error);
        logs.set(reference.file, result.text);
      }
    }
  }
  const repository = path.join(root, contract.repositories.tnb.path);
  if (!fs.existsSync(path.join(repository, 'package.json'))) {
    return { status: 'BLOCKED', reason: `TNB checkout unavailable: ${contract.repositories.tnb.path}` };
  }
  let facts;
  try {
    const links = gitLinks(repository, 'HEAD');
    const submodules = {};
    for (const name of Object.keys(expectations.submodules)) {
      let head = null;
      try { head = git(path.join(repository, name), ['rev-parse', 'HEAD']); } catch { head = null; }
      submodules[name] = { pin: links.get(name) ?? null, head };
    }
    facts = {
      head: git(repository, ['rev-parse', 'HEAD']),
      tnbVersion: contract.tnbVersion,
      packageVersion: JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8')).version,
      repository: fs.realpathSync.native(repository),
      submodules,
    };
  } catch (error) {
    return { status: 'BLOCKED', reason: `Cannot resolve the pinned TNB inputs from the checkout: ${error.message}` };
  }
  return evaluate({ observation: evidence, logs, expectations, facts });
}