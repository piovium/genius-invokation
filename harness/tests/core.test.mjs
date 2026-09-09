import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import {
  acquireLock,
  execute,
  git,
  makeSeal,
  processVerdict,
  snapshot,
  snapshotRepository,
  sourcePaths,
  treeDigest,
  verifySeal,
} from "../core.mjs";

test('task submodule fingerprints bind sources while acceptance still binds ignored runtime files', async t => {
  const root = temporary(t);
  const repo = path.join(root, 'repo');
  const child = path.join(repo, 'vendor');
  write(root, 'repo/vendor/.gitignore', 'node_modules/\ndist/\n');
  write(root, 'repo/vendor/source.ts', 'export const n = 1;\n');
  const commit = directory => {
    git(directory, ['add', '.']);
    git(directory, ['-c', 'user.name=Harness Fixture', '-c', 'user.email=harness@example.invalid', 'commit', '-qm', 'fixture']);
    return git(directory, ['rev-parse', 'HEAD']);
  };
  git(child, ['init', '-q']); commit(child);
  git(repo, ['init', '-q']); const base = commit(repo);
  const spec = { path: 'repo', base };
  const taskBefore = await snapshotRepository(root, spec, { includeRuntime: false });
  const acceptanceBefore = await snapshotRepository(root, spec);
  write(root, 'repo/vendor/node_modules/sdk/bridge.node', 'ignored native version one');
  write(root, 'repo/vendor/dist/compiler.js', 'ignored compiler version one');
  const taskAfter = await snapshotRepository(root, spec, { includeRuntime: false });
  const acceptanceAfter = await snapshotRepository(root, spec);
  assert.equal(taskBefore.source, taskAfter.source);
  assert.equal(taskAfter.runtime, null);
  assert.notEqual(acceptanceBefore.runtime, acceptanceAfter.runtime);
  write(root, 'repo/vendor/source.ts', 'export const n = 2;\n');
  const edited = await snapshotRepository(root, spec, { includeRuntime: false });
  assert.notEqual(taskAfter.source, edited.source);
  write(root, 'repo/vendor/new.ts', 'export const untracked = true;\n');
  assert.notEqual(edited.source, (await snapshotRepository(root, spec, { includeRuntime: false })).source);
});

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gts-core-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  return root;
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function run(root, code, options = {}) {
  return execute({
    executable: process.execPath,
    args: ["-e", code],
    cwd: root,
    directory: path.join(root, "logs"),
    label: "command",
    timeoutMs: 10000,
    ...options,
  });
}

function running(pid) {
  try {
    process.kill(pid, 0);
    // A reparented Linux zombie has exited and cannot hold pipes or execute work.
    if (process.platform === "linux") {
      try {
        const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
        if (/^State:\s+Z/m.test(status)) return false;
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    }
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForExit(pid, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (running(pid) && Date.now() < deadline) await delay(25);
  return !running(pid);
}

test("execute records real stdout, stderr and successful exit", async (t) => {
  const root = temporary(t);
  const result = await run(root, 'process.stdout.write("真实 output\\n"); process.stderr.write("diagnostic log\\n");');
  assert.equal(processVerdict(result), "PASS");
  assert.equal(result.exitCode, 0);
  assert.equal(result.reason, null);
  assert.equal(result.fatal, false);
  assert.equal(result.cwd, fs.realpathSync.native(root));
  assert.equal(fs.readFileSync(path.join(root, "logs", result.stdout.file), "utf8"), "真实 output\n");
  assert.equal(fs.readFileSync(path.join(root, "logs", result.stderr.file), "utf8"), "diagnostic log\n");
  assert.ok(result.bytes > 0);
});

test("execute rejects a genuine nonzero process exit", async (t) => {
  const result = await run(temporary(t), 'process.stderr.write("type error\\n"); process.exitCode = 7;');
  assert.equal(result.exitCode, 7);
  assert.equal(processVerdict(result), "FAIL");
});

test("panic split across output chunks still fails when wrapper exits zero", async (t) => {
  const root = temporary(t);
  const result = await run(root, 'process.stderr.write("pa"); setTimeout(() => process.stderr.write("nic: native failure\\n"), 25);');
  assert.equal(result.exitCode, 0);
  assert.equal(result.fatal, true);
  assert.equal(processVerdict(result), "FAIL");
  assert.equal(fs.readFileSync(path.join(root, "logs", result.stderr.file), "utf8"), "panic: native failure\n");
});

test("a hanging process has a bounded FAIL result and is terminated", async (t) => {
  const root = temporary(t);
  const pidFile = path.join(root, "owned.pid");
  let pid;
  try {
    const result = await run(root, 'require("node:fs").writeFileSync(process.env.TEST_PID_FILE, String(process.pid)); setInterval(() => {}, 1000);', {
      timeoutMs: 4000,
      env: { TEST_PID_FILE: pidFile },
    });
    assert.equal(result.reason, "timeout");
    assert.equal(processVerdict(result), "FAIL");
    assert.ok(result.durationMs < 15000, `timeout took ${result.durationMs} ms`);
    if (fs.existsSync(pidFile)) {
      pid = Number(fs.readFileSync(pidFile, "utf8"));
      assert.ok(await waitForExit(pid), "timed out process remains alive");
    }
  } finally {
    if (pid && running(pid)) process.kill(pid, "SIGKILL");
  }
});

test("output budget truncates logs and marks output-limit, never PASS", async (t) => {
  const root = temporary(t);
  const result = await run(root, 'process.stdout.write("x".repeat(131072)); setInterval(() => {}, 1000);', {
    limitBytes: 1024,
  });
  assert.equal(result.reason, "output-limit");
  assert.equal(processVerdict(result), "FAIL");
  assert.ok(result.bytes > 1024);
  const stdoutBytes = fs.statSync(path.join(root, "logs", result.stdout.file)).size;
  const stderrBytes = fs.statSync(path.join(root, "logs", result.stderr.file)).size;
  assert.equal(stdoutBytes + stderrBytes, 1024);
});

test("missing executable is explicit BLOCKED with an ENOENT record", async (t) => {
  const root = temporary(t);
  const result = await run(root, "", { executable: path.join(root, "does-not-exist"), args: [] });
  assert.equal(processVerdict(result), "BLOCKED");
  assert.equal(result.reason, "spawn: ENOENT");
  assert.equal(result.exitCode, null);
});

test("an exited parent with a child retaining pipes fails and cleans its descendant", async (t) => {
  const root = temporary(t);
  const childFile = write(root, "owned-child.cjs", `
    require("node:fs").writeFileSync(process.env.TEST_PID_FILE, String(process.pid));
    process.stdout.on("error", () => {});
    setInterval(() => process.stdout.write("still-alive\\n"), 200);
    process.send("ready");
  `);
  const pidFile = path.join(root, "descendant.pid");
  let pid;
  try {
    const result = await run(root, `
      const { spawn } = require("node:child_process");
      const child = spawn(process.execPath, [process.env.TEST_CHILD_FILE], {
        stdio: ["ignore", "inherit", "inherit", "ipc"], windowsHide: true,
        // Windows libuv otherwise owns its own kill-on-close child job, which
        // removes the leak before the harness can observe it. The outer harness
        // job must also contain children detached from that Node-specific job.
        detached: process.platform === "win32",
      });
      child.once("message", () => {
        child.disconnect();
        child.unref();
        process.exit(0);
      });
    `, { env: { TEST_CHILD_FILE: childFile, TEST_PID_FILE: pidFile } });
    pid = Number(fs.readFileSync(pidFile, "utf8"));
    if (processVerdict(result) !== "FAIL") {
      t.diagnostic(JSON.stringify({ exitCode: result.exitCode, reason: result.reason,
        fatal: result.fatal, descendantRunning: running(pid),
        stderr: fs.readFileSync(path.join(root, "logs", result.stderr.file), "utf8") }));
    }
    assert.equal(processVerdict(result), "FAIL");
    assert.equal(result.reason, "child-process-leak");
    assert.ok(await waitForExit(pid), `owned descendant ${pid} remains running after tree cleanup`);
  } finally {
    // Kill only the exact fixture child we spawned, including on a failed assertion.
    if (pid && running(pid)) {
      process.kill(pid, "SIGKILL");
      await waitForExit(pid);
    }
  }
});

test("active run lock rejects a second holder without altering ownership", (t) => {
  const root = temporary(t);
  const unlock = acquireLock(root);
  const file = path.join(root, "artifacts", "harness.lock");
  const before = fs.readFileSync(file, "utf8");
  assert.throws(() => acquireLock(root), /lock exists/);
  assert.equal(fs.readFileSync(file, "utf8"), before);
  unlock();
  assert.equal(fs.existsSync(file), false);
});

test("unlock never deletes a lock acquired by a different owner", (t) => {
  const root = temporary(t);
  const releaseFirst = acquireLock(root);
  const file = path.join(root, "artifacts", "harness.lock");
  fs.unlinkSync(file);
  const releaseSecond = acquireLock(root);
  const successor = fs.readFileSync(file, "utf8");
  releaseFirst();
  assert.equal(fs.readFileSync(file, "utf8"), successor);
  releaseSecond();
  assert.equal(fs.existsSync(file), false);
});

test("sourcePaths includes untracked sources while treeDigest also binds ignored runtime inputs", async (t) => {
  const repo = temporary(t);
  git(repo, ["init", "--quiet"]);
  write(repo, ".gitignore", "node_modules/\ndist/\n");
  write(repo, "src/tracked.gts", "export const card = 1;\n");
  git(repo, ["add", ".gitignore", "src/tracked.gts"]);
  write(repo, "src/中文 new.gts", "export const card = 2;\n");
  write(repo, "node_modules/typescript/lib/typescript.js", "original compiler");
  write(repo, "node_modules/tnb/native/bridge.node", "original native fixture");
  write(repo, "dist/output.js", "original bundle");
  assert.deepEqual(sourcePaths(repo), [".gitignore", "src/tracked.gts", "src/中文 new.gts"].sort());
  let before = await treeDigest(repo);
  for (const file of ["node_modules/typescript/lib/typescript.js",
    "node_modules/tnb/native/bridge.node", "dist/output.js", "src/中文 new.gts"]) {
    const original = fs.readFileSync(path.join(repo, file), "utf8");
    // Keep the byte count stable: a size-only inventory must not satisfy this test.
    write(repo, file, original.replace("original", "modified").replace(" = 2", " = 3"));
    const after = await treeDigest(repo);
    assert.notEqual(after.digest, before.digest, `runtime/source change was missed: ${file}`);
    assert.equal(after.entries, before.entries);
    before = after;
  }
  write(repo, ".git/unrelated-runtime-test", "Git internals must not invalidate source/runtime contents");
  assert.equal((await treeDigest(repo)).digest, before.digest);
});

test("treeDigest hashes linked ignored dependency contents", async (t) => {
  const fixture = temporary(t);
  const repo = path.join(fixture, "repo");
  const dependency = path.join(fixture, "store", "dependency");
  write(repo, "src/main.ts", "export {};\n");
  write(dependency, "index.js", "exports.value = 1;\n");
  fs.mkdirSync(path.join(repo, "node_modules"));
  fs.symlinkSync(dependency, path.join(repo, "node_modules", "dependency"),
    process.platform === "win32" ? "junction" : "dir");
  const before = await treeDigest(repo);
  write(dependency, "index.js", "exports.value = 2;\n");
  const after = await treeDigest(repo);
  assert.notEqual(after.digest, before.digest);
});

test("runtime snapshot binds Node companions and the package manager's whole package", async (t) => {
  const fixture = temporary(t);
  const node = write(fixture, "node-runtime/node.exe", "unchanged Node entry fixture");
  const pnpmMain = write(fixture, "pnpm-package/bin/pnpm.cjs", "unchanged package-manager entry fixture");
  write(fixture, "pnpm-package/package.json", '{"name":"pnpm","version":"12.0.0"}\n');
  write(fixture, "pnpm-package/lib/implementation.cjs", "exports.value = 1;\n");
  write(fixture, "node-runtime/native-companion.dll", "native value = 1\n");
  const contract = { repositories: {} };
  const runtimePaths = { node, pnpmMain };
  const before = await snapshot(fixture, contract, runtimePaths);
  write(fixture, "node-runtime/native-companion.dll", "native value = 2\n");
  const nodeChanged = await snapshot(fixture, contract, runtimePaths);
  assert.equal(nodeChanged.runtimes.node.sha256, before.runtimes.node.sha256);
  assert.notDeepEqual(nodeChanged.runtimes.node, before.runtimes.node,
    "Node entry hash alone misses a changed companion runtime file");
  assert.deepEqual(nodeChanged.runtimes.pnpmMain, before.runtimes.pnpmMain);
  write(fixture, "pnpm-package/lib/implementation.cjs", "exports.value = 2;\n");
  const pnpmChanged = await snapshot(fixture, contract, runtimePaths);
  assert.equal(pnpmChanged.runtimes.pnpmMain.sha256, nodeChanged.runtimes.pnpmMain.sha256);
  assert.notDeepEqual(pnpmChanged.runtimes.pnpmMain, nodeChanged.runtimes.pnpmMain,
    "Hashing only package/bin misses its sibling lib implementation");
  assert.deepEqual(pnpmChanged.runtimes.node, nodeChanged.runtimes.node);
});

async function sealedFixture(t) {
  const root = temporary(t);
  for (const file of ["AGENTS.md", "HARNESS.md", "package.json", ".gitignore", ".gitattributes",
    "harness/contract.json", "harness/assertion.mjs", ".github/workflows/harness.yml"]) {
    write(root, file, `${file}\n`);
  }
  const seal = await makeSeal(root);
  write(root, "harness/seal.json", JSON.stringify(seal));
  assert.deepEqual(await verifySeal(root), seal);
  return root;
}

test("seal rejects an added control, removed assertion, or modified command", async (t) => {
  for (const mutation of [
    (root) => write(root, "harness/new-control.mjs", "process.exit(0);\n"),
    (root) => fs.unlinkSync(path.join(root, "harness/assertion.mjs")),
    (root) => write(root, "harness/contract.json", '{"command":"always-pass"}\n'),
    (root) => write(root, ".github/workflows/harness.yml", "disabled\n"),
  ]) {
    const root = await sealedFixture(t);
    mutation(root);
    await assert.rejects(verifySeal(root), /seal mismatch/);
  }
});

test("local runtime paths stay outside the seal, while tampering its own digest is rejected", async (t) => {
  const root = await sealedFixture(t);
  write(root, "harness/local.json", JSON.stringify({ node: process.execPath }));
  await verifySeal(root);
  const file = path.join(root, "harness/seal.json");
  const tampered = JSON.parse(fs.readFileSync(file, "utf8"));
  tampered.digest = "0".repeat(64);
  fs.writeFileSync(file, JSON.stringify(tampered));
  await assert.rejects(verifySeal(root), /seal mismatch/);
});
