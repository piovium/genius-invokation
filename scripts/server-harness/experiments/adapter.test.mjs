import assert from "node:assert/strict";
import test from "node:test";
import { nodeAvailability, startExperimentServer } from "./helpers.mjs";
import { runAdapterExperiments } from "./adapter.mjs";

test("real Node server exercises the binary harness adapter and lost-ACK recovery", {
  timeout: 20000, skip: nodeAvailability().available ? false : "Node is required for real WebSocket experiments",
}, async () => {
  const server = await startExperimentServer();
  try {
    const result = await runAdapterExperiments(server);
    assert.equal(result.passed, true, JSON.stringify(result));
  } finally { await server.stop(); }
});
