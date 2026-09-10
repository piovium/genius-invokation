import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ensureRuntimeEnvironment, newEnvironment, redact, resolveBaselineSqlDirectory, signToken, TOKEN_LIFETIME_SECONDS, validateEnvironment, verifyToken } from "./prepare.mjs";
import { createIdentityServer, TEST_USERS } from "./identity.mjs";

async function temporaryEnvironment(t) {
  const folder = await mkdtemp(join(tmpdir(), "gi-harness-environment-"));
  t.after(async () => {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    assert.ok(basename(folder).startsWith("gi-harness-environment-"));
    await rm(folder, { recursive: true, force: true });
  });
  return join(folder, "runtime.env");
}

test("runtime preparation retains all credentials on rerun and renews only expired JWTs", async (t) => {
  const file = await temporaryEnvironment(t);
  const first = await ensureRuntimeEnvironment(file, { nowSeconds: 1000 });
  const content = await readFile(file, "utf8");
  assert.equal(first.created, true);
  const again = await ensureRuntimeEnvironment(file, { volumeExists: true, nowSeconds: 1010 });
  const keys = Object.keys(first.environment);
  // Node 26 parseEnv returns a null-prototype object. Compare values and never
  // hand complete credentials to assertions that print actual/expected values.
  assert.ok(Object.keys(again.environment).length === keys.length && keys.every((key) => again.environment[key] === first.environment[key]), "Repeated preparation changed credential values");
  assert.ok((await readFile(file, "utf8")) === content, "Repeated preparation changed credential file bytes");
  assert.equal(again.created, false);
  assert.equal(again.refreshedTokens, false);
  const renewed = await ensureRuntimeEnvironment(file, { volumeExists: true, nowSeconds: 1001 + TOKEN_LIFETIME_SECONDS });
  assert.equal(renewed.refreshedTokens, true);
  for (const key of ["POSTGRES_PASSWORD", "DATABASE_URL", "JWT_SECRET", "HARNESS_GH_TOKEN_A", "HARNESS_GH_TOKEN_B"]) {
    assert.ok(renewed.environment[key] === first.environment[key], `Renewal changed preserved ${key}`);
  }
  assert.ok(renewed.environment.HARNESS_USER_A_TOKEN !== first.environment.HARNESS_USER_A_TOKEN, "Expired JWT was not renewed");
  verifyToken(renewed.environment.HARNESS_USER_A_TOKEN, first.environment.JWT_SECRET, TEST_USERS[0].id, { nowSeconds: 1001 + TOKEN_LIFETIME_SECONDS });
});

test("an existing database volume without credentials never generates replacement credentials", async (t) => {
  const file = await temporaryEnvironment(t);
  await assert.rejects(ensureRuntimeEnvironment(file, { volumeExists: true }), /restore its original credentials/);
  await assert.rejects(readFile(file), { code: "ENOENT" });
});

test("fixture configuration rejects external databases, real identity URLs and invalid JWTs", () => {
  const environment = newEnvironment(1000);
  validateEnvironment(environment, 1001);
  for (const patch of [
    { DATABASE_URL: "postgresql://somewhere.invalid/production" },
    { GH_GET_USER_API_URL: "https://api.github.com/user" },
    { HARNESS_GH_TOKEN_A: "ghp_fakebutnotafixturetoken" },
    { HARNESS_PROJECT: "unrelated" },
    { HARNESS_USER_A_TOKEN: signToken(environment.JWT_SECRET, TEST_USERS[1].id, 1000) },
  ]) assert.throws(() => validateEnvironment({ ...environment, ...patch }, 1001));
  assert.throws(() => verifyToken(environment.HARNESS_USER_A_TOKEN, "wrong-secret", TEST_USERS[0].id, { nowSeconds: 1001 }), /signature/);
  assert.throws(() => verifyToken(environment.HARNESS_USER_A_TOKEN, environment.JWT_SECRET, TEST_USERS[0].id, { nowSeconds: 1000 + TOKEN_LIFETIME_SECONDS }), /expired/);
  assert.throws(() => verifyToken(environment.HARNESS_USER_A_TOKEN, environment.JWT_SECRET, TEST_USERS[0].id, { nowSeconds: 999 }), /future/);
  const sanitized = redact(Object.values(environment).join("\n"), environment);
  for (const [key, value] of Object.entries(environment)) if (/TOKEN|SECRET|PASSWORD|DATABASE_URL/.test(key)) assert.equal(sanitized.includes(value), false);
});

test("real identity HTTP fixture maps only the two synthetic bearer tokens and exposes local health", async (t) => {
  const environment = newEnvironment();
  const server = createIdentityServer({ tokenA: environment.HARNESS_GH_TOKEN_A, tokenB: environment.HARNESS_GH_TOKEN_B });
  await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
  t.after(async () => { server.closeAllConnections(); await new Promise((done) => server.close(done)); });
  const prefix = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await (await fetch(`${prefix}/healthz`)).json()).fixture, "HARNESS_ISOLATED_IDENTITY");
  for (const [index, key] of ["HARNESS_GH_TOKEN_A", "HARNESS_GH_TOKEN_B"].entries()) {
    const response = await fetch(`${prefix}/github/user`, { headers: { authorization: `Bearer ${environment[key]}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), TEST_USERS[index]);
  }
  for (const authorization of [undefined, "Bearer unknown", `bearer ${environment.HARNESS_GH_TOKEN_A}`]) {
    const response = await fetch(`${prefix}/github/user`, { headers: authorization ? { authorization } : {} });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Invalid fixture credential" });
  }
  const rejected = await fetch(`${prefix}/github/user`, { method: "POST" });
  assert.equal(rejected.status, 405);
  await rejected.body?.cancel();
});

test("HARNESS_DOCKER_SELFTEST: inherited credentials cannot override the preserved Compose environment", {
  skip: process.env.HARNESS_DOCKER_ENVIRONMENT_SELFTEST !== "1",
  timeout: 120_000,
}, async () => {
  const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const runtimeFile = join(repository, "temp/server-harness/environment/runtime.env");
  const before = await readFile(runtimeFile);
  const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL("./prepare.mjs", import.meta.url))], {
    cwd: repository,
    env: {
      ...process.env,
      POSTGRES_PASSWORD: "harness-host-password-poison",
      HARNESS_GH_TOKEN_A: "harness-host-token-a-poison",
      HARNESS_GH_TOKEN_B: "harness-host-token-b-poison",
      JWT_SECRET: "harness-host-secret-poison",
      DATABASE_URL: "postgresql://unused.invalid/should-never-be-contacted",
      GH_GET_USER_API_URL: "https://unused.invalid/should-never-be-contacted",
    },
    encoding: "utf8", timeout: 110_000, maxBuffer: 64 * 1024, windowsHide: true,
  });
  assert.match(stdout, /identity lookup and JWT signatures verified/);
  assert.ok(before.equals(await readFile(runtimeFile)), "Docker preparation changed the preserved credential file");
  const report = JSON.parse(await readFile(join(repository, "temp/server-harness/environment/report.json"), "utf8"));
  assert.equal(report.passed, true);
  assert.equal(report.existingVolumePreserved, true);
  assert.equal(report.accounts.length, 2);
  assert.equal(report.databasePasswordVerified, true);
  assert.equal(report.databaseWrongPasswordRejected, true);
});

test("baseline SQL must come from an explicit frozen old-service directory", async (t) => {
  await assert.rejects(resolveBaselineSqlDirectory({}), /HARNESS_BASELINE_SQL_DIR/);
  await assert.rejects(resolveBaselineSqlDirectory({ HARNESS_BASELINE_SQL_DIR: "   " }), /HARNESS_BASELINE_SQL_DIR/);
  // 候选服务清退 Prisma 后不再提供迁移 SQL，因此相对路径不能被解释成仓库内目录。
  await assert.rejects(resolveBaselineSqlDirectory({ HARNESS_BASELINE_SQL_DIR: "packages/server/prisma/migrations" }), /absolute/);
  const folder = await mkdtemp(join(tmpdir(), "gi-harness-baseline-"));
  t.after(async () => {
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    assert.ok(basename(folder).startsWith("gi-harness-baseline-"));
    await rm(folder, { recursive: true, force: true });
  });
  await assert.rejects(resolveBaselineSqlDirectory({ HARNESS_BASELINE_SQL_DIR: folder }), /No baseline migrations/);
  await mkdir(join(folder, "20250101000000_init"));
  await mkdir(join(folder, "20250201000000_more"));
  await writeFile(join(folder, "20250101000000_init", "migration.sql"), "SELECT 1;\n");
  // 缺 migration.sql 的目录必须失败，不能按空迁移继续。
  await assert.rejects(resolveBaselineSqlDirectory({ HARNESS_BASELINE_SQL_DIR: folder }), { code: "ENOENT" });
  await writeFile(join(folder, "20250201000000_more", "migration.sql"), "SELECT 2;\n");
  const resolved = await resolveBaselineSqlDirectory({ HARNESS_BASELINE_SQL_DIR: ` ${folder} ` });
  assert.equal(resolved.directory, folder);
  assert.deepEqual(resolved.migrations, ["20250101000000_init", "20250201000000_more"]);
});
