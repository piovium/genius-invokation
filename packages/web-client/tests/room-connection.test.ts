import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket as ServerWebSocket } from "ws";
import { decodeGameFrame, encodeGameFrame } from "@gi-tcg/typings";
import {
  RoomConnection,
  RoomConnectionError,
  roomWebSocketUrl,
  type RoomEvent,
} from "../src/room-connection";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, timeout = 2_000) {
  const end = Date.now() + timeout;
  while (!check()) {
    if (Date.now() > end) throw new Error("Network test condition timed out");
    await delay(5);
  }
}

/** Match the current `rpc` request, or any `rpc` with a decoded payload. */
function isRpcEvent(id?: number) {
  return (event: RoomEvent): boolean =>
    event.type === "rpc" &&
    event.data !== null &&
    (id === undefined || event.data.id === id);
}

/** Capture a promise's settlement so its rejection can be asserted later. */
const outcomeOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (error) => error,
  );

const running: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const stop of running.splice(0).reverse()) await stop();
});

interface FixtureOptions {
  fault?: "before-accept" | "after-accept" | "terminal-after-accept";
  rejectAuth?: boolean;
  allowAnonymous?: boolean;
  wrongAckSession?: boolean;
  changeSessionOnReconnect?: boolean;
  missingSession?: boolean;
  commandError?: string;
  ackDelayMs?: number;
  neverAck?: boolean;
  silenceBeforeReady?: boolean;
}

// This server is an independent network/fault fixture. Production protocol
// bytes are used on real loopback WebSockets; no mock replaces the client API.
async function fixture(options: FixtureOptions = {}) {
  const stats = {
    connections: 0,
    authenticated: 0,
    executions: 0,
    surrenderExecutions: 0,
    commands: [] as number[],
    actionBytes: [] as number[][],
    tokens: [] as string[],
    urls: [] as string[],
  };
  let nextRpc = 1;
  let faultUsed = false;
  let finished = false;
  let errorUsed = false;
  let surrenderAck: object | null = null;
  const cache = new Map<number, { ack: object; bytes: Uint8Array }>();
  const peers = new Set<ServerWebSocket>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const session = "fixture-game-session";
  const control = (ws: ServerWebSocket, value: object) =>
    ws.send(JSON.stringify(value));
  const rpc = (ws: ServerWebSocket) =>
    finished
      ? control(ws, { type: "rpc", data: null })
      : ws.send(
          encodeGameFrame({
            type: "rpc",
            data: {
              id: nextRpc,
              timer: { current: 60, total: 60 },
              request: Uint8Array.of(0x12, 0),
            },
          }),
        );
  const server = createServer((_request, response) => {
    response.writeHead(404);
    response.end();
  });
  const sockets = new WebSocketServer({ server });
  sockets.on("connection", (ws, request) => {
    const conn = { authenticated: false, ordinal: ++stats.connections };
    stats.urls.push(request.url ?? "");
    peers.add(ws);
    ws.on("close", () => peers.delete(ws));
    ws.on("message", (raw, isBinary) => {
      const bytes = Array.isArray(raw)
        ? Buffer.concat(raw)
        : Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw);
      const message = isBinary ? new Uint8Array(bytes) : bytes.toString();
      if (!conn.authenticated) {
        const auth = typeof message === "string" ? JSON.parse(message) : null;
        stats.tokens.push(auth?.token);
        if (
          options.rejectAuth ||
          auth?.type !== "auth" ||
          (auth.token !== "fixture-token" &&
            !(options.allowAnonymous && auth.token === ""))
        ) {
          ws.close(1008, "INVALID_TOKEN");
          return;
        }
        if (options.silenceBeforeReady) return;
        conn.authenticated = true;
        stats.authenticated++;
        control(ws, {
          type: "ready",
          ...(options.missingSession
            ? {}
            : {
                sessionId:
                  options.changeSessionOnReconnect && conn.ordinal > 1
                    ? "replacement-session"
                    : session,
              }),
        });
        control(ws, {
          type: "initialized",
          who: 0,
          config: { watchable: true, gameVersion: "fixture" },
          myPlayerInfo: { id: "p0" },
          oppPlayerInfo: { id: "p1" },
        });
        ws.send(
          encodeGameFrame({
            type: "notification",
            data: finished
              ? Uint8Array.of(0x0a, 2, 8, 5)
              : Uint8Array.of(0x0a, 0),
          }),
        );
        rpc(ws);
        return;
      }
      if (typeof message === "string") {
        const command = JSON.parse(message);
        assert.equal(command.type, "giveUp");
        if (!surrenderAck) {
          stats.surrenderExecutions++;
          surrenderAck = { type: "ack", command: "giveUp", sessionId: session };
        }
        if (!faultUsed && options.fault === "terminal-after-accept") {
          faultUsed = true;
          finished = true;
          ws.terminate();
          return;
        }
        control(ws, surrenderAck);
        return;
      }
      const command = decodeGameFrame(message);
      assert.equal(command.type, "actionResponse");
      if (command.type !== "actionResponse") return;
      stats.commands.push(command.id);
      stats.actionBytes.push([...command.response]);
      if (options.commandError && !errorUsed) {
        errorUsed = true;
        if (options.commandError !== "INVALID_RESPONSE") nextRpc++;
        control(ws, {
          type: "commandError",
          command: "actionResponse",
          id: command.id,
          code: options.commandError,
          message: "The request changed",
          resyncRequired: true,
        });
        return;
      }
      const previous = cache.get(command.id);
      if (previous) {
        assert.deepEqual([...command.response], [...previous.bytes]);
        if (!options.neverAck) control(ws, previous.ack);
        return;
      }
      if (!faultUsed && options.fault === "before-accept") {
        faultUsed = true;
        ws.terminate();
        return;
      }
      assert.equal(command.id, nextRpc);
      stats.executions++;
      nextRpc++;
      const ack = {
        type: "ack",
        command: "actionResponse",
        id: command.id,
        sessionId: options.wrongAckSession ? "foreign-session" : session,
      };
      cache.set(command.id, { ack, bytes: command.response.slice() });
      if (
        !faultUsed &&
        (options.fault === "after-accept" ||
          options.fault === "terminal-after-accept")
      ) {
        faultUsed = true;
        finished = options.fault === "terminal-after-accept";
        ws.terminate();
        return;
      }
      if (options.neverAck) return;
      const deliver = () => {
        if (ws.readyState !== 1) return;
        control(ws, ack);
        rpc(ws);
      };
      if (options.ackDelayMs) {
        const handle = setTimeout(() => {
          timers.delete(handle);
          deliver();
        }, options.ackDelayMs);
        timers.add(handle);
      } else deliver();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  running.push(async () => {
    for (const handle of timers) clearTimeout(handle);
    for (const ws of peers) ws.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return {
    url: `ws://127.0.0.1:${address.port}/api/rooms/12/players/p0/ws`,
    stats,
    disconnect: () => {
      for (const ws of peers) ws.terminate();
    },
  };
}

type RoomFixture = Awaited<ReturnType<typeof fixture>>;
type ConnectionOverrides = Partial<
  ConstructorParameters<typeof RoomConnection>[0]
>;

function client(server: RoomFixture, overrides: ConnectionOverrides = {}) {
  const events: RoomEvent[] = [];
  const states: string[] = [];
  const errors: RoomConnectionError[] = [];
  const connection = new RoomConnection({
    url: server.url,
    token: () => "fixture-token",
    reconnectDelayMs: 5,
    reconnectDeadlineMs: 500,
    authTimeoutMs: 100,
    ackTimeoutMs: 100,
    commandTimeoutMs: 1_000,
    onEvent: (event) => events.push(event),
    onState: (state) => states.push(state),
    onError: (error) => errors.push(error),
    ...overrides,
  });
  running.push(() => connection.dispose());
  connection.start();
  const waitForRpc = (id?: number) => until(() => events.some(isRpcEvent(id)));
  return {
    connection,
    events,
    states,
    errors,
    /** Resolve once the connection has received its first RPC request. */
    ready: () => waitForRpc(),
    /** Resolve once the RPC request with `id` arrives. */
    waitForRpc,
    /** Resolve with the connection's single reported error. */
    soleError: async () => {
      await until(() => errors.length === 1);
      return errors[0];
    },
    lastState: () => states.at(-1),
  };
}

/** A fixture, plus a client that has authenticated and received its first RPC. */
async function connect(
  options: FixtureOptions = {},
  overrides: ConnectionOverrides = {},
) {
  const server = await fixture(options);
  const c = client(server, overrides);
  await c.ready();
  return { server, c };
}

/**
 * A client that marks its connection finished on the terminal snapshot, so the
 * lost ACK for the action that produced that snapshot can still be recovered.
 */
async function clientAwaitingFinalAck(server: RoomFixture) {
  let connection: RoomConnection;
  const c = client(server, {
    onEvent: (event) => {
      if (event.type === "notification" && event.data[3] === 5)
        connection.markFinished();
    },
  });
  connection = c.connection;
  await until(() => c.connection.requestToken !== null);
  return c;
}

describe("production binary game framing", () => {
  test("matches independent wire goldens and rejects corrupt envelopes", () => {
    const response = Uint8Array.of(0x12, 0);
    assert.deepEqual(
      [...encodeGameFrame({ type: "actionResponse", id: 7, response })],
      [0x47, 0x49, 1, 3, 0, 0, 0, 7, 0x12, 0],
    );
    const golden = Uint8Array.from(
      Buffer.from(
        "4749010200000007400400000000000040240000000000001200",
        "hex",
      ),
    );
    assert.deepEqual(decodeGameFrame(golden), {
      type: "rpc",
      data: { id: 7, timer: { current: 2.5, total: 10 }, request: response },
    });
    assert.deepEqual(encodeGameFrame(decodeGameFrame(golden)), golden);
    for (const bad of [
      golden.subarray(0, 7),
      Uint8Array.of(0x47, 0x49, 99, 1, 0, 0, 0, 0, 0),
      Uint8Array.of(0x47, 0x49, 1, 1, 0, 0, 0, 2, 0),
      golden.subarray(0, 24),
    ])
      assert.throws(() => decodeGameFrame(bad));
  });

  test("preserves API prefixes and keeps credentials out of WebSocket URLs", () => {
    assert.equal(
      roomWebSocketUrl(
        "/custom/api",
        12,
        "guest 一",
        "https://example.org/game/rooms/12",
      ),
      "wss://example.org/custom/api/rooms/12/players/guest%20%E4%B8%80/ws",
    );
    assert.throws(() =>
      roomWebSocketUrl(
        "https://example.org/api?token=secret",
        1,
        2,
        "https://example.org",
      ),
    );
  });
});

test("the real socket authenticates before binary game data and waits for the matching ACK", async () => {
  const { server, c } = await connect({ ackDelayMs: 30 });
  assert.equal(c.connection.sessionId, "fixture-game-session");
  assert.deepEqual(
    c.events.map((event) => event.type),
    ["initialized", "notification", "rpc"],
  );
  let acknowledged = false;
  const answer = c.connection
    .sendResponse(1, Uint8Array.of(0x12, 0))
    .then(() => {
      acknowledged = true;
    });
  await until(() => server.stats.executions === 1);
  assert.equal(acknowledged, false);
  await answer;
  assert.deepEqual(server.stats.tokens, ["fixture-token"]);
  assert.equal(
    server.stats.urls.every((url) => !url.includes("fixture-token")),
    true,
  );
  await c.waitForRpc(2);
  assert.deepEqual(c.errors, []);
});

for (const fault of ["before-accept", "after-accept"] as const) {
  test(`${fault} disconnect retries the identical bytes after re-authenticating the same session`, async () => {
    const { server, c } = await connect({ fault });
    const response = Uint8Array.of(0x12, 0);
    const answer = c.connection.sendResponse(1, response);
    // The retry must resend the client's own copy, not the caller's buffer.
    response.fill(99);
    await answer;
    assert.equal(server.stats.executions, 1);
    assert.deepEqual(server.stats.commands, [1, 1]);
    assert.deepEqual(server.stats.actionBytes, [
      [0x12, 0],
      [0x12, 0],
    ]);
    assert.equal(server.stats.authenticated, 2);
    assert.ok(c.states.includes("reconnecting"));
    assert.equal(c.connection.hasPendingCommand, false);
    assert.deepEqual(c.errors, []);
  });
}

test("terminal snapshot still permits recovery of a lost final action ACK", async () => {
  const server = await fixture({ fault: "terminal-after-accept" });
  const c = await clientAwaitingFinalAck(server);
  await c.connection.sendResponse(1, Uint8Array.of(0x12, 0));
  assert.equal(server.stats.executions, 1);
  assert.deepEqual(server.stats.commands, [1, 1]);
  assert.equal(c.lastState(), "closed");
});

test("anonymous spectators explicitly authenticate with an empty token", async () => {
  const { server, c } = await connect(
    { allowAnonymous: true },
    { token: () => "" },
  );
  assert.deepEqual(server.stats.tokens, [""]);
  assert.equal(
    c.events.some((event) => event.type === "notification"),
    true,
  );
});

test("authentication refusal stops reconnecting and exposes a fatal error", async () => {
  const server = await fixture({ rejectAuth: true });
  const c = client(server);
  const error = await c.soleError();
  await delay(30);
  assert.equal(server.stats.connections, 1);
  assert.equal(error.code, "ACCESS_DENIED");
  assert.deepEqual(c.events, []);
});

test("a ready frame without a session id is rejected before game data reaches the UI", async () => {
  const server = await fixture({ missingSession: true });
  const c = client(server);
  const error = await c.soleError();
  assert.equal(error.code, "PROTOCOL_ERROR");
  assert.deepEqual(c.events, []);
});

test("a foreign ACK cannot confirm the command", async () => {
  const { c } = await connect({ wrongAckSession: true });
  await assert.rejects(c.connection.sendResponse(1, Uint8Array.of(0x12, 0)), {
    code: "PROTOCOL_ERROR",
    outcomeUnknown: true,
  });
  assert.equal(c.lastState(), "failed");
});

test("a changed session on reconnect fails instead of replaying an uncertain action", async () => {
  const { server, c } = await connect({
    fault: "before-accept",
    changeSessionOnReconnect: true,
  });
  await assert.rejects(c.connection.sendResponse(1, Uint8Array.of(0x12, 0)), {
    code: "SESSION_CHANGED",
    outcomeUnknown: true,
  });
  assert.deepEqual(server.stats.commands, [1]);
  assert.equal(server.stats.executions, 0);
});

for (const code of ["STALE_RPC", "CONFLICT", "FUTURE_RPC"]) {
  test(`${code} is a definite rejection followed by synchronization, without retrying the rejected bytes`, async () => {
    const { server, c } = await connect({ commandError: code });
    await assert.rejects(c.connection.sendResponse(1, Uint8Array.of(0x12, 0)), {
      code,
      outcomeUnknown: false,
    });
    await c.waitForRpc(2);
    await c.connection.sendResponse(2, Uint8Array.of(0x12, 0));
    assert.deepEqual(server.stats.commands, [1, 2]);
    assert.equal(server.stats.executions, 1);
  });
}

test("stale asynchronous UI answer is rejected even when reconnect reuses the same RPC ID", async () => {
  const { server, c } = await connect();
  const staleToken = c.connection.requestToken!;
  server.disconnect();
  await until(
    () =>
      server.stats.authenticated === 2 && c.connection.requestToken !== null,
  );
  await assert.rejects(
    c.connection.sendResponse(1, Uint8Array.of(0x12, 0), staleToken),
    { code: "STALE_LOCAL_RPC" },
  );
  assert.equal(server.stats.executions, 0);
  await c.connection.sendResponse(
    1,
    Uint8Array.of(0x12, 0),
    c.connection.requestToken,
  );
  assert.equal(server.stats.executions, 1);
});

test("invalid response refreshes the same pending RPC without automatically replaying the rejected answer", async () => {
  const { server, c } = await connect({ commandError: "INVALID_RESPONSE" });
  const staleToken = c.connection.requestToken;
  await assert.rejects(c.connection.sendResponse(1, Uint8Array.of(0x12, 0)), {
    code: "INVALID_RESPONSE",
    outcomeUnknown: false,
  });
  await until(
    () =>
      c.connection.requestToken !== null &&
      c.connection.requestToken !== staleToken,
  );
  assert.deepEqual(server.stats.commands, [1]);
  await c.connection.sendResponse(1, Uint8Array.of(0x12, 0));
  assert.equal(server.stats.executions, 1);
});

test("retains only one uncertain command, and dispose cancels pending work and reconnect timers", async () => {
  const { server, c } = await connect({ neverAck: true }, { ackTimeoutMs: 20 });
  const answer = c.connection.sendResponse(1, Uint8Array.of(0x12, 0));
  const outcome = outcomeOf(answer);
  await assert.rejects(c.connection.giveUp(), { code: "COMMAND_PENDING" });
  await until(() => c.states.includes("reconnecting"));
  c.connection.dispose();
  const disposedError = await outcome;
  assert.ok(disposedError instanceof RoomConnectionError);
  assert.equal(disposedError.code, "DISPOSED");
  assert.equal(disposedError.outcomeUnknown, true);
  const count = server.stats.connections;
  await delay(50);
  assert.equal(server.stats.connections, count);
  assert.equal(c.connection.hasPendingCommand, false);
});

test("uncertain command recovery has an overall deadline even if every reconnect authenticates", async () => {
  const { server, c } = await connect(
    { neverAck: true },
    { ackTimeoutMs: 15, commandTimeoutMs: 100 },
  );
  await assert.rejects(c.connection.sendResponse(1, Uint8Array.of(0x12, 0)), {
    code: "COMMAND_TIMEOUT",
    outcomeUnknown: true,
  });
  assert.equal(server.stats.executions, 1);
  assert.equal(c.connection.hasPendingCommand, false);
  const count = server.stats.connections;
  await delay(30);
  assert.equal(server.stats.connections, count);
});

test("lost authentication response has a finite reconnect deadline", async () => {
  const server = await fixture({ silenceBeforeReady: true });
  const c = client(server, { authTimeoutMs: 15, reconnectDeadlineMs: 65 });
  const error = await c.soleError();
  assert.equal(error.code, "RECONNECT_TIMEOUT");
  assert.deepEqual(c.events, []);
});

test("surrender uses a same-session WebSocket ACK", async () => {
  const { server, c } = await connect();
  await c.connection.giveUp();
  assert.equal(server.stats.surrenderExecutions, 1);
  assert.equal(server.stats.executions, 0);
  assert.deepEqual(c.errors, []);
});

test("lost surrender ACK is recovered after the terminal snapshot without surrendering twice", async () => {
  const server = await fixture({ fault: "terminal-after-accept" });
  const c = await clientAwaitingFinalAck(server);
  await c.connection.giveUp();
  assert.equal(server.stats.surrenderExecutions, 1);
  assert.equal(server.stats.authenticated, 2);
  assert.equal(c.lastState(), "closed");
});
