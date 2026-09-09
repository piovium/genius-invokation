// HARNESS_SELFTEST: a loopback-only Bun WebSocket experiment, not application code.
// This in-memory model deliberately does not load Elysia, an ORM, or the game engine.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { encodeGameFrame, decodeGameFrame } from "../wire.mjs";

if (!process.argv.includes("--selftest") || typeof Bun === "undefined") {
  throw new Error("This fixture requires Bun and the explicit --selftest flag");
}

const secret = randomBytes(32);
const rooms = new Map();
const requestBytes = Uint8Array.of(0x12, 0); // Request.switch_hands {}
const legalResponse = Buffer.from([0x12, 0]); // Response.switch_hands {}
const sign = (value, key = secret) => createHmac("sha256", key).update(value).digest("base64url");
function issueToken(player, roomId, overrides = {}, key = secret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ sub: player.userId, roomId, playerId: player.playerId, exp: Math.floor(Date.now() / 1000) + 3600, ...overrides })).toString("base64url");
  return `${header}.${claims}.${sign(`${header}.${claims}`, key)}`;
}
function verifyToken(token, room, player) {
  if (typeof token !== "string" || token.length > 4096) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  try {
    const [header, claims] = parts.slice(0, 2).map((part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")));
    if (header.alg !== "HS256" || header.typ !== "JWT") return false;
    const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`), "base64url");
    const supplied = Buffer.from(parts[2], "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    return Number.isInteger(claims.exp) && claims.exp > Math.floor(Date.now() / 1000) && claims.sub === player.userId && claims.roomId === room.roomId && claims.playerId === player.playerId;
  } catch { return false; }
}
function snapshot(room) {
  return {
    roomId: room.roomId, sessionId: room.sessionId,
    executionCount: room.players.reduce((n, player) => n + player.executionCount, 0),
    cacheSize: room.players.reduce((n, player) => n + player.cache.size, 0),
    cacheLimit: room.cacheLimit, faultTriggered: room.faultTriggered,
    authenticatedConnections: [...room.sockets].filter((ws) => ws.data.authenticated).length,
    pendingUnauthenticatedConnections: [...room.sockets].filter((ws) => !ws.data.authenticated).length,
    authFailures: room.authFailures, authTimeouts: room.authTimeouts, totalConnections: room.totalConnections,
    players: room.players.map((player) => ({ playerId: player.playerId, nextRpcId: player.nextRpcId, executionCount: player.executionCount, cacheSize: player.cache.size })),
  };
}
function send(ws, value) { ws.send(JSON.stringify(value)); }
function sendRpc(ws) {
  ws.send(encodeGameFrame({ type: "rpc", data: { id: ws.data.player.nextRpcId, timer: { current: 60, total: 120 }, request: requestBytes } }));
}
function rejectAuth(ws, code) {
  if (ws.data.closing) return;
  ws.data.closing = true;
  clearTimeout(ws.data.authTimer);
  ws.data.room.authFailures++;
  if (code === "AUTH_TIMEOUT") ws.data.room.authTimeouts++;
  ws.close(1008, code);
}
function closePolicy(ws, code) {
  ws.data.closing = true;
  clearTimeout(ws.data.authTimer);
  ws.close(1008, code);
}
function rejectCommand(ws, id, code) {
  send(ws, { type: "commandError", command: "actionResponse", id, code, message: code, resyncRequired: code === "STALE_RPC" });
}
function actionResponse(ws, command) {
  const { room, player } = ws.data;
  const { id, response } = command;
  const digest = createHash("sha256").update(response).digest("hex");
  const previous = player.cache.get(id);
  if (previous) {
    if (previous.digest !== digest) return rejectCommand(ws, id, "CONFLICT");
    send(ws, previous.ack);
    return;
  }
  if (id < player.nextRpcId) return rejectCommand(ws, id, "STALE_RPC");
  if (id > player.nextRpcId) return rejectCommand(ws, id, "FUTURE_RPC");
  if (!Buffer.from(response).equals(legalResponse)) return rejectCommand(ws, id, "INVALID_RESPONSE");
  const fault = room.faultTriggered ? "none" : room.fault;
  if (fault !== "none") room.faultTriggered = true;
  if (fault === "before-accept") { ws.data.closing = true; ws.terminate(); return; }

  // Atomic only within this single Bun process. A restart erases this fixture state.
  const ack = { type: "ack", command: "actionResponse", id, sessionId: room.sessionId };
  player.executionCount++;
  player.nextRpcId++;
  player.cache.set(id, { digest, ack });
  while (player.cache.size > room.cacheLimit) player.cache.delete(player.cache.keys().next().value);
  if (fault === "after-accept-before-ack") { ws.data.closing = true; ws.terminate(); return; }
  send(ws, ack);
  if (fault === "after-ack") { ws.data.closing = true; ws.close(1012, "SELFTEST_AFTER_ACK"); return; }
  for (const peer of room.sockets) {
    if (!peer.data.closing && peer.data.authenticated && peer.data.player === player && peer.readyState === 1) sendRpc(peer);
  }
}

const server = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/__harness/rooms" && request.method === "POST") {
      const options = await request.json();
      const fault = options.fault ?? "none";
      const authTimeoutMs = options.authTimeoutMs ?? 500;
      const cacheLimit = options.cacheLimit ?? 32;
      if (!["none", "before-accept", "after-accept-before-ack", "after-ack"].includes(fault) || !Number.isInteger(authTimeoutMs) || authTimeoutMs < 10 || authTimeoutMs > 10000 || !Number.isInteger(cacheLimit) || cacheLimit < 1 || cacheLimit > 128) return new Response("Invalid fixture options", { status: 400 });
      const roomId = randomUUID(), sessionId = randomUUID();
      const players = [0, 1].map((index) => ({ playerId: `player-${index}-${randomUUID()}`, userId: randomUUID(), index, cache: new Map(), executionCount: 0, nextRpcId: 1 }));
      const room = { roomId, sessionId, players, fault, authTimeoutMs, cacheLimit, faultTriggered: false, sockets: new Set(), authFailures: 0, authTimeouts: 0, totalConnections: 0 };
      rooms.set(roomId, room);
      return Response.json({ roomId, sessionId, players: players.map((player) => ({ playerId: player.playerId, token: issueToken(player, roomId), expiredToken: issueToken(player, roomId, { exp: Math.floor(Date.now() / 1000) - 60 }), wrongSignatureToken: issueToken(player, roomId, {}, randomBytes(32)) })) });
    }
    const statsMatch = url.pathname.match(/^\/__harness\/rooms\/([^/]+)\/stats$/);
    if (statsMatch && request.method === "GET") {
      const room = rooms.get(statsMatch[1]);
      return room ? Response.json(snapshot(room)) : new Response("Room not found", { status: 404 });
    }
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/players\/([^/]+)\/ws$/);
    if (wsMatch) {
      const room = rooms.get(wsMatch[1]);
      const player = room?.players.find((player) => player.playerId === wsMatch[2]);
      if (!room || !player) return new Response("Room or player not found", { status: 404 });
      if (server.upgrade(request, { data: { room, player, authenticated: false, closing: false, authTimer: null } })) return;
      return new Response("Upgrade required", { status: 426 });
    }
    return new Response("Harness selftest only", { status: 404 });
  },
  websocket: {
    maxPayloadLength: 64 * 1024,
    open(ws) {
      const { room } = ws.data;
      room.sockets.add(ws);
      room.totalConnections++;
      ws.data.authTimer = setTimeout(() => rejectAuth(ws, "AUTH_TIMEOUT"), room.authTimeoutMs);
    },
    message(ws, data) {
      if (ws.data.closing) return;
      if (!ws.data.authenticated) {
        let auth;
        try { if (typeof data === "string") auth = JSON.parse(data); } catch {}
        if (auth?.type !== "auth") return rejectAuth(ws, "AUTH_REQUIRED");
        if (!verifyToken(auth.token, ws.data.room, ws.data.player)) return rejectAuth(ws, "INVALID_TOKEN");
        clearTimeout(ws.data.authTimer);
        ws.data.authenticated = true;
        send(ws, { type: "ready", sessionId: ws.data.room.sessionId });
        send(ws, { type: "initialized", who: ws.data.player.index });
        sendRpc(ws);
        return;
      }
      if (typeof data === "string") {
        let value;
        try { value = JSON.parse(data); } catch { closePolicy(ws, "INVALID_CONTROL"); return; }
        if (value?.type === "auth") return rejectAuth(ws, "DUPLICATE_AUTH");
        closePolicy(ws, "BINARY_RESPONSE_REQUIRED");
        return;
      }
      try {
        const command = decodeGameFrame(data);
        if (command.type !== "actionResponse") { closePolicy(ws, "UNEXPECTED_GAME_FRAME"); return; }
        actionResponse(ws, command);
      } catch { closePolicy(ws, "INVALID_BINARY_FRAME"); }
    },
    close(ws) { ws.data.closing = true; clearTimeout(ws.data.authTimer); ws.data.room.sockets.delete(ws); },
  },
});
process.stdout.write(`${JSON.stringify({ type: "harness-ready", port: server.port })}\n`);
