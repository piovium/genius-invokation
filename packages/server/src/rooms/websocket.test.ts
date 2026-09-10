import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createServer } from "node:http";
import { CURRENT_VERSION, type RpcRequest } from "@gi-tcg/core";
import { decodeGameFrame, encodeGameFrame } from "@gi-tcg/typings";
import { createAuth } from "../auth/session";
import { createGuestId } from "../auth/guest-id";
import { unauthorized } from "../errors";
import { attachRoomWebSocketServer } from "../room-transport/websocket";
import { Player } from "./player";
import type { Rooms } from "./rooms";

const cleanups = new Set<() => Promise<void>>();
afterEach(async () => {
  for (const cleanup of cleanups) await cleanup();
});

function record(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

async function connect(url: string) {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  const messages: {
    value: Record<string, unknown>;
    binary: boolean;
    consumed: boolean;
  }[] = [];
  const waiters = new Set<() => void>();
  const closed = Promise.withResolvers<number>();
  let closedCode: number | null = null;
  socket.addEventListener("message", ({ data }) => {
    const binary = typeof data !== "string";
    messages.push({
      value: record(
        binary ? decodeGameFrame(new Uint8Array(data)) : JSON.parse(data),
      ),
      binary,
      consumed: false,
    });
    for (const waiter of waiters) waiter();
  });
  socket.addEventListener("close", ({ code }) => {
    closedCode = code;
    closed.resolve(code);
    for (const waiter of waiters) waiter();
  });
  socket.addEventListener("error", () => {});
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket connect timed out: " + url)),
      1000,
    );
    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("WebSocket connect failed"));
      },
      { once: true },
    );
  });
  return {
    socket,
    messages,
    closed: closed.promise,
    send: (value: unknown) => socket.send(JSON.stringify(value)),
    respond: (id: number) =>
      socket.send(
        new Uint8Array(
          encodeGameFrame({
            type: "actionResponse",
            id,
            response: Uint8Array.of(0x12, 0),
          }),
        ),
      ),
    next(type: string) {
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters.delete(check);
          reject(new Error("Expected message timed out: " + type));
        }, 3000);
        const check = () => {
          const entry = messages.find(
            (entry) => !entry.consumed && entry.value.type === type,
          );
          if (entry) {
            entry.consumed = true;
            waiters.delete(check);
            clearTimeout(timer);
            resolve(entry.value);
          } else if (closedCode !== null) {
            waiters.delete(check);
            clearTimeout(timer);
            reject(new Error("Socket closed: " + closedCode));
          }
        };
        waiters.add(check);
        check();
      });
    },
    async close() {
      if (closedCode === null) socket.close(1000);
      await closed.promise;
    },
  };
}

async function fixture({ dropAck = false, watchable = false } = {}) {
  const playerId = createGuestId();
  const player = new Player(
    {
      isGuest: true,
      id: playerId,
      name: "WS test",
      deck: { characters: [], cards: [] },
    },
    "real-player-session",
  );
  player.setTimeoutConfig({
    initTotalActionTime: 45,
    rerollTime: 40,
    roundTotalActionTime: 60,
    actionTime: 25,
    gameVersion: CURRENT_VERSION,
    watchable,
    private: true,
    allowGuest: true,
  });
  const auth = createAuth({
    users: {
      create: async () => {
        throw new Error("OAuth is outside this room-transport test");
      },
    },
    secret: "independent-production-ws-test-secret",
  });
  const token = await auth.signGuest(playerId);
  let terminate: (() => void) | undefined;
  // Test-only room routing injects a disconnect at the acceptance/ACK boundary;
  // transport, JWT verification, protobuf encoding, and Player IO are real.
  const rooms: Pick<
    Rooms,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  > = {
    subscribePlayer(_roomId, visitor, target, subscriber) {
      if (target !== playerId || (visitor !== playerId && !watchable))
        throw unauthorized();
      return {
        sessionId: player.sessionId,
        ownPlayer: visitor === playerId,
        subscribe: () => player.subscribe(subscriber),
      };
    },
    receivePlayerResponse(_roomId, _playerId, id, bytes) {
      const ack = player.receiveResponse(id, bytes);
      if (dropAck) {
        dropAck = false;
        terminate?.();
      }
      return ack;
    },
    receivePlayerGiveUp() {
      return { type: "ack", command: "giveUp", sessionId: player.sessionId };
    },
  };
  const http = createServer((_request, response) => {
    response.writeHead(404).end();
  });
  const transport = attachRoomWebSocketServer(http, rooms, auth, "");
  transport.webSockets.on("connection", (socket) => {
    const terminateSocket = () => socket.terminate();
    terminate = terminateSocket;
    socket.once("close", () => {
      if (terminate === terminateSocket) terminate = undefined;
    });
  });
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(0, "127.0.0.1", resolve);
  });
  const address = http.address();
  assert.ok(address && typeof address === "object");
  const stop = async () => {
    cleanups.delete(stop);
    player.dispose();
    await transport.close();
    assert.equal(transport.webSockets.clients.size, 0);
    await new Promise<void>((resolve, reject) =>
      http.close((error) => (error ? reject(error) : resolve())),
    );
  };
  cleanups.add(stop);
  return {
    player,
    token,
    url: `ws://127.0.0.1:${address.port}/rooms/10/players/${playerId}/ws`,
    connectionCount: () => transport.webSockets.clients.size,
    stop,
  };
}

const switchHands: RpcRequest = {
  request: { $case: "switchHands", value: {} },
};

test(
  "Node ws sends real binary RPCs and a disconnected accepted response recovers its ACK once",
  { timeout: 5000 },
  async () => {
    const server = await fixture({ dropAck: true });
    let executions = 0;
    const response = server.player.rpc(switchHands).then(() => {
      executions++;
    });
    void response.catch(() => {}); // Teardown may cancel IO after an earlier assertion failed.
    const first = await connect(server.url);
    try {
      first.send({ type: "auth", token: server.token });
      const ready = await first.next("ready");
      const rpc = await first.next("rpc");
      assert.equal(record(rpc.data).id, 0);
      assert.equal(
        first.messages.find((entry) => entry.value.type === "rpc")?.binary,
        true,
      );
      first.respond(0);
      assert.equal(await first.closed, 1006);
      await response;
      assert.equal(executions, 1);
      assert.equal(
        first.messages.some((entry) => entry.value.type === "ack"),
        false,
      );
      const second = await connect(server.url);
      try {
        second.send({ type: "auth", token: server.token });
        assert.equal((await second.next("ready")).sessionId, ready.sessionId);
        assert.equal((await second.next("rpc")).data, null);
        second.respond(0);
        assert.equal((await second.next("ack")).sessionId, ready.sessionId);
        second.respond(0);
        assert.equal((await second.next("ack")).id, 0);
        assert.equal(executions, 1);
      } finally {
        await second.close();
      }
    } finally {
      await first.close();
      await server.stop();
    }
  },
);

test(
  "rejected first-frame auth is terminal even if valid auth and an action are already queued",
  { timeout: 5000 },
  async () => {
    const server = await fixture();
    const client = await connect(server.url);
    try {
      client.send({ type: "auth", token: "invalid" });
      client.send({ type: "auth", token: server.token });
      client.respond(0);
      assert.equal(await client.closed, 1008);
      assert.equal(client.messages.length, 0);
    } finally {
      await client.close();
      await server.stop();
    }
  },
);

test(
  "explicit anonymous spectators authenticate for watchable rooms but cannot act",
  { timeout: 5000 },
  async () => {
    const server = await fixture({ watchable: true });
    const client = await connect(server.url);
    try {
      client.send({ type: "auth", token: "" });
      assert.equal(
        (await client.next("ready")).sessionId,
        "real-player-session",
      );
      client.respond(0);
      assert.equal((await client.next("commandError")).code, "FORBIDDEN");
      client.send({ type: "giveUp" });
      assert.equal((await client.next("commandError")).command, "giveUp");
    } finally {
      await client.close();
      await server.stop();
    }
  },
);

test(
  "Node transport shutdown releases authenticated and unauthenticated sockets",
  { timeout: 5000 },
  async () => {
    const server = await fixture();
    const active = await connect(server.url);
    const pending = await connect(server.url);
    active.send({ type: "auth", token: server.token });
    await active.next("ready");
    assert.equal(server.connectionCount(), 2);
    await server.stop();
    await Promise.all([active.closed, pending.closed]);
    assert.equal(server.connectionCount(), 0);
  },
);

test(
  "Node transport rejects an oversized incoming frame before authentication",
  { timeout: 5000 },
  async () => {
    const server = await fixture();
    const client = await connect(server.url);
    try {
      client.socket.send(new Uint8Array(64 * 1024 + 1));
      assert.equal(await client.closed, 1009);
      assert.equal(client.messages.length, 0);
    } finally {
      await client.close();
      await server.stop();
    }
  },
);
