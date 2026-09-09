import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createServer } from "node:http";
import { setImmediate as nextTurn } from "node:timers/promises";
import { WebSocket } from "ws";
import { decodeGameFrame } from "@gi-tcg/typings";
import { attachRoomWebSocketServer } from "../room-transport/websocket";
import type { RoomsService } from "./rooms.service";
import type { RoomEvent, RoomSubscriber } from "./types";

// These are transport saturation tests. Room events are supplied directly;
// full engine games and persistence are covered by the production harness.
async function fixture() {
  const subscriptions = new Map<number, Set<RoomSubscriber>>();
  const rooms: Pick<RoomsService, "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"> = {
    subscribePlayer(roomId, visitor, target, subscriber) {
      assert.equal(visitor, null);
      assert.equal(target, 1);
      const members = subscriptions.get(roomId) ?? new Set<RoomSubscriber>();
      subscriptions.set(roomId, members);
      return {
        sessionId: `room-${roomId}`, ownPlayer: false,
        subscribe() {
          members.add(subscriber);
          return () => { members.delete(subscriber); };
        },
      };
    },
    receivePlayerResponse() { throw new Error("Spectator action reached room"); },
    receivePlayerGiveUp() { throw new Error("Spectator giveUp reached room"); },
  };
  const http = createServer((_request, response) => response.writeHead(404).end());
  const transport = attachRoomWebSocketServer(http, rooms, { verify: () => null });
  const clients = new Set<WebSocket>();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  return {
    subscriptions, transport,
    async connect(roomId: number) {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/rooms/${roomId}/players/1/ws`);
      clients.add(socket);
      socket.on("error", () => {});
      await once(socket, "open", { signal: AbortSignal.timeout(2000) });
      const ready = once(socket, "message", { signal: AbortSignal.timeout(2000) });
      socket.send(JSON.stringify({ type: "auth", token: "" }));
      const [bytes, binary] = await ready;
      assert.equal(binary, false);
      assert.deepEqual(JSON.parse(String(bytes)), { type: "ready", sessionId: `room-${roomId}` });
      return socket;
    },
    emit(roomId: number, event: RoomEvent) {
      for (const subscriber of subscriptions.get(roomId) ?? []) subscriber.send(event);
    },
    async close() {
      for (const socket of clients) socket.terminate();
      await transport.close();
      assert.equal(transport.webSockets.clients.size, 0);
      for (const subscribers of subscriptions.values()) assert.equal(subscribers.size, 0);
      await new Promise<void>((resolve, reject) => http.close((error) => error ? reject(error) : resolve()));
    },
  };
}

test("a paused TCP consumer is evicted with a bounded queue while another room keeps receiving", { timeout: 15000 }, async () => {
  const service = await fixture();
  try {
    const slow = await service.connect(10);
    const fast = await service.connect(20);
    const fastMessages: number[] = [];
    fast.on("message", (bytes, binary) => {
      assert.equal(binary, true);
      const frame = decodeGameFrame(new Uint8Array(bytes as Buffer));
      assert.equal(frame.type, "notification");
      if (frame.type === "notification") fastMessages.push(new DataView(frame.data.buffer, frame.data.byteOffset).getUint32(0));
    });
    slow.pause(); // Public ws API pauses reads from the actual client TCP socket.
    const slowClosed = once(slow, "close", { signal: AbortSignal.timeout(10000) });
    let maximumBuffered = 0;
    let sent = 0;
    while (service.subscriptions.get(10)!.size > 0 && sent < 2048) {
      const data = new Uint8Array(16 * 1024);
      new DataView(data.buffer).setUint32(0, sent);
      service.emit(10, { type: "notification", data });
      service.emit(20, { type: "notification", data: data.subarray(0, 4) });
      sent++;
      for (const socket of service.transport.webSockets.clients) maximumBuffered = Math.max(maximumBuffered, socket.bufferedAmount);
      await nextTurn();
    }
    assert.equal(service.subscriptions.get(10)!.size, 0, "Slow subscription must be released before the load cap");
    assert.ok(sent > 32, "Test must fill the real socket before the 512 KiB application queue");
    assert.ok(maximumBuffered <= 512 * 1024 + 128, `Observed application queue: ${maximumBuffered}`);
    slow.resume();
    const [code, reason] = await slowClosed;
    assert.equal(code, 1013);
    assert.equal(String(reason), "SLOW_CONSUMER");
    const deadline = Date.now() + 2000;
    while (fastMessages.length < sent && Date.now() < deadline) await nextTurn();
    assert.deepEqual(fastMessages, Array.from({ length: sent }, (_, i) => i));
    assert.equal(fast.readyState, WebSocket.OPEN);
    assert.equal(service.subscriptions.get(20)!.size, 1);
  } finally { await service.close(); }
});

test("concurrent room subscriptions remain isolated and repeated disconnects release every binding", { timeout: 15000 }, async () => {
  const service = await fixture();
  try {
    for (let round = 0; round < 4; round++) {
      const sockets = await Promise.all(Array.from({ length: 8 }, (_, i) => service.connect(100 + i)));
      const received = sockets.map((socket) => once(socket, "message", { signal: AbortSignal.timeout(2000) }));
      for (let i = 0; i < sockets.length; i++) service.emit(100 + i, { type: "notification", data: Uint8Array.of(round, i) });
      for (const [i, result] of (await Promise.all(received)).entries()) {
        const [bytes, binary] = result;
        assert.equal(binary, true);
        const frame = decodeGameFrame(new Uint8Array(bytes as Buffer));
        assert.equal(frame.type, "notification");
        if (frame.type === "notification") assert.deepEqual(frame.data, Uint8Array.of(round, i));
      }
      await Promise.all(sockets.map(async (socket) => {
        const closed = once(socket, "close", { signal: AbortSignal.timeout(2000) });
        socket.close(1000);
        await closed;
      }));
      await nextTurn();
      assert.equal(service.transport.webSockets.clients.size, 0);
      for (const members of service.subscriptions.values()) assert.equal(members.size, 0);
    }
  } finally { await service.close(); }
});
