import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMemory } from "./budgets.mjs";

const MIB = 1024 * 1024;
const readings = (rows) => rows.map(([phase, rss, peak = null], index) => ({
  phase,
  rssBytes: rss * MIB,
  peakRssBytes: peak === null ? null : peak * MIB,
  sampleStartedAt: index * 100,
  timestamp: index * 100 + 10,
}));

test("uses the cold-idle median and accepts inclusive budget boundaries", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 20],
    ["cold-idle", 80],
    ["cold-idle", 80],
    ["game:0", 130],
    ["idle:0", 100],
  ]));
  assert.equal(result.passed, true);
  assert.equal(result.baselineRssBytes, 80 * MIB);
  assert.equal(result.idlePeakRssBytes, 100 * MIB);
  assert.equal(result.games[0].incrementBytes, 50 * MIB);
});

test("fails when cold idle or recovered idle exceeds its budget", () => {
  for (const [cold, idle] of [[101, 80], [80, 101]]) {
    const result = evaluateMemory(readings([
      ["cold-idle", cold], ["game:0", 110], ["idle:0", idle],
    ]));
    assert.equal(result.passed, false);
    assert.ok(result.violations.some((violation) => violation.includes("idle budget")));
  }
});

test("fails closed for no samples, no games, missing phases, or invalid RSS", () => {
  const cases = [
    [],
    [["cold-idle", 80]],
    [["game:0", 90], ["idle:0", 80]],
    [["cold-idle", 80], ["idle:0", 80]],
    [["cold-idle", 80], ["game:0", 90]],
    [["cold-idle", 80], ["game:0", 0], ["idle:0", 80]],
    [["cold-idle", 80], ["game:1", 90], ["idle:1", 80]],
  ];
  for (const rows of cases) {
    const result = evaluateMemory(readings(rows));
    assert.equal(result.passed, false, JSON.stringify(rows));
    assert.ok(result.violations.length > 0);
  }
  const incomplete = evaluateMemory(readings([
    ["cold-idle", 80], ["game:0", 90], ["idle:0", 80],
  ]), { requiredGames: 2 });
  assert.equal(incomplete.passed, false);
  assert.equal(incomplete.games[1].passed, false);
  assert.equal(incomplete.games[1].peakRssBytes, null);
  assert.ok(incomplete.violations.some((violation) => violation.includes("game:1")));
  assert.ok(incomplete.violations.some((violation) => violation.includes("idle:1")));
});

test("an old startup lifetime peak is displayed without charging it to games", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 80, 200],
    ["game:0", 100, 200],
    ["idle:0", 80, 200],
    ["game:1", 110, 200],
    ["idle:1", 80, 200],
  ]));
  assert.equal(result.passed, true);
  assert.equal(result.processLifetimePeakRssBytes, 200 * MIB);
  assert.equal(result.games[0].incrementBytes, 20 * MIB);
  assert.equal(result.games[1].incrementBytes, 30 * MIB);
  assert.equal(result.games[0].attributedLifetimePeakRssBytes, null);
  assert.ok(result.limitations.some((text) => text.includes("lower bounds")));
});

test("a newly observed OS high-water mark catches a peak missed by RSS samples", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 80, 90],
    ["game:0", 90, 135],
    ["idle:0", 80, 135],
    ["game:1", 95, 135],
    ["idle:1", 80, 135],
  ]));
  assert.equal(result.passed, false);
  assert.equal(result.games[0].sampledPeakRssBytes, 90 * MIB);
  assert.equal(result.games[0].peakRssBytes, 135 * MIB);
  assert.equal(result.games[0].incrementBytes, 55 * MIB);
  assert.equal(result.games[0].passed, false);
  assert.equal(result.games[1].peakRssBytes, 95 * MIB);
  assert.equal(result.games[1].passed, true);
});

test("an idle high-water increase fails even when every sampled idle RSS is below budget", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 80, 80],
    ["game:0", 90, 90],
    ["idle:0", 80, 90],
    ["idle:0", 80, 120],
  ]), { requiredGames: 1 });
  assert.equal(result.passed, false);
  assert.equal(result.idlePeakRssBytes, 120 * MIB);
  assert.equal(result.games[0].passed, true, "An idle peak must not be charged to the preceding game");
  assert.deepEqual(result.idlePhases.find((phase) => phase.phase === "idle:0"), {
    phase: "idle:0", sampledPeakRssBytes: 80 * MIB,
    attributedLifetimePeakRssBytes: 120 * MIB, peakRssBytes: 120 * MIB,
  });
  assert.ok(result.violations.some((message) => message.includes("idle:0") && message.includes("120.00 MiB")));
});

test("new cold-idle peaks count while unchanged startup and game peaks do not", () => {
  const increase = evaluateMemory(readings([
    ["startup", 70, 80], ["cold-idle", 80, 80], ["cold-idle", 80, 110],
    ["game:0", 90, 110], ["idle:0", 80, 110],
  ]));
  assert.equal(increase.passed, false);
  assert.equal(increase.idlePeakRssBytes, 110 * MIB);
  const unchanged = evaluateMemory(readings([
    ["startup", 70, 200], ["cold-idle", 80, 200],
    ["game:0", 90, 200], ["idle:0", 80, 200], ["idle:0", 80, 200],
  ]));
  assert.equal(unchanged.passed, true);
  assert.equal(unchanged.idlePeakRssBytes, 80 * MIB);
  assert.ok(unchanged.idlePhases.every((phase) => phase.attributedLifetimePeakRssBytes === null));
  const gamePeak = evaluateMemory(readings([
    ["cold-idle", 80, 80], ["game:0", 90, 120], ["idle:0", 80, 120],
  ]));
  assert.equal(gamePeak.passed, true);
  assert.equal(gamePeak.idlePeakRssBytes, 80 * MIB);
});

test("cleanup RSS and newly observed cleanup high-water marks count for the game", () => {
  for (const [cleanupRss, cleanupPeak] of [[120, 120], [70, 120]]) {
    const result = evaluateMemory(readings([
      ["cold-idle", 60, 60],
      ["game:0", 90, 90],
      ["cleanup:0", cleanupRss, cleanupPeak],
      ["idle:0", 60, cleanupPeak],
    ]));
    assert.equal(result.passed, false);
    assert.equal(result.games[0].incrementBytes, 60 * MIB);
  }
});

test("leaked memory from an earlier game does not reset the next game's baseline", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 40, 40],
    ["game:0", 80, 80],
    ["idle:0", 70, 80],
    ["game:1", 100, 100],
    ["idle:1", 70, 100],
  ]));
  assert.equal(result.passed, false);
  assert.equal(result.games[0].passed, true);
  assert.equal(result.games[1].incrementBytes, 60 * MIB);
  assert.equal(result.games[1].passed, false);
});

test("an unbounded first high-water mark is not attributed to the first game", () => {
  const result = evaluateMemory(readings([
    ["cold-idle", 80],
    ["game:0", 90, 200],
    ["idle:0", 80, 200],
  ]));
  assert.equal(result.passed, true);
  assert.equal(result.games[0].peakRssBytes, 90 * MIB);
  assert.equal(result.processLifetimePeakRssBytes, 200 * MIB);
});

test("reports actual sample spacing and long reads, with timestamp fallback", () => {
  const samples = readings([
    ["cold-idle", 80], ["game:0", 90], ["idle:0", 80],
  ]);
  samples[0].sampleStartedAt = 0;
  samples[0].timestamp = 550;
  samples[1].sampleStartedAt = 650;
  samples[1].timestamp = 660;
  delete samples[2].sampleStartedAt;
  samples[2].timestamp = 1000;
  const result = evaluateMemory(samples);
  assert.equal(result.sampleMaxGapMs, 650);
  assert.equal(result.processLifetimePeakRssBytes, null);
  assert.equal(result.observedPeakRssBytes, 90 * MIB);
  assert.ok(result.limitations.some((text) => text.includes("no OS lifetime")));
});

test("rejects invalid budgets and clamps negative per-game growth to zero", () => {
  const samples = readings([
    ["cold-idle", 80], ["game:0", 70], ["idle:0", 70],
  ]);
  assert.throws(() => evaluateMemory(samples, { idleMiB: -1 }), /idleMiB/);
  assert.throws(() => evaluateMemory(samples, { gameMiB: NaN }), /gameMiB/);
  assert.throws(() => evaluateMemory(samples, { requiredGames: 0 }), /requiredGames/);
  const result = evaluateMemory(samples, { gameMiB: 0 });
  assert.equal(result.passed, true);
  assert.equal(result.games[0].incrementBytes, 0);
});
