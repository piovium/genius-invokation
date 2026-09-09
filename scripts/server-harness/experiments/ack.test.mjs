import assert from "node:assert/strict";
import test from "node:test";
import { bunAvailability, startExperimentServer } from "./helpers.mjs";
import { runAckExperiments } from "./ack.mjs";

const bun = bunAvailability();
test("real Bun WebSocket ACK loss, retries, conflicts, stale IDs, and concurrency", { skip: bun.available ? false : `Bun missing: ${bun.reason}`, timeout: 30000 }, async () => {
  const server = await startExperimentServer();
  try {
    const result = await runAckExperiments(server);
    assert.equal(result.passed, true);
    assert.equal(result.cases.length, 9);
    assert.ok(result.cases.every((entry) => entry.passed));
    const afterAccept = result.cases.find((entry) => entry.name === "disconnect-after-accept-before-ack");
    assert.equal(afterAccept.evidence.ackObservedBeforeDisconnect, false);
    assert.equal(afterAccept.evidence.executionsBeforeRetry, 1);
    assert.equal(afterAccept.evidence.executionsAfterRetry, 1);
    const cache = result.cases.find((entry) => entry.name === "bounded-cache-and-stale-command");
    assert.equal(cache.evidence.maxCacheSize, 32);
    assert.equal(cache.evidence.executionsAfterStaleRetry, 48);
  } finally { await server.stop(); }
});
