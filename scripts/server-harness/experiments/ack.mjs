import assert from "node:assert/strict";
import { authenticate } from "./helpers.mjs";

const responseBytes = Uint8Array.of(0x12, 0);
const conflictingResponse = Uint8Array.of(0x12, 2, 0x08, 2);
const waitAck = (client, id) => client.next((value) => value.type === "ack" && value.id === id);
const waitError = (client, id) => client.next((value) => value.type === "commandError" && value.id === id);
const waitRpc = (client, id) => client.next((value) => value.type === "rpc" && value.data.id === id);

function checkStats(stats, executions, cacheSize) {
  assert.equal(stats.executionCount, executions, "ACK correctness must match actual server execution count");
  assert.equal(stats.cacheSize, cacheSize, "Deduplication cache must match actual server state");
}

async function ackFor(client, id) {
  client.sendResponse(id, responseBytes);
  const ack = await waitAck(client, id);
  assert.equal(ack.command, "actionResponse");
  return ack;
}

async function runCase(name, run) {
  const started = performance.now();
  const evidence = await run();
  return { name, passed: true, elapsedMs: Math.round(performance.now() - started), evidence };
}

export async function runAckExperiments(server) {
  const cases = [];
  cases.push(await runCase("normal-ack-and-next-rpc", async () => {
    const room = await server.createRoom();
    const client = await authenticate(server, room);
    try {
      assert.equal(client.ready.sessionId, room.sessionId);
      assert.equal(client.rpc.data.id, 1);
      assert.deepEqual(client.rpc.data.request, responseBytes);
      const ack = await ackFor(client, 1);
      assert.equal(ack.sessionId, room.sessionId);
      await waitRpc(client, 2);
      const stats = await server.stats(room.roomId);
      checkStats(stats, 1, 1);
      assert.equal(client.messages.find((entry) => entry.value.type === "rpc").binary, true);
      assert.equal(client.messages.find((entry) => entry.value.type === "ack").binary, false);
      return { executionCount: stats.executionCount, cacheSize: stats.cacheSize, nextRpcId: stats.players[0].nextRpcId, gameFrames: "binary", ackFrames: "JSON" };
    } finally { await client.close(); }
  }));

  cases.push(await runCase("disconnect-before-send", async () => {
    const room = await server.createRoom();
    const first = await authenticate(server, room);
    await first.close();
    checkStats(await server.stats(room.roomId), 0, 0);
    const second = await authenticate(server, room);
    try {
      assert.equal(second.ready.sessionId, first.ready.sessionId);
      assert.equal(second.rpc.data.id, first.rpc.data.id);
      await ackFor(second, first.rpc.data.id);
      checkStats(await server.stats(room.roomId), 1, 1);
      return { beforeReconnectExecutions: 0, afterRetryExecutions: 1, pendingRpcPreserved: true, sessionPreserved: true };
    } finally { await second.close(); }
  }));

  for (const fault of ["before-accept", "after-accept-before-ack", "after-ack"]) {
    cases.push(await runCase(`disconnect-${fault}`, async () => {
      const room = await server.createRoom({ fault });
      const first = await authenticate(server, room);
      first.sendResponse(1);
      const originalAck = fault === "after-ack" ? await waitAck(first, 1) : null;
      const close = await first.waitClosed();
      assert.equal(close.code, fault === "after-ack" ? 1012 : 1006);
      const observedAcks = first.messages.filter((entry) => entry.value.type === "ack");
      assert.equal(observedAcks.length, fault === "after-ack" ? 1 : 0);
      const beforeRetry = await server.stats(room.roomId);
      const accepted = fault !== "before-accept";
      checkStats(beforeRetry, accepted ? 1 : 0, accepted ? 1 : 0);
      assert.equal(beforeRetry.faultTriggered, true);

      const second = await authenticate(server, room);
      try {
        assert.equal(second.ready.sessionId, first.ready.sessionId);
        assert.equal(second.rpc.data.id, accepted ? 2 : 1);
        const retriedAck = await ackFor(second, 1);
        if (originalAck) assert.deepEqual(retriedAck, originalAck, "A duplicate command must replay its original ACK");
        const afterRetry = await server.stats(room.roomId);
        checkStats(afterRetry, 1, 1);
        return {
          fault, closeCode: close.code, ackObservedBeforeDisconnect: observedAcks.length === 1,
          executionsBeforeRetry: beforeRetry.executionCount, executionsAfterRetry: afterRetry.executionCount,
          pendingRpcOnReconnect: second.rpc.data.id, cacheSize: afterRetry.cacheSize, sessionPreserved: true,
        };
      } finally { await second.close(); }
    }));
  }

  cases.push(await runCase("duplicate-conflict-future-invalid", async () => {
    const room = await server.createRoom();
    const client = await authenticate(server, room);
    try {
      const original = await ackFor(client, 1);
      const duplicate = await ackFor(client, 1);
      assert.deepEqual(duplicate, original);
      checkStats(await server.stats(room.roomId), 1, 1);

      client.sendResponse(1, conflictingResponse);
      const conflict = await waitError(client, 1);
      assert.equal(conflict.code, "CONFLICT");
      checkStats(await server.stats(room.roomId), 1, 1);

      client.sendResponse(3);
      const future = await waitError(client, 3);
      assert.equal(future.code, "FUTURE_RPC");
      checkStats(await server.stats(room.roomId), 1, 1);

      client.sendResponse(2, Uint8Array.of(0));
      const invalid = await waitError(client, 2);
      assert.equal(invalid.code, "INVALID_RESPONSE");
      checkStats(await server.stats(room.roomId), 1, 1);
      await ackFor(client, 2);
      checkStats(await server.stats(room.roomId), 2, 2);
      return { duplicateAckIdentical: true, duplicateExecutions: 0, rejected: [conflict.code, future.code, invalid.code], executionsAfterCorrectedResponse: 2 };
    } finally { await client.close(); }
  }));

  cases.push(await runCase("bounded-cache-and-stale-command", async () => {
    const cacheLimit = 32;
    const commandCount = 48;
    const room = await server.createRoom({ cacheLimit });
    const client = await authenticate(server, room);
    let maxCacheSize = 0;
    let latestAck;
    try {
      for (let id = 1; id <= commandCount; id++) {
        latestAck = await ackFor(client, id);
        await waitRpc(client, id + 1);
        const stats = await server.stats(room.roomId);
        checkStats(stats, id, Math.min(id, cacheLimit));
        maxCacheSize = Math.max(maxCacheSize, stats.cacheSize);
      }
      client.sendResponse(1);
      const stale = await waitError(client, 1);
      assert.equal(stale.code, "STALE_RPC");
      assert.equal(stale.resyncRequired, true);
      assert.deepEqual(await ackFor(client, commandCount), latestAck);
      checkStats(await server.stats(room.roomId), commandCount, cacheLimit);
    } finally { await client.close(); }
    const reconnected = await authenticate(server, room);
    try {
      assert.equal(reconnected.rpc.data.id, commandCount + 1);
      reconnected.sendResponse(1);
      assert.equal((await waitError(reconnected, 1)).code, "STALE_RPC");
      const stats = await server.stats(room.roomId);
      checkStats(stats, commandCount, cacheLimit);
      assert.equal(reconnected.messages.some((entry) => entry.value.type === "ack" && entry.value.id === 1), false);
      return { acceptedCommands: commandCount, maxCacheSize, cacheLimit, executionsAfterStaleRetry: stats.executionCount, staleRequiresResync: true, nextRpcOnReconnect: reconnected.rpc.data.id };
    } finally { await reconnected.close(); }
  }));

  cases.push(await runCase("two-connections-one-player-same-command", async () => {
    const room = await server.createRoom();
    const first = await authenticate(server, room);
    const second = await authenticate(server, room);
    try {
      assert.equal(first.rpc.data.id, second.rpc.data.id);
      first.sendResponse(1);
      second.sendResponse(1);
      const [firstAck, secondAck] = await Promise.all([waitAck(first, 1), waitAck(second, 1)]);
      assert.deepEqual(firstAck, secondAck);
      const stats = await server.stats(room.roomId);
      checkStats(stats, 1, 1);
      assert.equal(stats.authenticatedConnections, 2);
      assert.equal(stats.players[0].nextRpcId, 2);
      return { connections: 2, commandsSent: 2, executionCount: stats.executionCount, cacheSize: stats.cacheSize, identicalAcks: true };
    } finally { await Promise.all([first.close(), second.close()]); }
  }));

  cases.push(await runCase("same-command-id-isolated-between-players", async () => {
    const room = await server.createRoom();
    const first = await authenticate(server, room, room.players[0]);
    const second = await authenticate(server, room, room.players[1]);
    try {
      await Promise.all([ackFor(first, 1), ackFor(second, 1)]);
      const stats = await server.stats(room.roomId);
      checkStats(stats, 2, 2);
      assert.deepEqual(stats.players.map((player) => player.executionCount), [1, 1]);
      return { sameRpcId: 1, executionsByPlayer: stats.players.map((player) => player.executionCount), totalExecutions: 2 };
    } finally { await Promise.all([first.close(), second.close()]); }
  }));

  const beforeAccept = cases.find((entry) => entry.name === "disconnect-before-accept").evidence;
  const beforeAck = cases.find((entry) => entry.name === "disconnect-after-accept-before-ack").evidence;
  assert.equal(beforeAccept.closeCode, beforeAck.closeCode);
  assert.equal(beforeAccept.ackObservedBeforeDisconnect, beforeAck.ackObservedBeforeDisconnect);
  assert.notEqual(beforeAccept.executionsBeforeRetry, beforeAck.executionsBeforeRetry);

  return {
    passed: cases.every((result) => result.passed), cases,
    observedAmbiguity: {
      clientObservation: { closeCode: beforeAccept.closeCode, ackObserved: false },
      possibleServerExecutionCounts: [beforeAccept.executionsBeforeRetry, beforeAck.executionsBeforeRetry],
      conclusion: "The same observed disconnect can mean either unaccepted or accepted. A missing ACK is an unknown outcome, so reconnect, resynchronize, and deduplicate retries.",
    },
    recommendation: "Keep an explicit ACK after acceptance; on reconnect authenticate again, check the same game session, recover the current pending RPC, and only retry an uncertain command with the original RPC ID and identical bytes. Deduplicate by session/player/RPC ID plus payload digest with a bounded cache. Reject conflicts, future IDs, and evicted stale IDs without executing them.",
    limits: [
      "The fixture proves one-process protocol behavior through real Node TCP/WebSocket connections; it does not prove production game or database correctness.",
      "The fixture uses a synchronous in-memory acceptance counter. Production acceptance and game execution must share an atomic boundary before ACK; a receipt-only ACK would not provide this result.",
      "The cache is volatile. Process restarts, cross-process workers, deployed proxies, and durable exactly-once execution are outside this experiment.",
      "A 32-entry cache demonstrates bounded retention only. This experiment does not establish the best production cache size or the 100/50 MiB game memory budgets.",
      "Faults before acceptance and before ACK use forced socket termination. The after-ACK case sends the ACK and then closes gracefully to test queued ACK delivery before close.",
    ],
  };
}
