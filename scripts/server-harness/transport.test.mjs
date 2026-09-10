import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setImmediate as immediate } from "node:timers/promises";
import test from "node:test";
import { connectTransport } from "./transport.mjs";
import { decodeGameFrame, encodeGameFrame } from "./wire.mjs";

const bytes = (value) => new Uint8Array(Buffer.from(value, "base64"));

const options = {
  baseUrl: "http://127.0.0.1:12345/api",
  roomId: 12,
  playerId: "guest-一",
  token: "fixture-secret",
  timeoutMs: 1_000,
};

async function sseFixture(t, handler) {
  const requests = [];
  let stream;
  const server = createServer(async (request, response) => {
    const record = {
      path: request.url,
      method: request.method,
      headers: request.headers,
      body: "",
    };
    requests.push(record);
    if (handler?.(request, response, record)) return;
    if (request.method === "GET") {
      stream = response;
      response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8" });
      response.write(": connected\n\n");
    } else {
      for await (const chunk of request) record.body += chunk;
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"message":"ok"}');
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/api`,
    requests,
    get stream() {
      return stream;
    },
  };
}

function fakeWebSocket({ autoReady = true, onSend } = {}) {
  return class FakeWebSocket extends EventTarget {
    static instances = [];
    sent = [];
    sentFrames = [];
    listeners = new Set();
    closed = false;
    closeCount = 0;

    constructor(url) {
      super();
      this.url = url;
      this.constructor.instances.push(this);
      queueMicrotask(() => {
        if (!this.closed) this.dispatchEvent(new Event("open"));
      });
    }

    addEventListener(type, listener) {
      this.listeners.add(listener);
      super.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
      this.listeners.delete(listener);
      super.removeEventListener(type, listener);
    }

    send(frame) {
      assert.equal(this.closed, false);
      this.sentFrames.push(frame);
      const value = typeof frame === "string" ? JSON.parse(frame) : decodeGameFrame(frame);
      this.sent.push(value);
      if (value.type === "auth" && autoReady) this.message({ type: "ready", sessionId: "fixture-session" });
      onSend?.(value, this);
    }

    message(value) {
      this.rawMessage(JSON.stringify(value));
    }

    game(value) {
      this.rawMessage(encodeGameFrame(value).buffer);
    }

    rawMessage(data) {
      this.dispatchEvent(new MessageEvent("message", { data }));
    }

    disconnect(code = 1006) {
      const event = new Event("close");
      Object.assign(event, { code });
      this.dispatchEvent(event);
    }

    close() {
      this.closed = true;
      this.closeCount++;
    }
  };
}

async function wsFixture(t, extra = {}, fakeOptions = {}) {
  const WebSocketImpl = fakeWebSocket(fakeOptions);
  const session = await connectTransport({
    ...options,
    kind: "ws",
    WebSocketImpl,
    ...extra,
  });
  t.after(() => session.close());
  return { session, socket: WebSocketImpl.instances[0] };
}

test("SSE preserves API prefix, credentials and response/give-up requests", async (t) => {
  const fixture = await sseFixture(t);
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  fixture.stream.write('data: {"type":"waiting"}\n\n');
  assert.deepEqual(await session.next(), { type: "waiting" });
  await session.sendResponse(7, "CAc=");
  await session.giveUp();
  assert.deepEqual(
    fixture.requests.map(({ method, path, headers, body }) => ({
      method,
      path,
      authorization: headers.authorization,
      body,
    })),
    [
      {
        method: "GET",
        path: "/api/rooms/12/players/guest-%E4%B8%80/notification",
        authorization: "Bearer fixture-secret",
        body: "",
      },
      {
        method: "POST",
        path: "/api/rooms/12/players/guest-%E4%B8%80/actionResponse",
        authorization: "Bearer fixture-secret",
        body: '{"id":7,"response":"CAc="}',
      },
      {
        method: "POST",
        path: "/api/rooms/12/players/guest-%E4%B8%80/giveUp",
        authorization: "Bearer fixture-secret",
        body: "{}",
      },
    ],
  );
});

test("SSE accepts CRLF split across chunks, multiple data lines and split UTF-8", async (t) => {
  const fixture = await sseFixture(t);
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  const payloads = [
    { type: "notification", data: "雷🌩️" },
    { type: "rpc", data: null },
    { type: "ping" },
  ];
  const pending = Promise.all(payloads.map(() => session.next()));
  const wire = Buffer.from(
    ': comment\r\nid: 5\r\nevent: message\r\nretry: 10\r\ndata: {"type":"notification",\r\ndata: "data":"雷🌩️"}\r\n\r\n' +
      'data: {"type":"rpc","data":null}\r\r' +
      'data: {"type":"ping"}\n\n',
  );
  for (let index = 0; index < wire.length; index++) {
    fixture.stream.write(wire.subarray(index, index + 1));
    await immediate();
  }
  assert.deepEqual(await pending, payloads);
});

test("next timeout removes only that waiter and close rejects remaining waits", async (t) => {
  const fixture = await sseFixture(t);
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  await assert.rejects(session.next(15), /Timed out waiting/);
  const active = session.next();
  fixture.stream.write('data: {"type":"waiting"}\n\n');
  assert.deepEqual(await active, { type: "waiting" });
  const pending = session.next();
  const rejected = assert.rejects(pending, /session closed/);
  session.close();
  session.close();
  await rejected;
  await assert.rejects(session.next(), /session closed/);
});

test("SSE EOF fails a waiting consumer", async (t) => {
  const fixture = await sseFixture(t);
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  const rejected = assert.rejects(session.next(), /SSE stream disconnected/);
  fixture.stream.end();
  await rejected;
  await assert.rejects(session.sendResponse(0, "AA=="), /disconnected/);
});

test("SSE keeps a final notification queued through EOF and a delayed HTTP action acknowledgement", async (t) => {
  const fixture = await sseFixture(t, (request, response) => {
    if (request.method !== "POST") return false;
    fixture.stream.end('data: {"type":"notification","data":"final-state"}\n\n');
    // Real legacy behavior: stop() closes the SSE connection while the last
    // actionResponse is still making its way back over a separate HTTP socket.
    setTimeout(() => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"message":"response received"}');
    }, 50);
    return true;
  });
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  await session.sendResponse(7, "AA==");
  assert.deepEqual(await session.next(), { type: "notification", data: "final-state" });
  await assert.rejects(session.next(), /SSE stream disconnected/);
  await assert.rejects(session.sendResponse(8, "AA=="), /SSE stream disconnected/);
  assert.equal(fixture.requests.filter((request) => request.method === "POST").length, 1);
});

test("SSE EOF is observable before an in-flight HTTP action acknowledgement completes", async (t) => {
  let acknowledge;
  const fixture = await sseFixture(t, (request, response) => {
    if (request.method !== "POST") return false;
    acknowledge = () => {
      response.writeHead(200);
      response.end();
    };
    fixture.stream.end('data: {"type":"notification","data":"final-state"}\n\n');
    return true;
  });
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  const finalEvent = session.next();
  const observedEof = assert.rejects(session.next(), /SSE stream disconnected/);
  const submitted = session.sendResponse(7, "AA==");
  const completion = assert.doesNotReject(submitted);
  await observedEof;
  assert.deepEqual(await finalEvent, { type: "notification", data: "final-state" });
  acknowledge();
  await completion;
});

for (const [name, message, expected] of [
  ["invalid JSON", "no-json", /Invalid JSON/],
  ["invalid envelope", '{"type":"rpc","data":{}}', /Invalid transport envelope/],
  ["unknown envelope", '{"type":"surprise"}', /Invalid transport envelope/],
  ["server error", '{"type":"error","message":"game failed"}', /game failed/],
]) {
  test(`SSE fails on ${name}`, async (t) => {
    const fixture = await sseFixture(t);
    const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
    t.after(() => session.close());
    const rejected = assert.rejects(session.next(), expected);
    fixture.stream.write(`data: ${message}\n\n`);
    await rejected;
  });
}

test("SSE rejects wrong content type and HTTP authentication errors", async (t) => {
  for (const status of [200, 401]) {
    const fixture = await sseFixture(t, (_request, response) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end("{}");
      return true;
    });
    await assert.rejects(
      connectTransport({ ...options, ...fixture, kind: "sse" }),
      status === 200 ? /text\/event-stream/ : /HTTP 401/,
    );
  }
});

test("SSE connection and command requests have deadlines", async (t) => {
  const noHeaders = await sseFixture(t, () => true);
  await assert.rejects(
    connectTransport({ ...options, ...noHeaders, kind: "sse", timeoutMs: 30 }),
    /connection timed out/,
  );
  const noCommandResponse = await sseFixture(t, (request) => request.method === "POST");
  const session = await connectTransport({
    ...options,
    ...noCommandResponse,
    kind: "sse",
    timeoutMs: 60,
  });
  t.after(() => session.close());
  await assert.rejects(session.giveUp(), /timeout|timed out/i);
});

test("SSE command HTTP failures reject the command", async (t) => {
  const fixture = await sseFixture(t, (request, response) => {
    if (request.method !== "POST") return false;
    response.writeHead(409);
    response.end("conflict");
    return true;
  });
  const session = await connectTransport({ ...options, ...fixture, kind: "sse" });
  t.after(() => session.close());
  await assert.rejects(session.sendResponse(7, "AA=="), /HTTP 409/);
});

test("WebSocket sends auth as first frame, keeps token out of URL, and waits for ready", async () => {
  const WebSocketImpl = fakeWebSocket({ autoReady: false });
  let settled = false;
  const connected = connectTransport({ ...options, kind: "ws", WebSocketImpl });
  void connected.then(() => { settled = true; });
  await immediate();
  const socket = WebSocketImpl.instances[0];
  assert.equal(settled, false);
  assert.equal(socket.url, "ws://127.0.0.1:12345/api/rooms/12/players/guest-%E4%B8%80/ws");
  assert.deepEqual(socket.sent, [{ type: "auth", token: "fixture-secret" }]);
  assert.equal(socket.binaryType, "arraybuffer");
  socket.message({ type: "ready", sessionId: "session-42", lastAcceptedId: 7 });
  const session = await connected;
  assert.deepEqual(session.ready, { type: "ready", sessionId: "session-42", lastAcceptedId: 7 });
  session.close();
  assert.equal(socket.closed, true);
  assert.equal(socket.listeners.size, 0);
});

test("WebSocket returns ordered game envelopes without exposing control messages", async (t) => {
  const { session, socket } = await wsFixture(t, { baseUrl: "https://example.invalid/v1/" });
  assert.equal(socket.url, "wss://example.invalid/v1/rooms/12/players/guest-%E4%B8%80/ws");
  const payloads = [
    { type: "waiting" },
    { type: "initialized", who: 0 },
    { type: "notification", data: bytes("AA==") },
    { type: "rpc", data: { id: 7, request: bytes("AA=="), timer: { current: 2, total: 10 } } },
    { type: "rpc", data: null },
    { type: "oppRpc", oppTimer: null },
    { type: "ping" },
  ];
  for (const payload of payloads) {
    if (payload.type === "notification" || (payload.type === "rpc" && payload.data !== null)) socket.game(payload);
    else socket.message(payload);
  }
  for (const payload of payloads) assert.deepEqual(await session.next(), payload);
});

test("WebSocket rejects ready without a bounded nonempty sessionId", async () => {
  for (const sessionId of [undefined, "", "   ", 42, "x".repeat(129)]) {
    const WebSocketImpl = fakeWebSocket({
      autoReady: false,
      onSend(_value, socket) { socket.message({ type: "ready", sessionId }); },
    });
    await assert.rejects(connectTransport({ ...options, kind: "ws", WebSocketImpl }), /ready requires a nonempty sessionId/);
    assert.equal(WebSocketImpl.instances[0].closed, true);
    assert.equal(WebSocketImpl.instances[0].listeners.size, 0);
  }
});

test("WebSocket rejects missing or foreign ACK sessions without confirming pending commands", async (t) => {
  for (const sessionId of [undefined, "another-game-session"]) {
    const { session, socket } = await wsFixture(t);
    const pending = [
      assert.rejects(session.sendResponse(1, bytes("EgA=")), /acknowledgement sessionId does not match/),
      assert.rejects(session.giveUp(), /acknowledgement sessionId does not match/),
      assert.rejects(session.next(), /acknowledgement sessionId does not match/),
    ];
    socket.message({ type: "ack", command: "actionResponse", id: 1, sessionId });
    await Promise.all(pending);
    assert.equal(socket.closed, true);
    assert.equal(socket.listeners.size, 0);
  }
});

test("WebSocket commands wait for matching acknowledgements, including out-of-order replies", async (t) => {
  const { session, socket } = await wsFixture(t);
  const completed = [];
  const first = session.sendResponse(1, bytes("AQ==")).then(() => completed.push(1));
  const second = session.sendResponse(2, bytes("Ag==")).then(() => completed.push(2));
  const giveUp = session.giveUp().then(() => completed.push("giveUp"));
  await immediate();
  assert.deepEqual(completed, []);
  assert.deepEqual(socket.sent.slice(1), [
    { type: "actionResponse", id: 1, response: bytes("AQ==") },
    { type: "actionResponse", id: 2, response: bytes("Ag==") },
    { type: "giveUp" },
  ]);
  assert.ok(socket.sentFrames[1] instanceof Uint8Array);
  assert.ok(socket.sentFrames[2] instanceof Uint8Array);
  assert.equal(typeof socket.sentFrames[3], "string");
  socket.message({ type: "ack", command: "actionResponse", id: 2, sessionId: "fixture-session" });
  await second;
  assert.deepEqual(completed, [2]);
  socket.message({ type: "ack", command: "giveUp", sessionId: "fixture-session" });
  socket.message({ type: "ack", command: "actionResponse", id: 1, sessionId: "fixture-session" });
  await Promise.all([first, giveUp]);
  assert.deepEqual(new Set(completed), new Set([1, 2, "giveUp"]));
});

test("WebSocket rejects nonbinary responses and out-of-range ids before writing or starting an ACK wait", async (t) => {
  const { session, socket } = await wsFixture(t);
  for (const [id, response, expected] of [
    [1, "EgA=", /Uint8Array/],
    [1, bytes(""), /missing protobuf/],
    [-1, bytes("EgA="), /uint32/],
    [0x1_0000_0000, bytes("EgA="), /uint32/],
  ]) {
    await assert.rejects(session.sendResponse(id, response), expected);
  }
  assert.equal(socket.sent.length, 1);
  const accepted = session.sendResponse(1, bytes("EgA="));
  socket.message({ type: "ack", command: "actionResponse", id: 1, sessionId: "fixture-session" });
  await accepted;
  assert.equal(socket.closed, false);
});

test("WebSocket commandError rejects only its command and allows a later command", async (t) => {
  const { session, socket } = await wsFixture(t);
  const rejected = assert.rejects(session.sendResponse(1, bytes("AA==")), /rejected: stale RPC/);
  socket.message({ type: "commandError", command: "actionResponse", id: 1, message: "stale RPC" });
  await rejected;
  const accepted = session.giveUp();
  socket.message({ type: "ack", command: "giveUp", sessionId: "fixture-session" });
  await accepted;
  assert.equal(socket.closed, false);
});

test("WebSocket command timeout fails the session and clears listeners", async (t) => {
  const { session, socket } = await wsFixture(t, { timeoutMs: 20 });
  await assert.rejects(session.sendResponse(1, bytes("AA==")), /acknowledgement timed out/);
  await assert.rejects(session.next(), /acknowledgement timed out/);
  assert.equal(socket.closeCount, 1);
  assert.equal(socket.listeners.size, 0);
});

test("WebSocket authentication timeout closes the unready socket", async () => {
  const WebSocketImpl = fakeWebSocket({ autoReady: false });
  await assert.rejects(
    connectTransport({ ...options, kind: "ws", WebSocketImpl, timeoutMs: 20 }),
    /authentication timed out/,
  );
  assert.equal(WebSocketImpl.instances[0].closed, true);
  assert.equal(WebSocketImpl.instances[0].listeners.size, 0);
});

test("WebSocket rejects game messages before authentication completes", async () => {
  const WebSocketImpl = fakeWebSocket({
    autoReady: false,
    onSend(_value, socket) { socket.message({ type: "waiting" }); },
  });
  await assert.rejects(
    connectTransport({ ...options, kind: "ws", WebSocketImpl }),
    /before ready/,
  );
});

test("WebSocket rejects binary game messages before authentication completes", async () => {
  const WebSocketImpl = fakeWebSocket({
    autoReady: false,
    onSend(_value, socket) { socket.game({ type: "notification", data: bytes("CgA=") }); },
  });
  await assert.rejects(connectTransport({ ...options, kind: "ws", WebSocketImpl }), /before ready/);
  assert.equal(WebSocketImpl.instances[0].closed, true);
});

test("WebSocket disconnect rejects event waits and every pending command", async (t) => {
  const { session, socket } = await wsFixture(t);
  const rejected = [
    assert.rejects(session.next(), /disconnected/),
    assert.rejects(session.sendResponse(1, bytes("AA==")), /disconnected/),
    assert.rejects(session.giveUp(), /disconnected/),
  ];
  socket.disconnect();
  await Promise.all(rejected);
  assert.equal(socket.listeners.size, 0);
});

test("WebSocket normal close drains queued events, preserves prior ACKs, and rejects missing ACKs", async (t) => {
  const { session, socket } = await wsFixture(t);
  const acknowledged = session.sendResponse(1, bytes("AA=="));
  const missingAck = assert.rejects(session.giveUp(), /disconnected/);
  socket.game({ type: "notification", data: bytes("CgIIBQ==") });
  socket.message({ type: "ping" });
  socket.message({ type: "ack", command: "actionResponse", id: 1, sessionId: "fixture-session" });
  socket.disconnect(1000);
  await acknowledged;
  await missingAck;
  assert.deepEqual(await session.next(), { type: "notification", data: bytes("CgIIBQ==") });
  assert.deepEqual(await session.next(), { type: "ping" });
  await assert.rejects(session.next(), /disconnected/);
  await assert.rejects(session.sendResponse(2, bytes("AA==")), /disconnected/);
  session.close();
  assert.equal(socket.closeCount, 1);
  assert.equal(socket.listeners.size, 0);
});

test("WebSocket protocol failure still discards queued events immediately", async (t) => {
  const { session, socket } = await wsFixture(t);
  socket.game({ type: "notification", data: bytes("CgIIAQ==") });
  socket.rawMessage("not JSON");
  await assert.rejects(session.next(), /Invalid JSON/);
});

test("WebSocket queue overflow fails instead of dropping events", async (t) => {
  const { session, socket } = await wsFixture(t, { maxBufferedEvents: 2 });
  socket.message({ type: "waiting" });
  socket.message({ type: "ping" });
  socket.message({ type: "ping" });
  await assert.rejects(session.next(), /queue exceeded 2/);
  assert.equal(socket.closed, true);
});

for (const [name, value, expected] of [
  ["malformed JSON", "{", /Invalid JSON/],
  ["truncated binary message", new Uint8Array([1]), /truncated header/],
  ["JSON notification", '{"type":"notification","data":"CgA="}', /requires a binary/],
  ["JSON RPC request", '{"type":"rpc","data":{"id":1,"request":"EgA=","timer":{"current":2,"total":10}}}', /requires a binary/],
  ["JSON action response", '{"type":"actionResponse","id":1,"response":"EgA="}', /requires a binary/],
  ["server binary response", encodeGameFrame({ type: "actionResponse", id: 1, response: bytes("EgA=") }), /Unexpected server actionResponse/],
  ["unmatched ack", '{"type":"ack","command":"actionResponse","id":99,"sessionId":"fixture-session"}', /Unmatched/],
  ["invalid ack", '{"type":"ack","command":"giveUp","id":99}', /Invalid WebSocket command/],
  ["duplicate ready", '{"type":"ready"}', /Duplicate/],
  ["error envelope", '{"type":"error","message":"unauthorized"}', /unauthorized/],
]) {
  test(`WebSocket fails on ${name}`, async (t) => {
    const { session, socket } = await wsFixture(t);
    const rejected = assert.rejects(session.next(), expected);
    socket.rawMessage(value);
    await rejected;
    assert.equal(socket.closed, true);
  });
}

test("transport rejects invalid configuration without connecting", async () => {
  for (const extra of [
    { kind: "other" },
    { timeoutMs: 0 },
    { maxBufferedEvents: -1 },
    { token: "" },
    { baseUrl: "http://example.invalid/api?token=secret" },
    { playerId: undefined },
  ]) {
    await assert.rejects(connectTransport({ ...options, kind: "ws", ...extra }));
  }
});
