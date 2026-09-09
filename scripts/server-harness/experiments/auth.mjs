// Real loopback WebSockets against an isolated Node protocol fixture. These
// experiments exercise authentication boundaries, not the production backend.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { encodeGameFrame, decodeGameFrame } from "../wire.mjs";

const WAIT_MS = 4_000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function eventually(check, description, timeoutMs = WAIT_MS) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    const result = await check();
    if (result) return result;
    await pause(10);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function connect(server, room, playerIndex = 0) {
  const player = room.players[playerIndex];
  const url = new URL(`${server.baseUrl}/rooms/${room.roomId}/players/${player.playerId}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  const probe = { socket, url: socket.url, messages: [], openedAt: null, closed: null, errors: [] };
  socket.addEventListener("open", () => { probe.openedAt = performance.now(); });
  socket.addEventListener("message", (event) => {
    try {
      probe.messages.push({
        at: performance.now(),
        binary: typeof event.data !== "string",
        value: typeof event.data === "string" ? JSON.parse(event.data) : decodeGameFrame(new Uint8Array(event.data)),
      });
    } catch (error) {
      probe.errors.push(`Invalid fixture message: ${error.message}`);
    }
  });
  socket.addEventListener("close", (event) => {
    probe.closed = { code: event.code, reason: event.reason, at: performance.now() };
  });
  socket.addEventListener("error", () => { probe.errors.push("WebSocket error"); });
  probe.open = async () => {
    await eventually(() => {
      if (probe.closed) throw new Error(`Connection closed before opening (${probe.closed.code})`);
      return probe.openedAt !== null;
    }, "WebSocket open");
  };
  probe.auth = (token) => socket.send(JSON.stringify({ type: "auth", token }));
  probe.message = async (type) => eventually(() => {
    const message = probe.messages.find((item) => !item.binary && item.value.type === type);
    if (message) return message.value;
    if (probe.closed) throw new Error(`Connection closed before ${type} (${probe.closed.code})`);
    return null;
  }, `WebSocket ${type}`);
  probe.waitClosed = () => eventually(() => probe.closed, "WebSocket close");
  probe.close = async () => {
    if (probe.closed) return;
    socket.close(1000, "experiment complete");
    await probe.waitClosed();
  };
  return probe;
}

async function zeroConnections(server, room) {
  return eventually(async () => {
    const stats = await server.stats(room.roomId);
    return stats.authenticatedConnections === 0 && stats.pendingUnauthenticatedConnections === 0 ? stats : null;
  }, "connection resources to return to zero");
}

async function authenticate(probe, room, playerIndex = 0) {
  await probe.open();
  probe.auth(room.players[playerIndex].token);
  const ready = await probe.message("ready");
  const initialized = await probe.message("initialized");
  const rpc = await eventually(() => probe.messages.find((item) => item.binary && item.value.type === "rpc"), "binary game RPC after authentication");
  assert.equal(ready.sessionId, room.sessionId, "Ready must identify this room session");
  assert.equal(initialized.who, playerIndex, "Authenticated identity must match the route player");
  assert.equal(probe.messages[0]?.value?.type, "ready", "Authentication must precede game messages");
  assert.ok(rpc.value.data.request instanceof Uint8Array);
  return { who: initialized.who, readyFirst: true, binaryRpcReceived: true };
}

/**
 * Run bounded authentication experiments and keep every outcome in the report.
 * The caller owns the fixture lifecycle and must stop it even if a case fails.
 */
export async function runAuthExperiments(server) {
  const cases = [];
  const run = async (name, experiment) => {
    const started = performance.now();
    const connections = [];
    let evidence;
    let failure;
    try {
      evidence = await experiment((room, playerIndex = 0) => {
        const probe = connect(server, room, playerIndex);
        connections.push(probe);
        return probe;
      });
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    } finally {
      const cleanups = await Promise.allSettled(connections.map((probe) => probe.close()));
      const cleanupFailure = cleanups.find((result) => result.status === "rejected");
      if (cleanupFailure) failure ??= `Connection cleanup failed: ${cleanupFailure.reason.message}`;
      const clientError = connections.flatMap((probe) => probe.errors.filter((error) => !(probe.expectedTransportFailure && error === "WebSocket error")))[0];
      if (clientError) failure ??= clientError;
    }
    cases.push({
      name,
      passed: !failure,
      durationMs: Math.round(performance.now() - started),
      ...(failure ? { error: failure } : { evidence }),
    });
  };

  await run("valid-token-binds-each-player-before-game-data", async (open) => {
    const room = await server.createRoom({ authTimeoutMs: 1_000 });
    const probes = room.players.map((_, index) => open(room, index));
    await Promise.all(probes.map((probe) => probe.open()));
    await pause(40);
    assert.ok(probes.every((probe) => probe.messages.length === 0), "Unauthenticated sockets must receive no game data");
    const identities = await Promise.all(probes.map((probe, index) => authenticate(probe, room, index)));
    const stats = await server.stats(room.roomId);
    assert.equal(stats.authenticatedConnections, 2);
    assert.equal(stats.pendingUnauthenticatedConnections, 0);
    assert.equal(stats.executionCount, 0);
    return { identities, unauthenticatedMessages: 0, authenticatedConnections: 2 };
  });

  const rejectedTokens = [
    ["malformed-token-rejected", () => "not-a-jwt"],
    ["wrong-signature-token-rejected", (room) => room.players[0].wrongSignatureToken],
    ["expired-token-rejected", (room) => room.players[0].expiredToken],
    ["cross-player-token-rejected", (room) => room.players[1].token],
    ["missing-token-rejected", () => undefined],
    ...["none", "RS256"].map((algorithm) => [
      `tampered-alg-${algorithm}-header-rejected`,
      (room) => {
        const parts = room.players[0].token.split(".");
        parts[0] = Buffer.from(JSON.stringify({ alg: algorithm, typ: "JWT" })).toString("base64url");
        return parts.join(".");
      },
      "Changing this header also invalidates the signature; rejection does not independently prove JWT algorithm pinning.",
    ]),
  ];
  for (const [name, tokenFor, interpretation] of rejectedTokens) {
    await run(name, async (open) => {
      const room = await server.createRoom();
      const probe = open(room);
      await probe.open();
      probe.auth(tokenFor(room));
      const closed = await probe.waitClosed();
      assert.equal(closed.code, 1008, "Invalid authentication must close with a policy violation");
      assert.equal(closed.reason, "INVALID_TOKEN", "The credential must be checked, not left waiting for the auth timeout");
      assert.equal(probe.messages.length, 0, "Invalid authentication must not reveal game state");
      const stats = await zeroConnections(server, room);
      assert.equal(stats.executionCount, 0);
      return { closeCode: closed.code, reason: closed.reason, gameMessages: 0, executionCount: 0, ...(interpretation ? { interpretation } : {}) };
    });
  }

  await run("rejected-auth-is-terminal-for-queued-frames", async (open) => {
    const room = await server.createRoom();
    const probe = open(room);
    await probe.open();
    // Deliberately queue all three writes without waiting for the close event.
    // A graceful WebSocket close can leave already received messages queued.
    probe.auth(room.players[0].wrongSignatureToken);
    probe.auth(room.players[0].token);
    probe.socket.send(encodeGameFrame({ type: "actionResponse", id: 1, response: new Uint8Array([0x12, 0]) }));
    const closed = await probe.waitClosed();
    assert.equal(closed.code, 1008);
    assert.equal(closed.reason, "INVALID_TOKEN");
    assert.equal(probe.messages.length, 0, "Queued valid auth must not revive a rejected connection or reveal state");
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0, "Queued action must not execute after authentication was rejected");
    return { queuedFrames: 3, closeCode: closed.code, reason: closed.reason, gameMessages: 0, executionCount: 0, connectionsAfter: 0 };
  });

  await run("oversized-auth-frame-is-rejected-and-reclaimed", async (open) => {
    const room = await server.createRoom();
    const probe = open(room);
    await probe.open();
    const oversizedFrame = JSON.stringify({ type: "auth", token: "x".repeat(128 * 1024) });
    probe.socket.send(oversizedFrame);
    const closed = await probe.waitClosed();
    // Preserve the existing allowance for transport termination (1006) or
    // an explicit size-error close (1009); record the actual observed code.
    assert.ok([1006, 1009].includes(closed.code), `Unexpected close for an oversized frame: ${closed.code}`);
    assert.equal(probe.messages.length, 0);
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0);
    // The abrupt runtime size rejection also emits a native transport error.
    // Permit that specific event only after verifying closure and zero state.
    probe.expectedTransportFailure = closed.code === 1006;
    return {
      sentBytes: Buffer.byteLength(oversizedFrame),
      fixtureMaxFrameBytes: 64 * 1024,
      closeCode: closed.code,
      explicitMessageTooBigCode: closed.code === 1009,
      transportErrorEvents: probe.errors.filter((error) => error === "WebSocket error").length,
      interpretation: closed.code === 1006 ? "The runtime rejected the frame by terminating the connection; the client received no explicit message-too-big close code." : "The runtime sent an explicit message-too-big close code.",
      gameMessages: 0,
      executionCount: 0,
      connectionsAfter: 0,
    };
  });

  await run("missing-auth-frame-times-out", async (open) => {
    const authTimeoutMs = 200;
    const room = await server.createRoom({ authTimeoutMs });
    const probe = open(room);
    await probe.open();
    const closed = await probe.waitClosed();
    assert.equal(closed.code, 1008);
    assert.equal(closed.reason, "AUTH_TIMEOUT");
    assert.equal(probe.messages.length, 0);
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0);
    assert.equal(stats.authTimeouts, 1);
    return { authTimeoutMs, observedCloseMs: Math.round(closed.at - probe.openedAt), gameMessages: 0, connectionsAfter: 0 };
  });

  await run("binary-action-before-auth-never-executes", async (open) => {
    const room = await server.createRoom();
    const probe = open(room);
    await probe.open();
    // A well-formed wire frame with a protobuf switchHands response. Checking
    // real binary traffic avoids merely testing an invalid JSON command.
    probe.socket.send(encodeGameFrame({ type: "actionResponse", id: 1, response: new Uint8Array([0x12, 0]) }));
    const closed = await probe.waitClosed();
    assert.equal(closed.code, 1008);
    assert.equal(closed.reason, "AUTH_REQUIRED");
    assert.equal(probe.messages.length, 0);
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0, "Authentication must gate all action execution");
    return { closeCode: closed.code, reason: closed.reason, executionCount: 0, gameMessages: 0 };
  });

  await run("duplicate-auth-cannot-switch-player", async (open) => {
    const room = await server.createRoom();
    const probe = open(room);
    await authenticate(probe, room);
    probe.auth(room.players[1].token);
    const closed = await probe.waitClosed();
    assert.equal(closed.code, 1008);
    assert.equal(closed.reason, "DUPLICATE_AUTH");
    const identities = probe.messages.filter((message) => !message.binary && message.value.type === "initialized");
    assert.deepEqual(identities.map((message) => message.value.who), [0]);
    assert.equal(probe.messages.filter((message) => !message.binary && message.value.type === "ready").length, 1);
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0);
    return { closeCode: closed.code, reason: closed.reason, initializedPlayers: [0], readyCount: 1 };
  });

  await run("reconnect-requires-fresh-auth-frame", async (open) => {
    const room = await server.createRoom({ authTimeoutMs: 250 });
    const initial = open(room);
    await authenticate(initial, room);
    await initial.close();
    await zeroConnections(server, room);

    const unauthenticatedReconnect = open(room);
    await unauthenticatedReconnect.open();
    const rejected = await unauthenticatedReconnect.waitClosed();
    assert.equal(rejected.code, 1008);
    assert.equal(rejected.reason, "AUTH_TIMEOUT");
    assert.equal(unauthenticatedReconnect.messages.length, 0, "Previous connection authentication must not carry over");
    await zeroConnections(server, room);

    const authenticatedReconnect = open(room);
    const identity = await authenticate(authenticatedReconnect, room);
    await authenticatedReconnect.close();
    const stats = await zeroConnections(server, room);
    assert.equal(stats.executionCount, 0);
    return { unauthenticatedReconnectCloseCode: rejected.code, authenticatedReconnect: identity, connectionsAfter: 0 };
  });

  await run("bounded-unauthenticated-connections-release-on-timeout", async (open) => {
    const authTimeoutMs = 700;
    const connectionCount = 16;
    const room = await server.createRoom({ authTimeoutMs });
    const probes = Array.from({ length: connectionCount }, () => open(room));
    await Promise.all(probes.map((probe) => probe.open()));
    const before = await server.stats(room.roomId);
    assert.equal(before.pendingUnauthenticatedConnections, connectionCount);
    assert.equal(before.authenticatedConnections, 0);
    const closures = await Promise.all(probes.map((probe) => probe.waitClosed()));
    assert.ok(closures.every((closed) => closed.code === 1008 && closed.reason === "AUTH_TIMEOUT"));
    assert.ok(probes.every((probe) => probe.messages.length === 0));
    const after = await zeroConnections(server, room);
    assert.equal(after.authTimeouts, connectionCount);
    assert.equal(after.executionCount, 0);
    return {
      connectionCount,
      authTimeoutMs,
      pendingBefore: before.pendingUnauthenticatedConnections,
      pendingAfter: after.pendingUnauthenticatedConnections,
      authenticatedAfter: after.authenticatedConnections,
      observedMaximumCloseMs: Math.round(Math.max(...probes.map((probe) => probe.closed.at - probe.openedAt))),
      executionCount: 0,
    };
  });

  await run("credentials-stay-out-of-websocket-url", async (open) => {
    const room = await server.createRoom();
    const probe = open(room);
    await authenticate(probe, room);
    const url = new URL(probe.url);
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    for (const player of room.players) {
      for (const token of [player.token, player.expiredToken, player.wrongSignatureToken]) {
        assert.ok(!probe.url.includes(token), "Credentials must not be encoded in the WebSocket URL");
      }
    }
    return { query: "", credentialInUrl: false, credentialTransport: "first auth text frame" };
  });

  return {
    kind: "authentication",
    passed: cases.every((result) => result.passed),
    caseCount: cases.length,
    cases,
    scope: "Real loopback WebSocket traffic to a Node server with signed fixture JWTs and a scripted game; game payloads use binary protobuf frames.",
    proposal: "Authenticate each connection once before ready or game traffic; bind the token to the route player; reject repeated auth; close idle unauthenticated connections within a bounded timeout.",
    limitations: [
      "This fixture does not establish production Elysia authentication safety or validate the real backend JWT verifier, account database, reverse proxy, TLS, Origin policy, token redaction in deployment logs, or connection rate limits.",
      "The 16-connection timeout experiment verifies fixture resource counters returning to zero, not RSS budgets, denial-of-service resistance, or OS socket reclamation.",
      "Tampered alg=none and RS256 token headers are rejected, but modifying the signed header also invalidates the signature; these cases do not independently establish algorithm pinning.",
      "An oversized auth frame verifies rejection and resource reclamation; the actual close code is recorded, allowing transport termination (1006) or an explicit size error (1009).",
      "Expired credentials are tested at connection authentication; policy for tokens expiring during an already authenticated connection and production refresh behavior remains outside this experiment. The existing backend's 42-day token lifetime is unchanged.",
    ],
  };
}
