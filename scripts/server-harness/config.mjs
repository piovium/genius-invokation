import assert from "node:assert/strict";

export const defaults = {
  baseUrl: "http://127.0.0.1:3000/api",
  transport: "sse",
  mode: "baseline",
  idleMiB: 100,
  gameMiB: 50,
  sampleIntervalMs: 100,
  idleDurationMs: 5000,
  requestTimeoutMs: 10000,
  startupTimeoutMs: 120000,
  gameTimeoutMs: 180000,
  cleanupTimeoutMs: 330000,
  actionDelayMs: 100,
  cycles: 3,
  storageTokenEnvs: [],
  outputDir: "temp/server-harness/latest",
};

export function validateConfig(input) {
  const config = { ...defaults, ...input };
  assert.ok(["sse", "ws"].includes(config.transport), "transport must be sse or ws");
  assert.ok(["baseline", "gate"].includes(config.mode), "mode must be baseline or gate");
  const url = new URL(config.baseUrl);
  assert.ok(["http:", "https:"].includes(url.protocol));
  assert.ok(!url.username && !url.password && !url.search && !url.hash, "baseUrl must not contain credentials, query, or hash");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Run this PID-based harness on the server host and use a loopback URL");
  config.baseUrl = config.baseUrl.replace(/\/$/, "");
  for (const key of ["idleMiB", "gameMiB", "sampleIntervalMs", "idleDurationMs", "requestTimeoutMs", "startupTimeoutMs", "gameTimeoutMs", "cleanupTimeoutMs", "cycles"]) {
    assert.ok(Number.isFinite(config[key]) && config[key] > 0, `${key} must be positive`);
  }
  assert.ok(Number.isInteger(config.cycles) && config.cycles >= 3, "At least three games cover combat, long game and reconnect");
  assert.ok(Number.isFinite(config.actionDelayMs) && config.actionDelayMs >= 0);
  assert.ok(Array.isArray(config.storageTokenEnvs) && [0, 2].includes(config.storageTokenEnvs.length));
  assert.ok(config.storageTokenEnvs.every((name) => typeof name === "string" && /^[A-Z_][A-Z0-9_]*$/.test(name)));
  if (config.mode === "gate") {
    assert.equal(config.transport, "ws", "Migration gate requires WebSocket");
    assert.equal(config.storageTokenEnvs.length, 2, "Migration gate requires storage checks with two test users");
    assert.ok(config.idleMiB <= 100 && config.gameMiB <= 50, "Migration gate cannot loosen the agreed memory budgets");
    assert.ok(config.idleDurationMs >= 5000, "Migration gate requires at least five seconds per idle window");
    assert.ok(config.sampleIntervalMs <= 250, "Migration gate sampling interval must be <=250ms");
    assert.ok(config.actionDelayMs >= 50, "Migration gate action delay must be >=50ms for observable games");
  }
  if (config.launch) {
    assert.ok(typeof config.launch.command === "string" && config.launch.command.length > 0);
    assert.ok(Array.isArray(config.launch.args) && config.launch.args.every((arg) => typeof arg === "string"));
    assert.ok(!config.pid, "Choose launch or pid, not both");
    assert.ok(!/^(pnpm|npm|npx|cmd|powershell|pwsh|sh|bash)(\.(exe|cmd|ps1))?$/i.test(config.launch.command.split(/[\\/]/).at(-1)), "Launch the runtime directly, without a shell or package-manager wrapper");
  } else {
    assert.ok(Number.isSafeInteger(config.pid) && config.pid > 0, "Set --pid to the server runtime PID or configure launch");
  }
  return config;
}

export function evaluateCoverage(samples, totalGames) {
  const violations = [];
  if (!Array.isArray(samples) || !Number.isSafeInteger(totalGames) || totalGames < 1) {
    return { passed: false, violations: ["Coverage requires a sample array and a positive integer game count"] };
  }
  for (const phase of ["cold-idle", ...Array.from({ length: totalGames }, (_, index) => `idle:${index}`)]) {
    const phaseSamples = samples.filter((sample) => sample?.phase === phase);
    if (phaseSamples.length < 3 || phaseSamples.at(-1)?.timestamp - phaseSamples[0]?.timestamp < 5000) {
      violations.push(`${phase}: need >=3 samples spanning >=5000ms for migration acceptance`);
    }
  }
  for (let index = 0; index < totalGames; index++) {
    if (samples.filter((sample) => sample?.phase === `game:${index}`).length < 3) {
      violations.push(`game:${index}: need >=3 samples during the game`);
    }
  }
  const measured = samples.filter((sample) => sample?.phase !== "startup");
  let previous = null;
  let sampleMaxGapMs = 0;
  for (const [index, sample] of measured.entries()) {
    if (!Number.isFinite(sample?.sampleStartedAt) || sample.sampleStartedAt < 0 ||
        !Number.isFinite(sample.timestamp) || sample.timestamp < sample.sampleStartedAt) {
      violations.push(`Measured sample ${index} needs valid start/end timestamps in chronological order`);
      continue;
    }
    if (previous && sample.sampleStartedAt < previous.timestamp) {
      violations.push(`Measured sample ${index} starts before the previous serial read ended`);
    }
    sampleMaxGapMs = Math.max(sampleMaxGapMs, sample.timestamp - sample.sampleStartedAt);
    if (previous) sampleMaxGapMs = Math.max(sampleMaxGapMs,
      sample.sampleStartedAt - previous.sampleStartedAt,
      sample.timestamp - previous.timestamp);
    previous = sample;
  }
  if (sampleMaxGapMs > 2000) {
    violations.push("Actual RSS sampling gap or read duration exceeds 2000ms; rerun on a less loaded host");
  }
  return { passed: violations.length === 0, violations, sampleMaxGapMs };
}
