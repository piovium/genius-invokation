import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const codes = { PASS: 0, FAIL: 1, BLOCKED: 2, NOT_RUN: 2 };
export const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export const stable = value => JSON.stringify(value);
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}
export function inside(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\0')
    || relative.includes('\\') || path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) {
    throw new Error(`Invalid relative path: ${relative}`);
  }
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error(`Path escapes root: ${relative}`);
  let current = resolved;
  while (current !== path.resolve(root)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Control/evidence path must not be a symlink: ${current}`);
    }
    current = path.dirname(current);
  }
  return resolved;
}
export async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function evidenceManifest(directory) {
  const files = {};
  async function visit(relative = '') {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      if (['receipt.json', 'receipt.sha256'].includes(file)) continue;
      const absolute = inside(directory, file);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) files[file] = await hashFile(absolute);
      else throw new Error('Evidence must contain ordinary files only');
    }
  }
  await visit();
  return files;
}
function controlFiles(root) {
  const output = ['AGENTS.md', 'HARNESS.md', 'package.json', '.gitignore', '.gitattributes'];
  function visit(relative) {
    const absolute = inside(root, relative);
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (file === 'harness/seal.json' || file === 'harness/local.json') continue;
      if (entry.isSymbolicLink()) throw new Error(`Unsealable symlink: ${file}`);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) output.push(file);
      else throw new Error(`Unsealable file: ${file}`);
    }
  }
  visit('harness');
  visit('.github');
  return output.sort();
}
export async function makeSeal(root) {
  const files = {};
  for (const file of controlFiles(root)) files[file] = await hashFile(inside(root, file));
  return { schemaVersion: 1, digest: sha(stable(files)), files };
}
export async function verifySeal(root) {
  const expected = readJson(inside(root, 'harness/seal.json'));
  const actual = await makeSeal(root);
  if (expected.schemaVersion !== 1 || expected.digest !== sha(stable(expected.files))
    || stable(expected) !== stable(actual)) throw new Error('Harness seal mismatch: controls changed, missing or added. Independent review and resealing required.');
  return actual;
}
export function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trimEnd();
}
export function sourcePaths(repo) {
  return [...new Set(git(repo, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0').filter(Boolean))].sort();
}
// Include ignored executables/dependencies as well as sources. Follow package links,
// recording real targets; cycles are references, never silently omitted contents.
export async function treeDigest(directory, { ignoreGit = true } = {}) {
  const rows = [];
  const visited = new Set();
  async function visit(file, label) {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      const target = fs.realpathSync(file);
      rows.push([label, 'link', target]);
      if (visited.has(target)) return;
      return visit(target, `${label}@target`);
    }
    if (stat.isDirectory()) {
      const real = fs.realpathSync(file);
      if (visited.has(real)) { rows.push([label, 'ref', real]); return; }
      visited.add(real);
      rows.push([label, 'dir']);
      for (const name of fs.readdirSync(file).sort()) {
        if (ignoreGit && name === '.git') continue;
        await visit(path.join(file, name), `${label}/${name}`);
      }
    } else if (stat.isFile()) rows.push([label, stat.mode & 0o111, await hashFile(file)]);
    else throw new Error(`Unsupported executable input: ${file}`);
  }
  await visit(directory, '.');
  return { digest: sha(stable(rows)), entries: rows.length };
}
export async function snapshotRepository(root, spec) {
  const repo = inside(root, spec.path);
  if (!fs.existsSync(repo)) return { status: 'BLOCKED', reason: `Missing checkout: ${spec.path}` };
  const real = fs.realpathSync.native(repo);
  const canonical = value => process.platform === 'win32' ? value.toLowerCase() : value;
  if (canonical(fs.realpathSync.native(git(repo, ['rev-parse', '--show-toplevel']))) !== canonical(real)) {
    throw new Error(`Wrong Git root: ${spec.path}`);
  }
  git(repo, ['cat-file', '-e', `${spec.base}^{commit}`]);
  const rows = [];
  for (const relative of sourcePaths(repo)) {
    const file = path.resolve(repo, relative);
    if (!fs.existsSync(file)) rows.push([relative, 'deleted']);
    else {
      const stat = fs.lstatSync(file);
      rows.push([relative, stat.isSymbolicLink() ? fs.readlinkSync(file)
        : stat.isDirectory() ? (await treeDigest(file)).digest : await hashFile(file)]);
    }
  }
  const head = git(repo, ['rev-parse', 'HEAD']);
  const changes = git(repo, ['status', '--porcelain=v1', '--untracked-files=all']);
  const diff = git(repo, ['diff', '--binary', spec.base, '--']);
  const source = sha(stable({ head, changes, rows, diff }));
  const runtime = await treeDigest(repo);
  return { status: 'PASS', path: real, base: spec.base, head, source,
    runtime: runtime.digest, entries: runtime.entries,
    changed: head !== spec.base || !!changes || !!diff };
}
export async function snapshot(root, contract, runtimePaths = {}) {
  const repositories = {};
  // Sequential disk hashing keeps memory and I/O bounded on the real data set.
  for (const [id, spec] of Object.entries(contract.repositories)) {
    repositories[id] = await snapshotRepository(root, spec);
  }
  const runtimes = {};
  for (const [id, file] of Object.entries(runtimePaths)) {
    if (file && fs.existsSync(file)) {
      const real = fs.realpathSync.native(file);
      let runtimeRoot = path.dirname(real);
      if (id === 'node') {
        const companions = fs.readdirSync(runtimeRoot).filter(name => /\.(?:dll|so(?:\.\d+)*|dylib)$/.test(name));
        const libraries = {};
        for (const name of companions.sort()) libraries[name] = await hashFile(path.join(runtimeRoot, name));
        runtimes[id] = { path: real, sha256: await hashFile(real), libraries };
        continue;
      }
      if (id !== 'node') {
        let candidate = runtimeRoot;
        while (true) {
          if (fs.existsSync(path.join(candidate, 'package.json'))) { runtimeRoot = candidate; break; }
          const parent = path.dirname(candidate);
          if (parent === candidate) break;
          candidate = parent;
        }
      }
      const contents = await treeDigest(runtimeRoot);
      runtimes[id] = { path: real, sha256: await hashFile(real), root: runtimeRoot,
        tree: contents.digest, entries: contents.entries };
    } else runtimes[id] = { missing: file ?? true };
  }
  return { repositories, runtimes, environment: {
    platform: process.platform, arch: process.arch, node: process.version,
    variables: Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => /^(NODE_|TSGO_|TNB_|GODEBUG$|GOFLAGS$|CI$|PNPM_|npm_config_)/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, sha(value)])),
  } };
}
export function acquireLock(root) {
  const file = path.join(root, 'artifacts', 'harness.lock');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const owner = { pid: process.pid, nonce: crypto.randomUUID(), startedAt: new Date().toISOString() };
  try { fs.writeFileSync(file, stable(owner), { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // PID reuse and malformed locks are intentionally not guessed away.
    throw new Error('Harness run lock exists. Check its owner; remove only after confirming that run has ended.');
  }
  return () => {
    if (fs.existsSync(file) && readJson(file).nonce === owner.nonce) fs.unlinkSync(file);
  };
}
export const fatalPattern = /(?:FATAL ERROR:|Ineffective mark-compacts|heap out of memory|Allocation failed.{0,50}heap|(?:^|\n)panic:|fatal error:|SIGSEGV|SIGABRT|HARNESS_CHILD_LEAK|HARNESS_JOB_ERROR)/i;
export async function execute({ executable, args = [], cwd, directory, label, timeoutMs,
  limitBytes = 64 * 1024 * 1024, env = {} }) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('Command timeout required');
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid log label');
  fs.mkdirSync(directory, { recursive: true });
  const stdoutPath = path.join(directory, `${label}.stdout.log`);
  const stderrPath = path.join(directory, `${label}.stderr.log`);
  const stdout = fs.openSync(stdoutPath, 'wx');
  const stderr = fs.openSync(stderrPath, 'wx');
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let bytes = 0, fatal = false, reason = null, child, timer, cleanupTimer;
  const tails = { stdout: '', stderr: '' };
  const killTree = () => {
    if (!child?.pid) return;
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, timeout: 5000, stdio: 'ignore',
      });
    } else {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* process already exited */ }
    }
  };
  let finish;
  const completion = new Promise(resolve => { finish = resolve; });
  const abort = () => { reason ??= 'cancelled'; killTree(); };
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    let launchExecutable = executable, launchArgs = args;
    if (process.platform === 'win32' && path.isAbsolute(executable) && fs.existsSync(executable)) {
      const spec = path.join(directory, `${label}.invocation.json`);
      writeJson(spec, { executable, args, cwd });
      launchExecutable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      launchArgs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        fileURLToPath(new URL('./windows-job.ps1', import.meta.url)), '-Spec', spec];
    }
    child = spawn(launchExecutable, launchArgs, { cwd, env: { ...process.env, ...env },
      shell: false, windowsHide: true, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'] });
    for (const [stream, descriptor] of [['stdout', stdout], ['stderr', stderr]]) {
      child[stream].on('data', chunk => {
        const available = Math.max(0, limitBytes - bytes);
        fs.writeSync(descriptor, chunk.subarray(0, available));
        bytes += chunk.length;
        const text = tails[stream] + chunk.toString('utf8');
        fatal ||= fatalPattern.test(text);
        if (text.includes('HARNESS_CHILD_LEAK')) reason ??= 'child-process-leak';
        tails[stream] = text.slice(-256);
        if (bytes > limitBytes) { reason ??= 'output-limit'; killTree(); }
      });
    }
    child.once('error', error => { reason = `spawn: ${error.code ?? error.message}`; finish({ code: null, signal: null }); });
    child.once('exit', () => {
      // A finished parent retaining pipes through children is a leaked process tree.
      cleanupTimer = setTimeout(() => {
        reason ??= 'child-process-leak'; killTree();
        child.stdout.destroy(); child.stderr.destroy();
        finish({ code: child.exitCode, signal: child.signalCode });
      }, 1000);
    });
    child.once('close', (code, signal) => finish({ code, signal }));
    timer = setTimeout(() => {
      reason ??= 'timeout'; killTree();
      child.stdout.destroy(); child.stderr.destroy();
      finish({ code: child.exitCode, signal: child.signalCode });
    }, timeoutMs);
    const ended = await completion;
    return { executable, args, cwd: fs.realpathSync.native(cwd), startedAt,
      durationMs: Math.round(performance.now() - started), exitCode: ended.code,
      signal: ended.signal, reason, fatal, bytes,
      stdout: { file: path.basename(stdoutPath) }, stderr: { file: path.basename(stderrPath) } };
  } finally {
    clearTimeout(timer); clearTimeout(cleanupTimer);
    process.removeListener('SIGINT', abort); process.removeListener('SIGTERM', abort);
    fs.closeSync(stdout); fs.closeSync(stderr);
  }
}
export function processVerdict(command) {
  if (command.reason?.startsWith('spawn: ENOENT')) return 'BLOCKED';
  if (command.reason || command.signal || command.fatal || command.exitCode !== 0) return 'FAIL';
  return 'PASS';
}
export function requiredGateIds(contract, before) {
  // Conservative: a present local build or uncertain origin also requires TNB gates.
  const tnb = before.repositories.tnb;
  const changed = !tnb || tnb.status !== 'PASS' || tnb.changed
    || contract.policy.requireTnbRegression !== false;
  return contract.gates.filter(gate => !gate.condition || changed).map(gate => gate.id);
}
