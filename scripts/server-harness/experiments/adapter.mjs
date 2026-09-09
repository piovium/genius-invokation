import assert from "node:assert/strict";
import { connectTransport } from "../transport.mjs";
import { answerRpc } from "../codec.mjs";

// Verify the actual migration-harness adapter against the real network fixture,
// in addition to experiments that observe raw WebSocket frames directly.
export async function runAdapterExperiments(server) {
  const cases = [];
  for (const fault of ["none", "after-accept-before-ack"]) {
    const start = Date.now();
    const room = await server.createRoom({ fault });
    const options = { kind: "ws", baseUrl: server.baseUrl, roomId: room.roomId,
      playerId: room.players[0].playerId, token: room.players[0].token, timeoutMs: 3000 };
    let session;
    try {
      session = await connectTransport(options);
      assert.equal(session.ready.sessionId, room.sessionId);
      assert.equal((await session.next()).type, "initialized");
      const rpc = await session.next();
      assert.ok(rpc.data.request instanceof Uint8Array);
      const answer = answerRpc(rpc.data.request);
      assert.ok(answer.response instanceof Uint8Array);
      if (fault === "none") {
        await session.sendResponse(rpc.data.id, answer.response);
        assert.equal((await session.next()).data.id, rpc.data.id + 1);
      } else {
        await assert.rejects(session.sendResponse(rpc.data.id, answer.response), /disconnect|connection/i);
        assert.equal((await server.stats(room.roomId)).executionCount, 1);
        session.close();
        session = await connectTransport(options);
        assert.equal(session.ready.sessionId, room.sessionId);
        await session.next();
        assert.equal((await session.next()).data.id, rpc.data.id + 1);
        await session.sendResponse(rpc.data.id, answer.response);
      }
      const stats = await server.stats(room.roomId);
      assert.equal(stats.executionCount, 1);
      cases.push({ name: `real-adapter-${fault}`, passed: true, durationMs: Date.now() - start,
        evidence: { binaryRequest: true, binaryResponse: true, executionCount: stats.executionCount, sameSession: true } });
    } catch (error) {
      cases.push({ name: `real-adapter-${fault}`, passed: false, error: error.message });
    } finally { session?.close(); }
  }
  return { passed: cases.every((entry) => entry.passed), cases };
}
