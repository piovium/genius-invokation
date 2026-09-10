import assert from "node:assert/strict";
import { connectTransport } from "./transport.mjs";
import { answerRpc, readNotification } from "./codec.mjs";
import { delay, waitUntil } from "./http.mjs";

export async function probeHttp(api, deck) {
  const { data: version } = await api("/version");
  assert.ok(typeof version.coreVersion === "string");
  assert.ok(version.supportedGameVersions.includes(version.currentGameVersion));
  const { data: rooms } = await api("/rooms");
  assert.deepEqual(rooms, [], "Use an isolated server with no existing rooms");
  await api("/decks", { status: [401, 403] });
  await api("/games", { status: [401, 403] });
  await api("/rooms", {
    method: "POST", body: { name: "harness-invalid", deck: { ...deck, cards: [] } }, status: [400],
  });
  return {
    coreVersion: version.coreVersion,
    gameVersion: version.currentGameVersion,
    revision: version.revision?.hash ?? null,
    checks: ["version", "empty-room-list", "protected-decks", "protected-games", "invalid-deck"],
  };
}

// The same workload drives both wire transports. No engine/server imports here.
export async function playGame({ api, config, deck, strategy, reconnect = false, accounts }) {
  const start = Date.now();
  const sessions = [null, null];
  let roomId;
  let credentials;
  let completed = false;
  const checks = [];
  const players = [0, 1].map(() => ({
    initialized: false, notifications: 0, rpcCount: 0, methods: {}, actions: {}, round: 0, winner: null,
    privacy: { hiddenCardsChecked: 0, opponentDiceChecked: 0, ownHandCardsObserved: 0 },
  }));
  const connect = (who, token = credentials[who].accessToken) => connectTransport({
    kind: config.transport, baseUrl: config.baseUrl, roomId,
    playerId: credentials[who].playerId, token, timeoutMs: config.requestTimeoutMs,
  });
  const open = async (who) => {
    const previousSessionId = sessions[who]?.ready?.sessionId;
    sessions[who] = await connect(who);
    if (config.transport === "ws" && previousSessionId !== undefined) {
      assert.equal(sessions[who].ready.sessionId, previousSessionId, "Reconnect changed game sessionId");
    }
    return sessions[who];
  };
  const playerPath = (who) => `/rooms/${roomId}/players/${credentials[who].playerId}`;
  try {
    const { data: host } = await api("/rooms", {
      method: "POST", token: accounts?.[0].accessToken,
      body: {
        hostFirst: true, randomSeed: 20260910, private: true, watchable: false, allowGuest: true,
        ...(accounts ? { hostDeckId: accounts[0].deckId } : { name: "harness-host", deck }),
      },
    });
    roomId = host.room.id;
    assert.ok(Number.isInteger(roomId));
    credentials = [accounts?.[0] ?? host, null];
    await open(0);
    // Waiting may be interleaved with rpc:null/oppRpc:null.
    while ((await sessions[0].next()).type !== "waiting") {
      assert.ok(Date.now() - start < config.gameTimeoutMs, "Waiting-room deadline exceeded");
    }
    checks.push("waiting");
    const { data: joined } = await api(`/rooms/${roomId}/players`, {
      method: "POST", token: accounts?.[1].accessToken,
      body: accounts ? { deckId: accounts[1].deckId } : { name: "harness-guest", deck },
    });
    credentials[1] = accounts?.[1] ?? joined;
    await open(1);
    // A player must never be able to subscribe to the opponent's private view.
    await assert.rejects(async () => {
      const forbidden = await connect(0, credentials[1].accessToken);
      try { await forbidden.next(); } finally { await forbidden.close(); }
    }, /HTTP (401|403)|Server transport error:.*(auth|forbid|watch|opponent|own)|disconnected \(code 1008\)/i);
    checks.push("opponent-view-denied");
    await api(`${playerPath(0)}/actionResponse`, {
      method: "POST", token: credentials[1].accessToken,
      body: { id: 0, response: "EgA=" }, status: config.transport === "ws" ? [401, 403, 404, 405, 410] : [401, 403],
    });
    checks.push("opponent-action-denied");
    if (config.transport === "ws") {
      const legacy = await fetch(`${config.baseUrl}${playerPath(0)}/notification`, {
        headers: { Authorization: `Bearer ${credentials[0].accessToken}` },
        signal: AbortSignal.timeout(config.requestTimeoutMs), redirect: "error",
      });
      await legacy.body?.cancel();
      assert.ok([404, 405, 410, 426].includes(legacy.status), "Candidate still exposes the SSE endpoint");
      checks.push("legacy-sse-disabled");
    }

    let reconnected = false;
    let negativeChecked = false;
    const drive = async (who) => {
      const player = players[who];
      let pendingReconnect = null;
      let lastId = -1;
      for (let count = 0; count < 20000; count++) {
        assert.ok(Date.now() - start < config.gameTimeoutMs, "Game deadline exceeded");
        const event = await sessions[who].next(config.requestTimeoutMs);
        if (event.type === "initialized") {
          assert.equal(event.who, who);
          assert.equal(event.myPlayerInfo.id, credentials[who].playerId);
          assert.equal(event.oppPlayerInfo.id, credentials[1 - who].playerId);
          player.initialized = true;
        } else if (event.type === "notification") {
          const state = readNotification(event.data, { viewer: who });
          for (const key of Object.keys(player.privacy)) player.privacy[key] += state.privacy[key];
          player.notifications++;
          player.round = Math.max(player.round, state.roundNumber);
          if (state.phase === 5) {
            assert.ok(player.initialized && player.notifications > 0);
            assert.equal(pendingReconnect, null, "Reconnect must recover its pending RPC");
            player.winner = state.winner;
            return;
          }
        } else if (event.type === "rpc" && event.data !== null) {
          const rpc = event.data;
          if (pendingReconnect) {
            assert.equal(rpc.id, pendingReconnect.id, "Reconnect changed pending RPC id");
            assert.deepEqual(rpc.request, pendingReconnect.request, "Reconnect changed pending RPC request");
            pendingReconnect = null;
            checks.push("reconnect-pending-rpc");
          } else if (reconnect && who === 0 && !reconnected) {
            pendingReconnect = rpc;
            reconnected = true;
            await sessions[0].close();
            await open(0);
            continue;
          }
          assert.ok(rpc.id > lastId, "RPC id repeated or moved backwards");
          lastId = rpc.id;
          if (who === 0 && !negativeChecked) {
            negativeChecked = true;
            const rejectedCommand = /actionResponse (returned HTTP (400|404|409)|rejected:)/;
            const response = (base64) => config.transport === "ws" ? new Uint8Array(Buffer.from(base64, "base64")) : base64;
            await assert.rejects(sessions[0].sendResponse(rpc.id + 100000, response("EgA=")), rejectedCommand);
            checks.push("wrong-rpc-id-rejected");
            await assert.rejects(sessions[0].sendResponse(rpc.id, response("AA==")), rejectedCommand);
            checks.push("malformed-rpc-rejected");
          }
          const answer = answerRpc(rpc.request, { strategy });
          player.methods[answer.method] = (player.methods[answer.method] ?? 0) + 1;
          if (answer.action) player.actions[answer.action] = (player.actions[answer.action] ?? 0) + 1;
          assert.ok(++player.rpcCount <= 2000, "RPC workload limit exceeded");
          await delay(config.actionDelayMs);
          await sessions[who].sendResponse(rpc.id, answer.response);
        }
      }
      throw new Error("Event workload limit exceeded before game end");
    };
    await Promise.all([drive(0), drive(1)]);
    assert.equal(players[0].winner, players[1].winner, "Players disagree on winner");
    for (const player of players) {
      for (const [field, checked] of Object.entries(player.privacy)) {
        assert.ok(checked > 0, `Missing private snapshot coverage: ${field}`);
      }
      for (const method of ["switchHands", "chooseActive", "rerollDice", "action"]) {
        assert.ok(player.methods[method] > 0, `Missing RPC coverage: ${method}`);
      }
      if (strategy === "long") assert.ok(player.round >= 15, "Long game ended before the round limit");
    }
    checks.push("snapshot-private-fields-hidden");
    if (strategy === "combat") {
      assert.ok(players.some((p) => p.actions.useSkill > 0), "Combat workload never used a skill");
    }
    const { data: log } = await api(`/rooms/${roomId}/gameLog`, { token: credentials[0].accessToken });
    assert.equal(log.m?.roomId, roomId, "Missing replay metadata");
    assert.ok(log.m?.endedAt, "Replay lacks end time");
    completed = true;
    checks.push("both-players-game-end", "replay-readable");
    return { roomId, strategy, reconnect, durationMs: Date.now() - start, checks, players };
  } finally {
    if (!completed && credentials?.[0]) {
      // Only touch the room created by this invocation. Preserve the first failure.
      await api(`/rooms/${roomId}`, { method: "DELETE", token: credentials[0].accessToken }).catch(() => {});
      for (const session of sessions) await session?.giveUp().catch(() => {});
    }
    for (const session of sessions) await session?.close();
  }
}

export async function waitForRoomRelease(api, roomId, timeoutMs) {
  const start = Date.now();
  await waitUntil(async () => {
    const result = await api(`/rooms/${roomId}`, { status: [200, 404] });
    return result.status === 404;
  }, timeoutMs, `room ${roomId} release`, 1000);
  return Date.now() - start;
}
