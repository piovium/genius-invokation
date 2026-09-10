import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createServer } from "node:http";
import { setImmediate as nextTurn } from "node:timers/promises";
import { WebSocket } from "ws";
import { decodeGameFrame } from "@gi-tcg/typings";
import { attachRoomWebSocketServer } from "../room-transport/websocket";
import type { Rooms } from "./rooms";
import type { RoomEvent, RoomSubscriber } from "./types";

const TEST_TIMEOUT_MS = 15_000;
const SOCKET_TIMEOUT_MS = 2000;
const CLOSE_TIMEOUT_MS = 10_000;
// Application-queue budget for a paused consumer, plus the overshoot the
// transport allows for the frame that is in flight when the cap trips.
const BUFFER_LIMIT_BYTES = 512 * 1024;
const BUFFER_TOLERANCE_BYTES = 128;
// Notification payload size used to fill the socket.
const FRAME_BYTES = 16 * 1024;
// Safety cap so a stalled eviction cannot loop forever.
const SEND_LIMIT = 2048;
// The real socket must fill before the application queue can trip.
const MIN_SENDS_TO_FILL_SOCKET = 32;
// Upper bound on waiting for the healthy room to drain its backlog.
const MESSAGE_DRAIN_TIMEOUT_MS = 2000;
// Standard WebSocket close codes observed here.
const CLOSE_CODES = {
  normal: 1000,
  tryAgainLater: 1013,
} as const;
const ROUNDS = 4;
const ROOMS_PER_ROUND = 8;
const FIRST_ROOM_ID = 100;

// These are transport saturation tests. Room events are supplied directly;
// full engine games and persistence are covered by the production harness.
/**
 * Spins the event loop until `check` holds. A disconnect is observable on the
 * server one or more turns after the client sees its own close event, and that
 * delay differs per platform, so the tests wait for the state instead of
 * assuming a fixed number of turns.
 */
async function waitFor(
  check: () => boolean,
  message: string,
  deadlineMs = 5000,
) {
  const deadline = Date.now() + deadlineMs;
  while (!check()) {
    assert.ok(Date.now() < deadline, message);
    await nextTurn();
  }
}

async function fixture() {
  const subscriptions = new Map<number, Set<RoomSubscriber>>();
  const rooms: Pick<
    Rooms,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  > = {
    subscribePlayer(roomId, visitor, target, subscriber) {
      assert.equal(visitor, null);
      assert.equal(target, 1);
      const members = subscriptions.get(roomId) ?? new Set<RoomSubscriber>();
      subscriptions.set(roomId, members);
      return {
        sessionId: `room-${roomId}`,
        ownPlayer: false,
        subscribe() {
          members.add(subscriber);
          return () => {
            members.delete(subscriber);
          };
        },
      };
    },
    receivePlayerResponse() {
      throw new Error("Spectator action reached room");
    },
    receivePlayerGiveUp() {
      throw new Error("Spectator giveUp reached room");
    },
  };
  const http = createServer((_request, response) =>
    response.writeHead(404).end(),
  );
  const transport = attachRoomWebSocketServer(http, rooms, {
    verify: () => null,
  });
  const clients = new Set<WebSocket>();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  return {
    subscriptions,
    transport,
    async connect(roomId: number) {
      const socket = new WebSocket(
        `ws://127.0.0.1:${address.port}/api/rooms/${roomId}/players/1/ws`,
      );
      clients.add(socket);
      socket.on("error", () => {});
      await once(socket, "open", {
        signal: AbortSignal.timeout(SOCKET_TIMEOUT_MS),
      });
      const ready = once(socket, "message", {
        signal: AbortSignal.timeout(SOCKET_TIMEOUT_MS),
      });
      socket.send(JSON.stringify({ type: "auth", token: "" }));
      const [bytes, binary] = await ready;
      assert.equal(binary, false);
      assert.deepEqual(JSON.parse(String(bytes)), {
        type: "ready",
        sessionId: `room-${roomId}`,
      });
      return socket;
    },
    emit(roomId: number, event: RoomEvent) {
      for (const subscriber of subscriptions.get(roomId) ?? [])
        subscriber.send(event);
    },
    async close() {
      for (const socket of clients) socket.terminate();
      await transport.close();
      assert.equal(transport.webSockets.clients.size, 0);
      for (const subscribers of subscriptions.values())
        assert.equal(subscribers.size, 0);
      await new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

test(
  "a paused TCP consumer is evicted with a bounded queue while another room keeps receiving",
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    const service = await fixture();
    try {
      const slow = await service.connect(10);
      const fast = await service.connect(20);
      const fastMessages: number[] = [];
      fast.on("message", (bytes, binary) => {
        assert.equal(binary, true);
        const frame = decodeGameFrame(new Uint8Array(bytes as Buffer));
        assert.equal(frame.type, "notification");
        if (frame.type === "notification")
          fastMessages.push(
            new DataView(frame.data.buffer, frame.data.byteOffset).getUint32(0),
          );
      });
      slow.pause(); // Public ws API pauses reads from the actual client TCP socket.
      const slowClosed = once(slow, "close", {
        signal: AbortSignal.timeout(CLOSE_TIMEOUT_MS),
      });
      let maximumBuffered = 0;
      let sent = 0;
      while (service.subscriptions.get(10)!.size > 0 && sent < SEND_LIMIT) {
        const data = new Uint8Array(FRAME_BYTES);
        // Stamp each frame with its big-endian index so the client can assert order.
        new DataView(data.buffer).setUint32(0, sent);
        service.emit(10, { type: "notification", data });
        service.emit(20, { type: "notification", data: data.subarray(0, 4) });
        sent++;
        for (const socket of service.transport.webSockets.clients)
          maximumBuffered = Math.max(maximumBuffered, socket.bufferedAmount);
        await nextTurn();
      }
      assert.equal(
        service.subscriptions.get(10)!.size,
        0,
        "Slow subscription must be released before the load cap",
      );
      assert.ok(
        sent > MIN_SENDS_TO_FILL_SOCKET,
        "Test must fill the real socket before the 512 KiB application queue",
      );
      assert.ok(
        maximumBuffered <= BUFFER_LIMIT_BYTES + BUFFER_TOLERANCE_BYTES,
        `Observed application queue: ${maximumBuffered}`,
      );
      slow.resume();
      const [code, reason] = await slowClosed;
      assert.equal(code, CLOSE_CODES.tryAgainLater);
      assert.equal(String(reason), "SLOW_CONSUMER");
      const deadline = Date.now() + MESSAGE_DRAIN_TIMEOUT_MS;
      while (fastMessages.length < sent && Date.now() < deadline)
        await nextTurn();
      assert.deepEqual(
        fastMessages,
        Array.from({ length: sent }, (_, i) => i),
      );
      assert.equal(fast.readyState, WebSocket.OPEN);
      assert.equal(service.subscriptions.get(20)!.size, 1);
    } finally {
      await service.close();
    }
  },
);

test(
  "concurrent room subscriptions remain isolated and repeated disconnects release every binding",
  { timeout: TEST_TIMEOUT_MS },
  async () => {
    const service = await fixture();
    try {
      for (let round = 0; round < ROUNDS; round++) {
        const sockets = await Promise.all(
          Array.from({ length: ROOMS_PER_ROUND }, (_, i) =>
            service.connect(FIRST_ROOM_ID + i),
          ),
        );
        const received = sockets.map((socket) =>
          once(socket, "message", {
            signal: AbortSignal.timeout(SOCKET_TIMEOUT_MS),
          }),
        );
        for (let i = 0; i < sockets.length; i++)
          service.emit(FIRST_ROOM_ID + i, {
            type: "notification",
            data: Uint8Array.of(round, i),
          });
        for (const [i, result] of (await Promise.all(received)).entries()) {
          const [bytes, binary] = result;
          assert.equal(binary, true);
          const frame = decodeGameFrame(new Uint8Array(bytes as Buffer));
          assert.equal(frame.type, "notification");
          if (frame.type === "notification")
            assert.deepEqual(frame.data, Uint8Array.of(round, i));
        }
        await Promise.all(
          sockets.map(async (socket) => {
            const closed = once(socket, "close", {
              signal: AbortSignal.timeout(SOCKET_TIMEOUT_MS),
            });
            socket.close(CLOSE_CODES.normal);
            await closed;
          }),
        );
        await waitFor(
          () =>
            service.transport.webSockets.clients.size === 0 &&
            [...service.subscriptions.values()].every(
              (members) => members.size === 0,
            ),
          "every disconnected binding must be released before the next round",
        );
      }
    } finally {
      await service.close();
    }
  },
);
