import assert from "node:assert/strict";
import { waitUntil } from "./http.mjs";

// Two existing, disposable test users. Tokens stay in the environment, never reports.
export async function prepareStorage(api, deck, tokenEnvNames) {
  assert.equal(tokenEnvNames.length, 2, "Storage checks require two test users");
  const accounts = [];
  const dispose = async () => {
    const failures = [];
    for (const account of accounts) {
      try {
        await api(`/decks/${account.deckId}`, { method: "DELETE", token: account.accessToken });
        await api(`/decks/${account.deckId}`, { token: account.accessToken, status: [404] });
      } catch (error) { failures.push(error); }
    }
    if (failures.length) throw new AggregateError(failures, "Test deck cleanup failed");
  };
  try {
    for (const [index, envName] of tokenEnvNames.entries()) {
      const token = process.env[envName];
      assert.ok(token, `Missing test user token environment variable: ${envName}`);
      const { data: user } = await api("/users/me", { token });
      assert.ok(Number.isInteger(user?.id), "Token must identify an existing registered test user");
      assert.ok(!accounts.some((a) => a.playerId === user.id), "Use two different test users");
      const name = `harness-${Date.now()}-${index}`;
      const { data: created } = await api("/decks", { method: "POST", token, body: { ...deck, name } });
      assert.ok(Number.isInteger(created.id));
      const account = { playerId: user.id, accessToken: token, deckId: created.id };
      accounts.push(account);
      const { data: fetched } = await api(`/decks/${created.id}`, { token });
      assert.deepEqual(fetched.characters, deck.characters);
      assert.deepEqual(fetched.cards, deck.cards);
      assert.equal(fetched.code, created.code);
      const updatedName = `${name}-updated`;
      await api(`/decks/${created.id}`, { method: "PATCH", token, body: { name: updatedName } });
      const { data: updated } = await api(`/decks/${created.id}`, { token });
      assert.equal(updated.name, updatedName);
      assert.equal(updated.code, created.code);
      const { data: history } = await api("/games/mine?take=30", { token });
      account.previousGameIds = history.data.map((row) => row.gameId);
    }
    await api(`/decks/${accounts[0].deckId}`, { token: accounts[1].accessToken, status: [404] });
    return { accounts, dispose };
  } catch (error) {
    await dispose().catch(() => {});
    throw error;
  }
}

export async function checkStoredGame(api, accounts, game, timeoutMs) {
  const stored = await waitUntil(async () => {
    const { data: history } = await api("/games/mine?take=30", { token: accounts[0].accessToken });
    for (const row of history.data) {
      if (accounts[0].previousGameIds.includes(row.gameId)) continue;
      const { data: entry } = await api(`/games/${row.gameId}`, { token: accounts[0].accessToken });
      const replay = typeof entry.data === "string" ? JSON.parse(entry.data) : entry.data;
      if (replay.m?.roomId === game.roomId) return entry;
    }
    return null;
  }, timeoutMs, "game persisted with matching replay room id");
  const players = [...stored.players].sort((a, b) => a.who - b.who);
  assert.deepEqual(players.map((p) => p.who), [0, 1]);
  assert.deepEqual(players.map((p) => p.player.id), accounts.map((p) => p.playerId));
  const winner = game.players[0].winner;
  assert.equal(stored.winnerId, winner === null ? null : accounts[winner].playerId);
  assert.ok(stored.coreVersion && stored.gameVersion && stored.createdAt);
  const { data: otherHistory } = await api("/games/mine?take=30", { token: accounts[1].accessToken });
  assert.ok(otherHistory.data.some((row) => row.gameId === stored.id), "Both players must see the stored game");
  return { passed: true, checks: ["deck-create-read-update-delete", "deck-owner-isolation", "game-persisted", "player-relations", "winner", "replay", "both-player-histories"] };
}
