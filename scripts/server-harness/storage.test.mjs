import assert from "node:assert/strict";
import test from "node:test";
import { prepareStorage, checkStoredGame } from "./storage.mjs";

function fixture(t) {
  const tokenEnvs = ["HARNESS_SELFTEST_A", "HARNESS_SELFTEST_B"];
  for (const [index, name] of tokenEnvs.entries()) {
    const previous = process.env[name];
    process.env[name] = `test-user-${index}`;
    t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  }
  const decks = new Map();
  let stored = null;
  let nextId = 0;
  const api = async (path, { method = "GET", body, token, status = [200] } = {}) => {
    const user = token === "test-user-0" ? 10 : 20;
    if (path === "/users/me") return { data: { id: user } };
    if (path === "/decks" && method === "POST") {
      const id = ++nextId;
      decks.set(id, { ...body, id, code: `code-${id}`, owner: user });
      return { data: { id, code: `code-${id}` } };
    }
    if (path.startsWith("/decks/")) {
      const id = Number(path.split("/").at(-1));
      const deck = decks.get(id);
      if (!deck || deck.owner !== user) {
        assert.ok(status.includes(404));
        return { data: null, status: 404 };
      }
      if (method === "PATCH") Object.assign(deck, body);
      if (method === "DELETE") decks.delete(id);
      return { data: { ...deck } };
    }
    if (path.startsWith("/games/mine")) return { data: { data: stored ? [{ gameId: stored.id }] : [] } };
    if (path.startsWith("/games/")) return { data: stored };
    throw new Error(`Unhandled fixture path: ${path}`);
  };
  return { api, decks, tokenEnvs, setGame: (game) => { stored = game; } };
}

test("storage checks round-trip both accounts' decks, relations, replay and winner", async (t) => {
  const f = fixture(t);
  const storage = await prepareStorage(f.api, { characters: [1, 2, 3], cards: [4, 5] }, f.tokenEnvs);
  const game = { roomId: 7, players: [{ winner: 1 }, { winner: 1 }] };
  const stored = {
    id: 50, data: JSON.stringify({ m: { roomId: 7 } }), winnerId: 20,
    coreVersion: "test", gameVersion: "test", createdAt: new Date().toISOString(),
    players: [{ who: 1, player: { id: 20 } }, { who: 0, player: { id: 10 } }],
  };
  f.setGame(stored);
  assert.equal((await checkStoredGame(f.api, storage.accounts, game, 100)).passed, true);
  f.setGame({ ...stored, winnerId: 10 });
  await assert.rejects(checkStoredGame(f.api, storage.accounts, game, 100), /Expected values/);
  f.setGame({ ...stored, players: [{ who: 0, player: { id: 10 } }, { who: 1, player: { id: 999 } }] });
  await assert.rejects(checkStoredGame(f.api, storage.accounts, game, 100), /Expected values/);
  await storage.dispose();
  assert.equal(f.decks.size, 0);
});

test("storage preparation cleans up the first deck if the second user is invalid", async (t) => {
  const f = fixture(t);
  delete process.env[f.tokenEnvs[1]];
  await assert.rejects(prepareStorage(f.api, { characters: [], cards: [] }, f.tokenEnvs), /Missing test user token/);
  assert.equal(f.decks.size, 0);
});
