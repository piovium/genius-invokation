import assert from "node:assert/strict";
import test from "node:test";
import { runAuthExperiments } from "./auth.mjs";
import { bunAvailability, startExperimentServer } from "./helpers.mjs";

const runtime = bunAvailability();

test("real Bun WebSockets enforce authentication and reclaim unauthenticated connections", {
  timeout: 60_000,
  skip: !runtime.available ? `Bun is unavailable: ${runtime.reason}; run the experiment runner with Bun installed for acceptance` : false,
}, async (context) => {
  assert.equal(typeof globalThis.WebSocket, "function", "Use Node 22+ or Bun for the WebSocket experiment client");
  const server = await startExperimentServer();
  try {
    const report = await runAuthExperiments(server);
    assert.equal(report.caseCount, 16);
    for (const result of report.cases) {
      await context.test(result.name, () => {
        assert.equal(result.passed, true, result.error);
        assert.ok(result.evidence);
      });
    }
    assert.equal(report.passed, true, JSON.stringify(report.cases.filter((result) => !result.passed)));
    assert.match(report.scope, /scripted game/);
    assert.ok(report.limitations.length >= 3);
  } finally {
    await server.stop();
  }
});
