import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { playGame } from "./scenario.mjs";
import { encodeGameFrame } from "./wire.mjs";

const directory = dirname(fileURLToPath(import.meta.url));

async function availablePort() {
  const reservation = createServer();
  await new Promise((done, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", done); });
  const { port } = reservation.address();
  await new Promise((done) => reservation.close(done));
  return port;
}

test("HARNESS_SELFTEST: CLI covers three games, reconnect, terminal EOF race and RSS reporting", { timeout: 90_000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(), "gi-server-harness-selftest-"));
  const output = join(temporary, "report");
  const configFile = join(temporary, "config.json");
  const port = await availablePort();
  let child;
  try {
    await writeFile(configFile, JSON.stringify({
      baseUrl: `http://127.0.0.1:${port}/api`, transport: "sse", mode: "baseline",
      cycles: 3, sampleIntervalMs: 10, idleDurationMs: 30, actionDelayMs: 5,
      requestTimeoutMs: 1000, cleanupTimeoutMs: 3000, startupTimeoutMs: 10000, gameTimeoutMs: 10000,
      // Deliberately below any runtime RSS: baseline must record the violation and exit 0.
      idleMiB: 0.000001, gameMiB: 0.000001,
      outputDir: output,
      launch: { command: process.execPath, args: [join(directory, "fixture-server.mjs"), "--selftest", "--port", String(port)] },
    }));
    child = spawn(process.execPath, [join(directory, "run.mjs"), "--config", configFile], {
      cwd: resolve(directory, "../.."), windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"],
    });
    let diagnostic = "";
    child.stdout.on("data", (bytes) => { diagnostic += bytes; });
    child.stderr.on("data", (bytes) => { diagnostic += bytes; });
    const exit = await new Promise((done, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => done({ code, signal }));
    });
    const report = JSON.parse(await readFile(join(output, "report.json"), "utf8"));
    assert.equal(exit.code, 0, `${diagnostic}\n${JSON.stringify(report.errors)}`);
    assert.equal(report.result, "baseline-recorded");
    assert.equal(report.behaviorPassed, true);
    assert.deepEqual(report.errors, []);
    assert.equal(report.server.coreVersion, "HARNESS_SELFTEST", "Scripted fixture must remain distinguishable from the real engine");
    assert.equal(report.games.length, 3);
    assert.deepEqual(report.games.map((game) => game.strategy), ["combat", "long", "combat"]);
    assert.ok(report.games[2].checks.includes("reconnect-pending-rpc"));
    for (const game of report.games) {
      for (const check of ["waiting", "opponent-view-denied", "opponent-action-denied", "snapshot-private-fields-hidden", "wrong-rpc-id-rejected", "malformed-rpc-rejected", "both-players-game-end", "replay-readable"]) {
        assert.ok(game.checks.includes(check), `Missing ${check}`);
      }
    }
    assert.equal(report.gatePassed, false, "SSE and missing real storage can never establish migration readiness");
    assert.equal(report.measurementCoverage.passed, false, "Short selftest windows must not satisfy migration measurement coverage");
    assert.equal(report.storage.passed, false);
    assert.equal(report.memory.passed, false, "Intentionally tiny budget must fail");
    assert.ok(report.memory.violations.some((violation) => violation.includes("idle budget")));
    assert.ok(report.memory.baselineRssBytes > 0);
    assert.equal(report.memory.games.length, 3);
    const samples = (await readFile(join(output, "memory.ndjson"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const phases = new Set(samples.map((sample) => sample.phase));
    for (const phase of ["startup", "cold-idle", "game:0", "cleanup:0", "idle:0", "game:1", "cleanup:1", "idle:1", "game:2", "cleanup:2", "idle:2"]) {
      assert.ok(phases.has(phase), `RSS coverage missing ${phase}`);
    }
    assert.ok(samples.every((sample) => sample.pid === report.environment.serverPid && sample.pid !== process.pid));
    assert.match(await readFile(join(output, "server.log"), "utf8"), /HARNESS_SELFTEST/);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    // Delete only the fresh directory allocated by this test, with an absolute boundary check.
    assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
    assert.ok(basename(temporary).startsWith("gi-server-harness-selftest-"));
    await rm(temporary, { recursive: true, force: true });
  }
});

test("WS scenario rejects a changed game session on reconnect before submitting an action", async (context) => {
  const sockets = [];
  let hostConnections = 0;
  let hostSocket;
  let actionAttempts = 0;
  class ScenarioWebSocket extends EventTarget {
    constructor(url) {
      super();
      this.playerId = new URL(url).pathname.split("/").at(-2);
      this.closed = false;
      sockets.push(this);
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    message(value) {
      this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(value) }));
    }
    initialize() {
      this.message({ type: "initialized", who: this.playerId === "p0" ? 0 : 1,
        myPlayerInfo: { id: this.playerId }, oppPlayerInfo: { id: this.playerId === "p0" ? "p1" : "p0" } });
    }
    send(frame) {
      if (typeof frame !== "string") { actionAttempts++; throw new Error("An action must not be submitted before the reconnect identity check"); }
      const value = JSON.parse(frame);
      if (value.type === "giveUp") {
        this.message({ type: "ack", command: "giveUp", sessionId: this.sessionId });
        return;
      }
      assert.equal(value.type, "auth");
      if (value.token !== `${this.playerId}-token`) {
        this.dispatchEvent(Object.assign(new Event("close"), { code: 1008 }));
        return;
      }
      if (this.playerId === "p0") hostConnections++;
      this.sessionId = this.playerId === "p0" && hostConnections === 2 ? "replacement-game" : "original-game";
      this.message({ type: "ready", sessionId: this.sessionId });
      if (this.playerId === "p0" && hostConnections === 1) {
        hostSocket = this;
        this.message({ type: "waiting" });
      } else if (this.playerId === "p1") {
        this.initialize();
        hostSocket.initialize();
        hostSocket.dispatchEvent(new MessageEvent("message", { data: encodeGameFrame({
          type: "rpc", data: { id: 1, request: Uint8Array.of(0x12, 0), timer: { current: 60, total: 60 } },
        }).buffer }));
      }
    }
    close() { this.closed = true; }
  }
  const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  Object.defineProperty(globalThis, "WebSocket", { value: ScenarioWebSocket, configurable: true, writable: true });
  context.after(() => Object.defineProperty(globalThis, "WebSocket", originalWebSocket));
  context.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "http://127.0.0.1/api/rooms/12/players/p0/notification");
    return new Response(null, { status: 404 });
  });
  const api = async (path, request) => {
    if (request.method === "DELETE") return { status: 200, data: {} };
    if (path === "/rooms") return { data: { room: { id: 12 }, playerId: "p0", accessToken: "p0-token" } };
    if (path === "/rooms/12/players") return { data: { playerId: "p1", accessToken: "p1-token" } };
    assert.equal(path, "/rooms/12/players/p0/actionResponse");
    return { status: 404 };
  };
  await assert.rejects(playGame({
    api, deck: {}, strategy: "combat", reconnect: true,
    config: { transport: "ws", baseUrl: "http://127.0.0.1/api", requestTimeoutMs: 300, gameTimeoutMs: 2_000 },
  }), /Reconnect changed game sessionId/);
  assert.equal(hostConnections, 2);
  assert.equal(actionAttempts, 0);
  assert.ok(sockets.every((socket) => socket.closed), "Scenario must release both the original and replacement connections");
});
