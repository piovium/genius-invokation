import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv, promisify } from "node:util";
import { TEST_USERS } from "./identity.mjs";

export const PROJECT = "gi-server-harness";
export const TOKEN_LIFETIME_SECONDS = 42 * 24 * 60 * 60;
const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../..");
const outputDirectory = join(repository, "temp/server-harness/environment");
const runtimeFile = join(outputDirectory, "runtime.env");
const reportFile = join(outputDirectory, "report.json");
const volumeName = `${PROJECT}-postgres-data`;
const executeFile = promisify(execFile);
const dockerSocket = "unix:///var/run/docker.sock";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function signToken(secret, userId, nowSeconds = Math.floor(Date.now() / 1000)) {
  const content = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ user: 1, sub: userId, iat: nowSeconds, exp: nowSeconds + TOKEN_LIFETIME_SECONDS })}`;
  return `${content}.${createHmac("sha256", secret).update(content).digest("base64url")}`;
}

export function verifyToken(token, secret, expectedUserId, { nowSeconds = Math.floor(Date.now() / 1000), allowExpired = false } = {}) {
  assert.equal(typeof token, "string", "Missing harness JWT");
  const parts = token.split(".");
  assert.equal(parts.length, 3, "Malformed harness JWT");
  for (const part of parts) assert.ok(/^[A-Za-z0-9_-]+$/.test(part) && Buffer.from(part, "base64url").toString("base64url") === part, "Noncanonical harness JWT");
  const signature = Buffer.from(parts[2], "base64url");
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  assert.ok(signature.length === expected.length && timingSafeEqual(signature, expected), "Harness JWT signature mismatch");
  const header = JSON.parse(Buffer.from(parts[0], "base64url"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url"));
  assert.ok(header.alg === "HS256" && header.typ === "JWT", "Unexpected harness JWT header");
  assert.ok(payload.user === 1 && payload.sub === expectedUserId, "Harness JWT user mismatch");
  assert.ok(Number.isSafeInteger(payload.iat) && Number.isSafeInteger(payload.exp) && payload.exp - payload.iat === TOKEN_LIFETIME_SECONDS, "Harness JWT lifetime must be 42 days");
  assert.ok(payload.iat <= nowSeconds, "Harness JWT issued in the future");
  assert.ok(allowExpired || payload.exp > nowSeconds, "Harness JWT expired");
  return payload;
}

export function newEnvironment(nowSeconds = Math.floor(Date.now() / 1000)) {
  const password = randomBytes(24).toString("hex");
  const secret = randomBytes(32).toString("hex");
  return {
    HARNESS_ENV_VERSION: "1",
    HARNESS_PROJECT: PROJECT,
    POSTGRES_DB: "gi_server_harness",
    POSTGRES_USER: "harness",
    POSTGRES_PASSWORD: password,
    DATABASE_URL: `postgresql://harness:${password}@127.0.0.1:15432/gi_server_harness?schema=public`,
    DATABASE_URL_CONTAINER: `postgresql://harness:${password}@postgres:5432/gi_server_harness?schema=public`,
    JWT_SECRET: secret,
    GH_GET_USER_API_URL: "http://127.0.0.1:19090/github/user",
    GH_GET_USER_API_URL_CONTAINER: "http://identity:9090/github/user",
    HARNESS_GH_TOKEN_A: `harness-fake-${randomBytes(24).toString("hex")}`,
    HARNESS_GH_TOKEN_B: `harness-fake-${randomBytes(24).toString("hex")}`,
    HARNESS_USER_A_TOKEN: signToken(secret, TEST_USERS[0].id, nowSeconds),
    HARNESS_USER_B_TOKEN: signToken(secret, TEST_USERS[1].id, nowSeconds),
  };
}

export function validateEnvironment(environment, nowSeconds = Math.floor(Date.now() / 1000)) {
  assert.ok(environment.HARNESS_ENV_VERSION === "1" && environment.HARNESS_PROJECT === PROJECT, "Runtime environment belongs to a different fixture/version");
  assert.ok(environment.POSTGRES_DB === "gi_server_harness" && environment.POSTGRES_USER === "harness", "Unexpected fixture database identity");
  assert.ok(/^[a-f0-9]{48}$/.test(environment.POSTGRES_PASSWORD ?? ""), "Invalid fixture database password");
  assert.ok(/^[a-f0-9]{64}$/.test(environment.JWT_SECRET ?? ""), "Invalid fixture JWT secret");
  const password = environment.POSTGRES_PASSWORD;
  assert.ok(environment.DATABASE_URL === `postgresql://harness:${password}@127.0.0.1:15432/gi_server_harness?schema=public`, "Database URL must reference only the isolated loopback database");
  assert.ok(environment.DATABASE_URL_CONTAINER === `postgresql://harness:${password}@postgres:5432/gi_server_harness?schema=public`, "Container database URL must reference the fixture database");
  assert.ok(environment.GH_GET_USER_API_URL === "http://127.0.0.1:19090/github/user" && environment.GH_GET_USER_API_URL_CONTAINER === "http://identity:9090/github/user", "Identity URLs must reference only the local stub");
  assert.ok([environment.HARNESS_GH_TOKEN_A, environment.HARNESS_GH_TOKEN_B].every((value) => /^harness-fake-[a-f0-9]{48}$/.test(value ?? "")), "Invalid synthetic identity tokens");
  assert.ok(environment.HARNESS_GH_TOKEN_A !== environment.HARNESS_GH_TOKEN_B, "Fixture identities require distinct tokens");
  for (const [index, key] of ["HARNESS_USER_A_TOKEN", "HARNESS_USER_B_TOKEN"].entries()) {
    verifyToken(environment[key], environment.JWT_SECRET, TEST_USERS[index].id, { nowSeconds, allowExpired: true });
  }
  return environment;
}

function formatEnvironment(environment) {
  // Generated values contain neither whitespace nor dotenv substitution syntax.
  return `# Generated isolated test credentials. Keep this file out of version control.\n${Object.entries(environment).map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

export async function ensureRuntimeEnvironment(file, { volumeExists = false, nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
  let environment;
  let created = false;
  let refreshedTokens = false;
  try {
    environment = validateEnvironment(parseEnv(await readFile(file, "utf8")), nowSeconds);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    assert.equal(volumeExists, false, "Existing fixture database volume has no runtime.env; restore its original credentials before continuing. The volume was preserved.");
    environment = newEnvironment(nowSeconds);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, formatEnvironment(environment), { mode: 0o600, flag: "wx" });
    created = true;
  }
  for (const [index, key] of ["HARNESS_USER_A_TOKEN", "HARNESS_USER_B_TOKEN"].entries()) {
    const payload = verifyToken(environment[key], environment.JWT_SECRET, TEST_USERS[index].id, { nowSeconds, allowExpired: true });
    if (payload.exp <= nowSeconds) {
      environment[key] = signToken(environment.JWT_SECRET, TEST_USERS[index].id, nowSeconds);
      refreshedTokens = true;
    }
  }
  if (refreshedTokens) await writeFile(file, formatEnvironment(environment), { mode: 0o600 });
  await chmod(file, 0o600);
  return { environment, created, refreshedTokens };
}

export function redact(text, environment = {}) {
  let result = String(text);
  for (const [key, value] of Object.entries(environment)) {
    if (/TOKEN|SECRET|PASSWORD|DATABASE_URL/.test(key) && value) result = result.split(value).join("[REDACTED]");
  }
  return result;
}

/**
 * 基线数据库 schema 来自冻结的旧服务源码快照。候选服务在清退 Prisma 后不再携带
 * 这份 SQL，因此旧服务迁移目录必须显式给出，不能回退到候选服务目录。
 */
export async function resolveBaselineSqlDirectory(processEnvironment = process.env) {
  const directory = processEnvironment.HARNESS_BASELINE_SQL_DIR?.trim();
  assert.ok(
    directory,
    "HARNESS_BASELINE_SQL_DIR must point at the frozen old service prisma/migrations directory; the candidate service no longer ships Prisma SQL",
  );
  assert.ok(isAbsolute(directory), "HARNESS_BASELINE_SQL_DIR must be an absolute path inside the fixture host");
  const entries = await readdir(directory, { withFileTypes: true });
  const migrations = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(migrations.length > 0, `No baseline migrations found in ${directory}`);
  for (const name of migrations) {
    await stat(join(directory, name, "migration.sql"));
  }
  return { directory, migrations };
}

async function docker(args, environment = {}, timeout = 600_000) {
  try {
    const { stdout } = await executeFile("docker", ["--host", dockerSocket, ...args], {
      cwd: repository, encoding: "utf8", maxBuffer: 512 * 1024, timeout, windowsHide: true,
      // Compose gives inherited variables precedence over --env-file. Supply
      // the validated fixture values explicitly so caller credentials cannot
      // replace its database password or synthetic identity tokens.
      env: { ...process.env, ...environment },
    });
    return stdout.trim();
  } catch (error) {
    const detail = error.stderr || error.stdout || error.message;
    throw new Error(redact(`Docker operation failed: ${detail}`, environment), { cause: undefined });
  }
}

function composeArgs() {
  return ["compose", "--project-name", PROJECT, "--env-file", runtimeFile, "--file", join(directory, "compose.yaml")];
}

async function query(sql, environment) {
  // Use the service interface: the image's loopback/local pg_hba entries may
  // allow trust authentication, which would not verify the fixture password.
  const statement = 'PGPASSWORD="$POSTGRES_PASSWORD" psql --host=postgres --no-psqlrc --tuples-only --no-align --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --command="$1"';
  return JSON.parse(await docker([...composeArgs(), "exec", "-T", "postgres", "sh", "-c", statement, "harness-query", sql], environment));
}

async function verifyServices(environment, baselineSql) {
  const rows = await query('SELECT json_agg(t ORDER BY t.id) FROM (SELECT "id", "name", "ghToken" FROM "User" WHERE "id" IN (91000001,91000002)) t', environment);
  assert.ok(Array.isArray(rows) && rows.length === 2, "Fixture database is missing one or both accounts");
  const wrongPassword = 'PGPASSWORD=harness-invalid-fixture-password psql --host=postgres --no-psqlrc --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --command="SELECT 1"';
  await assert.rejects(docker([...composeArgs(), "exec", "-T", "postgres", "sh", "-c", wrongPassword], environment), /password authentication failed/);
  const migrationDirectory = baselineSql.directory;
  const sourceMigrations = baselineSql.migrations;
  const applied = await query('SELECT json_agg(t ORDER BY t.name) FROM (SELECT "name", "sha256" FROM "_HarnessMigration") t', environment);
  assert.ok(Array.isArray(applied) && applied.length === sourceMigrations.length, "Migration count differs from the frozen baseline SQL");
  for (const [index, name] of sourceMigrations.entries()) {
    const checksum = createHash("sha256").update(await readFile(join(migrationDirectory, name, "migration.sql"))).digest("hex");
    assert.ok(applied[index].name === name && applied[index].sha256 === checksum, "Applied migration differs from the frozen baseline SQL");
  }
  const health = await fetch("http://127.0.0.1:19090/healthz", { signal: AbortSignal.timeout(10_000), redirect: "error" });
  assert.equal(health.status, 200, "Identity health check failed");
  assert.equal((await health.json()).fixture, "HARNESS_ISOLATED_IDENTITY", "Unexpected identity service on fixture port");
  const verified = [];
  for (const [index, user] of TEST_USERS.entries()) {
    const ghToken = environment[index === 0 ? "HARNESS_GH_TOKEN_A" : "HARNESS_GH_TOKEN_B"];
    assert.ok(rows[index].id === user.id && rows[index].ghToken === ghToken, "Existing account differs from the preserved fixture credentials; data was not overwritten");
    const response = await fetch(environment.GH_GET_USER_API_URL, { headers: { authorization: `Bearer ${ghToken}` }, signal: AbortSignal.timeout(10_000), redirect: "error" });
    assert.equal(response.status, 200, "Synthetic identity lookup failed");
    const identity = await response.json();
    assert.ok(identity.id === user.id && identity.login === user.login && identity.name === user.name && identity.avatar_url === user.avatar_url, "Identity response differs from the seeded account");
    const token = environment[index === 0 ? "HARNESS_USER_A_TOKEN" : "HARNESS_USER_B_TOKEN"];
    const payload = verifyToken(token, environment.JWT_SECRET, user.id);
    verified.push({ id: user.id, login: user.login, jwtSignatureVerified: true, tokenExpiresAt: new Date(payload.exp * 1000).toISOString() });
  }
  const unauthorized = await fetch(environment.GH_GET_USER_API_URL, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  assert.equal(unauthorized.status, 401, "Identity fixture accepted a missing credential");
  await unauthorized.body?.cancel();
  return { accounts: verified, migrations: sourceMigrations, baselineSqlDirectory: migrationDirectory, migrationChecksumsVerified: true, identityHealthPassed: true, missingIdentityCredentialRejected: true, databasePasswordVerified: true, databaseWrongPasswordRejected: true };
}

export async function prepare() {
  const report = { kind: "HARNESS_ISOLATED_ENVIRONMENT", project: PROJECT, startedAt: new Date().toISOString(), passed: false };
  let environment = {};
  await mkdir(outputDirectory, { recursive: true });
  try {
    assert.equal(process.platform, "linux", "Run prepare.mjs inside the dedicated gi-server-harness WSL/Linux environment");
    if (process.env.WSL_DISTRO_NAME) assert.equal(process.env.WSL_DISTRO_NAME, PROJECT, "Use the dedicated gi-server-harness WSL distribution");
    const baselineSql = await resolveBaselineSqlDirectory();
    await docker(["info", "--format", "{{.ServerVersion}}"], {}, 30_000);
    const volumes = await docker(["volume", "ls", "--filter", `name=^${volumeName}$`, "--format", "{{.Name}}"], {}, 30_000);
    const volumeExists = volumes.split("\n").includes(volumeName);
    if (volumeExists) {
      const labels = JSON.parse(await docker(["volume", "inspect", volumeName, "--format", "{{json .Labels}}"], {}, 30_000));
      assert.equal(labels?.["com.docker.compose.project"], PROJECT, "Existing volume belongs to another project; it was preserved");
    }
    const initialized = await ensureRuntimeEnvironment(runtimeFile, { volumeExists });
    environment = initialized.environment;
    report.credentialsCreated = initialized.created;
    report.expiredTokensRefreshed = initialized.refreshedTokens;
    report.existingVolumePreserved = volumeExists;
    process.stdout.write("Starting isolated PostgreSQL 17 and local identity fixture...\n");
    await docker([...composeArgs(), "up", "-d", "--wait", "--wait-timeout", "120", "postgres", "identity"], environment);
    await docker([...composeArgs(), "exec", "-T", "postgres", "sh", "/harness/init-db.sh"], environment, 120_000);
    Object.assign(report, await verifyServices(environment, baselineSql));
    report.services = { postgres: "127.0.0.1:15432", identity: "127.0.0.1:19090" };
    report.composeNetwork = `${PROJECT}_default`;
    report.databaseExcludedFromServerRss = true;
    report.passed = true;
    process.stdout.write(`Ready: two isolated accounts, ${report.migrations.length} frozen baseline migrations, identity lookup and JWT signatures verified.\n`);
  } catch (error) {
    report.error = redact(error.message, environment);
    process.exitCode = 1;
    process.stderr.write(`${report.error}\n`);
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`Sanitized report: ${reportFile}\n`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prepare();
