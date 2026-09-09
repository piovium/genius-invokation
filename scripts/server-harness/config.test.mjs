import assert from "node:assert/strict";
import test from "node:test";
import { validateConfig, evaluateCoverage } from "./config.mjs";

test("agreed budgets and full workload are the defaults", () => {
  const config = validateConfig({ pid: 123 });
  assert.equal(config.idleMiB, 100);
  assert.equal(config.gameMiB, 50);
  assert.equal(config.cycles, 3);
  assert.equal(config.cleanupTimeoutMs, 330000);
});

test("gate cannot pass on SSE, absent storage coverage, or loosened budgets", () => {
  const valid = { pid: 123, mode: "gate", transport: "ws", storageTokenEnvs: ["HARNESS_USER_A_TOKEN", "HARNESS_USER_B_TOKEN"] };
  assert.equal(validateConfig(valid).mode, "gate");
  for (const override of [{ transport: "sse" }, { storageTokenEnvs: [] }, { idleMiB: 101 }, { gameMiB: 51 }, { cycles: 1 }, { idleDurationMs: 1 }, { sampleIntervalMs: 5000 }, { actionDelayMs: 0 }]) {
    assert.throws(() => validateConfig({ ...valid, ...override }));
  }
});

test("measurement coverage cannot pass on only boundary samples", () => {
  assert.equal(evaluateCoverage([], 1).passed, false);
  assert.equal(evaluateCoverage([{ phase: "cold-idle", timestamp: 1 }], 1).passed, false);
  const samples = [];
  let timestamp = 0;
  for (const phase of ["cold-idle", "game:0", "idle:0"]) {
    for (let index = 0; index < 6; index++) {
      timestamp += 1000;
      samples.push({ phase, sampleStartedAt: timestamp - 10, timestamp });
    }
  }
  assert.equal(evaluateCoverage(samples, 1).passed, true);
  samples.at(-1).timestamp += 10000;
  assert.equal(evaluateCoverage(samples, 1).passed, false);
});

function completeTimingSamples() {
  const samples = [];
  let timestamp = 3000;
  for (const phase of ["cold-idle", "game:0", "idle:0"]) {
    for (let index = 0; index < 6; index++) {
      samples.push({ phase, sampleStartedAt: timestamp - 10, timestamp });
      timestamp += 1000;
    }
  }
  return samples;
}

test("coverage rejects a slow first read even when all completion gaps are short", () => {
  const samples = completeTimingSamples();
  assert.equal(evaluateCoverage(samples, 1).passed, true);
  samples[0].sampleStartedAt = 0;
  const result = evaluateCoverage(samples, 1);
  assert.equal(result.passed, false);
  assert.equal(result.sampleMaxGapMs, 3990);
  assert.ok(result.violations.some((message) => message.includes("2000ms")));
});

test("coverage fails closed for missing, nonfinite, reversed, or overlapping timestamps", () => {
  for (const mutate of [
    (sample) => { delete sample.timestamp; },
    (sample) => { delete sample.sampleStartedAt; },
    (sample) => { sample.timestamp = NaN; },
    (sample) => { sample.sampleStartedAt = Infinity; },
    (sample) => { sample.timestamp = sample.sampleStartedAt - 1; },
    (sample) => { sample.sampleStartedAt = 0; },
  ]) {
    const samples = completeTimingSamples();
    mutate(samples[2]);
    assert.equal(evaluateCoverage(samples, 1).passed, false);
  }
});

test("startup read duration does not invalidate otherwise complete measured windows", () => {
  const samples = completeTimingSamples().map((sample) => ({
    ...sample, sampleStartedAt: sample.sampleStartedAt + 10000, timestamp: sample.timestamp + 10000,
  }));
  samples.unshift({ phase: "startup", sampleStartedAt: 0, timestamp: 10000 });
  assert.equal(evaluateCoverage(samples, 1).passed, true);
});

test("PID measurement rejects remote servers and credential-bearing URLs", () => {
  for (const baseUrl of ["https://example.com/api", "http://user:secret@localhost/api", "http://localhost/api?token=secret"]) {
    assert.throws(() => validateConfig({ pid: 123, baseUrl }));
  }
  assert.equal(validateConfig({ pid: 123, baseUrl: "http://[::1]:3000/api/" }).baseUrl, "http://[::1]:3000/api");
});

test("requires an unambiguous target and finite positive sampling parameters", () => {
  for (const input of [{}, { pid: 0 }, { pid: 123, sampleIntervalMs: NaN }, { pid: 123, idleDurationMs: 0 }, { pid: 123, launch: { command: "node", args: [] } }]) {
    assert.throws(() => validateConfig(input));
  }
});
