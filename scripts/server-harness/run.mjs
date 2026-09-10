import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { MemorySampler } from "./memory.mjs";
import { verifyTarget } from "./target.mjs";
import { evaluateMemory } from "./budgets.mjs";
import { createApi, delay, waitUntil } from "./http.mjs";
import { playGame, probeHttp, waitForRoomRelease } from "./scenario.mjs";
import { prepareStorage, checkStoredGame } from "./storage.mjs";
import { validateConfig, evaluateCoverage } from "./config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { values } = parseArgs({ options: {
  config: { type: "string" }, pid: { type: "string" },
  "base-url": { type: "string" }, transport: { type: "string" }, mode: { type: "string" },
  output: { type: "string" }, help: { type: "boolean" },
} });
if (values.help) {
  console.log("Server migration harness (Node >=24, no npm install required)\n" +
    "node scripts/server-harness/run.mjs --config <file.json> [--pid <server PID>]\n" +
    "  [--base-url http://127.0.0.1:3000/api] [--transport sse|ws]\n" +
    "  [--mode baseline|gate] [--output temp/server-harness/<name>]\n" +
    "baseline: protocol failures exit 1, budget failures are recorded.\n" +
    "gate: WebSocket + storage + memory budgets must all pass.\n" +
    "Run only against an isolated test server/database; test games are persisted.");
  process.exit(0);
}

const input = values.config ? JSON.parse(await readFile(resolve(values.config), "utf8")) : {};
if (values.pid) input.pid = Number(values.pid);
if (values["base-url"]) input.baseUrl = values["base-url"];
if (values.transport) input.transport = values.transport;
if (values.mode) input.mode = values.mode;
if (values.output) input.outputDir = values.output;
const config = validateConfig(input);
const output = resolve(root, config.outputDir);
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(),
  kind: "server-measurement", mode: config.mode, transport: config.transport,
  environment: { platform: process.platform, arch: process.arch, harnessRuntime: process.version },
  workload: { cycles: config.cycles, idleDurationMs: config.idleDurationMs, actionDelayMs: config.actionDelayMs, cleanupTimeoutMs: config.cleanupTimeoutMs },
  budgets: { idleMiB: config.idleMiB, gameIncrementMiB: config.gameMiB, unitBytes: 1048576, scope: "one server runtime process RSS, database and harness excluded" },
  games: [], storage: { passed: false, status: "not-run" }, errors: [],
};
let child;
let logStream;
let sampler;
let storage;
const api = createApi(config.baseUrl, config.requestTimeoutMs);
const heartbeat = setInterval(() => console.log(`[harness] ${sampler?.samples.at(-1)?.phase ?? "startup"}: ${sampler?.samples.length ?? 0} RSS samples`), 30000);
try {
  if (config.launch) {
    logStream = createWriteStream(resolve(output, "server.log"));
    child = spawn(config.launch.command, config.launch.args, {
      cwd: resolve(root, config.launch.cwd ?? "."), windowsHide: true, shell: false,
      env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });
    await new Promise((done, reject) => { child.once("spawn", done); child.once("error", reject); });
    config.pid = child.pid;
    report.environment.serverRuntimeCommand = config.launch.command;
  }
  report.environment.serverPid = config.pid;
  sampler = new MemorySampler({ pid: config.pid, intervalMs: config.sampleIntervalMs });
  sampler.markPhase("startup");
  await sampler.start();
  await waitUntil(async () => {
    if (child && child.exitCode !== null) throw new Error(`Server exited during startup (${child.exitCode})`);
    if (sampler.error) throw sampler.error;
    try { await api("/version"); return true; } catch { return false; }
  }, config.startupTimeoutMs, "server readiness", 500);
  report.environment.target = await verifyTarget(config.pid, config.baseUrl);
  const deck = JSON.parse(await readFile(new URL("./deck.json", import.meta.url), "utf8"));
  report.server = await probeHttp(api, deck);
  if (config.storageTokenEnvs.length) storage = await prepareStorage(api, deck, config.storageTokenEnvs);
  else report.storage.status = "skipped-no-test-user-tokens";
  sampler.markPhase("cold-idle");
  await sampler.sample();
  await delay(config.idleDurationMs);
  await sampler.sample();
  const totalGames = config.cycles + (storage ? 1 : 0);
  for (let index = 0; index < totalGames; index++) {
    sampler.markPhase(`game:${index}`);
    await sampler.sample();
    const authenticated = index === config.cycles;
    console.log(`[harness] game ${index + 1}/${totalGames}${authenticated ? " (stored)" : ""}`);
    const game = await playGame({ api, config, deck,
      strategy: index % 3 === 1 ? "long" : "combat", reconnect: index % 3 === 2,
      accounts: authenticated ? storage.accounts : undefined,
    });
    report.games.push(game);
    if (authenticated) report.storage = await checkStoredGame(api, storage.accounts, game, config.requestTimeoutMs);
    await sampler.sample();
    sampler.markPhase(`cleanup:${index}`);
    game.releaseDurationMs = await waitForRoomRelease(api, game.roomId, config.cleanupTimeoutMs);
    await sampler.sample();
    sampler.markPhase(`idle:${index}`);
    await sampler.sample();
    await delay(config.idleDurationMs);
    await sampler.sample();
  }
  report.behaviorPassed = true;
} catch (error) {
  report.behaviorPassed = false;
  report.errors.push(error.message);
} finally {
  if (storage) {
    try { await storage.dispose(); } catch (error) { report.errors.push(error.message); report.behaviorPassed = false; }
  }
  if (sampler) {
    try { await sampler.stop(); } catch (error) { report.errors.push(error.message); }
    report.memory = evaluateMemory(sampler.samples, { idleMiB: config.idleMiB, gameMiB: config.gameMiB, requiredGames: config.cycles + (storage ? 1 : 0) });
    report.measurementCoverage = evaluateCoverage(sampler.samples, config.cycles + (storage ? 1 : 0));
    await writeFile(resolve(output, "memory.ndjson"), sampler.samples.map((sample) => JSON.stringify(sample)).join("\n") + "\n");
  }
  if (child && child.exitCode === null && child.signalCode === null) {
    // Only terminate the exact runtime this harness launched. Never kill an attached PID.
    child.kill("SIGTERM");
    await Promise.race([new Promise((done) => child.once("exit", done)), delay(3000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
  logStream?.end();
  clearInterval(heartbeat);
}
try { report.checkout = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).trim(); } catch { report.checkout = null; }
report.finishedAt = new Date().toISOString();
report.gatePassed = report.behaviorPassed && report.errors.length === 0 && report.memory?.passed === true && report.measurementCoverage?.passed === true && report.storage.passed && config.transport === "ws";
report.result = report.errors.length || !report.behaviorPassed ? "failed" : config.mode === "gate" ? (report.gatePassed ? "passed" : "failed") : "baseline-recorded";
await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`[harness] ${report.result}; memory=${report.memory?.passed ?? false}; ${resolve(output, "report.json")}`);
for (const error of [...report.errors, ...(report.memory?.violations ?? [])]) console.error(`[harness] ${typeof error === "string" ? error : JSON.stringify(error)}`);
if (config.mode === "gate") for (const error of report.measurementCoverage?.violations ?? []) console.error(`[harness] ${error}`);
process.exitCode = report.result === "failed" ? 1 : 0;
