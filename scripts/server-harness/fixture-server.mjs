// HARNESS_SELFTEST ONLY: scripted protocol fixture, never a game engine, database,
// deployment candidate, production baseline, or evidence of migration readiness.
import { createServer } from "node:http";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { selftest: { type: "boolean" }, port: { type: "string" } } });
if (!values.selftest && process.env.HARNESS_SELFTEST !== "1") {
  throw new Error("HARNESS_SELFTEST fixture requires --selftest; it is not a real server");
}
const port = Number(values.port ?? process.env.HARNESS_FIXTURE_PORT ?? "0");
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid fixture port");
const rooms = new Map();
const streams = new Set();
let nextRoomId = 1;
const playerIds = ["guest-host", "guest-player"];
const tokens = ["host", "guest"];
const fromHex = (hex) => Buffer.from(hex, "hex").toString("base64");
const scriptedRequests = [
  "1200", // switchHands
  "1a040a020105", // chooseActive: negative IDs -1, -3
  "0a00", // rerollDice
  "22080a021a000a022a00", // action: useSkill index 0, declareEnd index 1
  "22040a022a00", // action: declareEnd index 0
];

function json(response, status, data) {
  response.writeHead(status, { "content-type": "application/json", "x-harness-selftest": "true" });
  response.end(JSON.stringify(data));
}

async function body(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 1024 * 1024) throw new Error("Fixture request too large");
  }
  return text ? JSON.parse(text) : {};
}

function emit(response, event) {
  if (!response.destroyed && !response.writableEnded) response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function notify(room, who, event) {
  for (const response of room.players[who].streams) emit(response, event);
}

function notification(phase, round = 1, viewer = 0) {
  // Independent snapshot golden: own dice/hand visible; both piles and opponent
  // dice/hand masked. This is still a scripted fixture, not real engine output.
  const own = Buffer.from("3201033a02080242040802102a", "hex");
  const opponent = Buffer.from("320200003a02080242020802", "hex");
  const players = viewer === 0 ? [own, opponent] : [opponent, own];
  const state = Buffer.concat([Buffer.from([8, phase, 16, round]), ...players.map((p) => Buffer.concat([Buffer.from([0x2a, p.length]), p]))]);
  return { type: "notification", data: Buffer.concat([Buffer.from([0x0a, state.length]), state]).toString("base64") };
}

function initialized(room, who) {
  return { type: "initialized", who, config: { watchable: false, gameVersion: "v3.7.0" },
    myPlayerInfo: { id: playerIds[who] }, oppPlayerInfo: { id: playerIds[1 - who] } };
}

function currentRpc(room, who) {
  const player = room.players[who];
  return { type: "rpc", data: player.done ? null : {
    id: player.stage, timer: { current: 30, total: 30 }, request: fromHex(scriptedRequests[player.stage]),
  } };
}

function replay(room, who, response) {
  emit(response, initialized(room, who));
  emit(response, notification(room.finished ? 5 : Math.min(room.players[who].stage, 3), room.finished ? 15 : 1, who));
  if (!room.finished) emit(response, currentRpc(room, who));
}

function finish(room) {
  if (room.finished) return;
  room.finished = true;
  room.endedAt = new Date().toISOString();
  for (const who of [0, 1]) notify(room, who, notification(5, 15, who));
  // Exercise the real final-notification + EOF race in the same event-loop tick.
  for (const player of room.players) for (const response of player.streams) response.end();
  setTimeout(() => rooms.delete(room.id), 150);
}

function advance(room, who, hex) {
  const player = room.players[who];
  notify(room, who, { type: "rpc", data: null });
  if (player.stage === 4 || (player.stage === 3 && hex === "22020801")) player.done = true;
  else player.stage++;
  if (room.players.every((entry) => entry.done)) finish(room);
  else if (!player.done) {
    notify(room, who, notification(Math.min(player.stage, 3), 1, who));
    notify(room, who, currentRpc(room, who));
  }
}

const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://fixture.invalid").pathname;
    if (request.method === "GET" && path === "/api/version") {
      return json(response, 200, { coreVersion: "HARNESS_SELFTEST", supportedGameVersions: ["v3.7.0"], currentGameVersion: "v3.7.0" });
    }
    if (request.method === "GET" && ["/api/decks", "/api/games"].includes(path)) return json(response, 403, { message: "Fixture authentication required" });
    if (path === "/api/rooms" && request.method === "GET") return json(response, 200, []);
    if (path === "/api/rooms" && request.method === "POST") {
      const input = await body(request);
      if (input.deck?.characters?.length !== 3 || input.deck?.cards?.length !== 30) return json(response, 400, { message: "Invalid fixture deck" });
      const room = { id: nextRoomId++, joined: false, finished: false,
        players: [0, 1].map(() => ({ stage: 0, done: false, streams: new Set() })) };
      rooms.set(room.id, room);
      return json(response, 201, { room: { id: room.id }, playerId: playerIds[0], accessToken: tokens[0] });
    }
    const route = /^\/api\/rooms\/(\d+)(?:\/(.*))?$/.exec(path);
    const room = route && rooms.get(Number(route[1]));
    if (!room) return json(response, 404, { message: "Fixture room missing" });
    const suffix = route[2] ?? "";
    if (!suffix && request.method === "GET") return json(response, 200, { id: room.id, status: room.finished ? "finished" : room.joined ? "playing" : "waiting" });
    if (!suffix && request.method === "DELETE") {
      finish(room);
      return json(response, 200, {});
    }
    if (suffix === "gameLog" && request.method === "GET") {
      if (!room.finished) return json(response, 409, { message: "Fixture game unfinished" });
      return json(response, 200, { fixture: "HARNESS_SELFTEST", m: { roomId: room.id, endedAt: room.endedAt } });
    }
    if (suffix === "players" && request.method === "POST") {
      if (room.joined) return json(response, 409, { message: "Fixture room full" });
      await body(request);
      room.joined = true;
      for (const stream of room.players[0].streams) replay(room, 0, stream);
      return json(response, 201, { playerId: playerIds[1], accessToken: tokens[1] });
    }
    const playerRoute = /^players\/([^/]+)\/(notification|actionResponse|giveUp)$/.exec(suffix);
    const who = playerRoute ? playerIds.indexOf(playerRoute[1]) : -1;
    if (who === -1) return json(response, 404, { message: "Fixture player missing" });
    if (request.headers.authorization !== `Bearer ${tokens[who]}`) return json(response, 401, { message: "Fixture opponent access denied" });
    const player = room.players[who];
    if (playerRoute[2] === "notification" && request.method === "GET") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", "x-harness-selftest": "true" });
      player.streams.add(response);
      streams.add(response);
      response.once("close", () => { player.streams.delete(response); streams.delete(response); });
      if (room.joined) replay(room, who, response);
      else emit(response, { type: "waiting" });
      return;
    }
    if (playerRoute[2] === "giveUp" && request.method === "POST") {
      json(response, 200, { message: "given up" });
      return setTimeout(() => finish(room), 5);
    }
    if (playerRoute[2] === "actionResponse" && request.method === "POST") {
      const input = await body(request);
      if (player.done || input.id !== player.stage) return json(response, 404, { message: "Fixture RPC id mismatch" });
      const hex = typeof input.response === "string" ? Buffer.from(input.response, "base64").toString("hex") : "";
      const allowed = [["1200"], ["1a020801"], ["0a00"], ["2200", "22020801"], ["2200"]][player.stage];
      if (!allowed.includes(hex)) return json(response, 400, { message: "Fixture RPC response mismatch" });
      const endsPlayer = player.stage === 4 || (player.stage === 3 && hex === "22020801");
      if (endsPlayer && room.players[1 - who].done) {
        advance(room, who, hex);
        // The final HTTP acknowledgement arrives after the stream has already ended.
        return setTimeout(() => json(response, 200, { message: "response received" }), 10);
      }
      json(response, 200, { message: "response received" });
      return setTimeout(() => advance(room, who, hex), 5);
    }
    json(response, 405, { message: "Unsupported fixture route" });
  } catch (error) {
    if (!response.headersSent) json(response, 400, { message: error.message });
    else response.destroy();
  }
});

function stop() {
  clearTimeout(lifetime);
  for (const response of streams) response.end();
  server.closeAllConnections();
  server.close();
}
// A failed test cannot leave this fixture alive indefinitely.
const lifetime = setTimeout(stop, 60_000);
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
server.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ kind: "HARNESS_SELFTEST", port: server.address().port, pid: process.pid })));
