import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createDecks } from "../decks/decks";
import { createGames } from "../games/games";
import { createMetrics } from "../metrics/metrics";
import { ASSETS_MANAGER } from "../utils";
import {
  createDatabase,
  createSql,
  type Database,
  type SqlConnection,
} from "./database";
import { migrateDatabase } from "./migrate";

const execute = promisify(execFile);
const testUrl = process.env.SERVER_DB_TEST_URL;
const migrationsDirectory = resolve(import.meta.dirname, "../../drizzle");

/** Scratch schema for one run; it is spliced into DDL, so keep it a bare identifier. */
function scratchSchema() {
  const name = `gi_migration_test_${randomBytes(8).toString("hex")}`;
  if (!/^\w+$/.test(name)) throw new Error("Unexpected database test schema");
  return name;
}

/** Swap the deck-owner foreign key for one with the same name but other actions. */
async function setDeckOwnerForeignKey(client: SqlConnection, onDelete: string) {
  await client.unsafe(
    'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
  );
  await client.unsafe(
    `ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON DELETE ${onDelete} ON UPDATE CASCADE`,
  );
}

async function fixture(body: (url: string) => Promise<void>) {
  if (!testUrl) throw new Error("SERVER_DB_TEST_URL is required");
  const base = new URL(testUrl);
  if (base.pathname !== "/gi_server_harness")
    throw new Error(
      "Database tests require the isolated gi_server_harness database",
    );
  const schema = scratchSchema();
  const admin = createSql(testUrl);
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  try {
    base.searchParams.set("schema", schema);
    await body(base.toString());
  } finally {
    await admin.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.close();
  }
}

test(
  "a database that lost its migration log is adopted without loss; Drizzle ownership, transactions and process restart preserve it",
  {
    skip: !testUrl,
    timeout: 60_000,
  },
  async () => {
    await fixture(async (url) => {
      const deployed = await migrateDatabase(url, migrationsDirectory);
      const names = deployed.applied;
      assert.deepEqual(names, [
        "0000_init",
        "0001_user_add_color",
        "0002_user_add_name",
      ]);
      const legacy = createSql(url);
      let database: Database | undefined;
      try {
        await legacy`INSERT INTO "User" (id, name, "ghToken") VALUES (91000001, 'Existing A', 'existing-fake-a'), (91000002, 'Existing B', 'existing-fake-b')`;
        const deck = JSON.parse(
          await readFile(
            resolve(
              import.meta.dirname,
              "../../../../scripts/server-harness/deck.json",
            ),
            "utf8",
          ),
        );
        const code = ASSETS_MANAGER.encode(deck);
        const [oldDeck] =
          await legacy`INSERT INTO "Deck" (name, code, "requiredVersion", "ownerUserId", "updatedAt") VALUES ('existing-deck', ${code}, 0, 91000001, '2025-12-01T00:00:00') RETURNING id`;
        // The deployed database predates this service's own migration log.
        await legacy`DROP TABLE "__drizzle_migrations"`;
        const before =
          await legacy`SELECT id, name, "ghToken", "createdAt" FROM "User" ORDER BY id`;
        const first = await migrateDatabase(url, migrationsDirectory);
        assert.deepEqual(first.adopted, names);
        assert.deepEqual(first.applied, []);
        assert.deepEqual(
          await legacy`SELECT id, name, "ghToken", "createdAt" FROM "User" ORDER BY id`,
          before,
        );
        const repeated = await migrateDatabase(url, migrationsDirectory);
        assert.deepEqual(repeated.adopted, []);
        assert.deepEqual(repeated.applied, []);
        database = createDatabase(url);
        const decks = createDecks(database);
        const games = createGames(database, createMetrics());
        assert.deepEqual(
          (await decks.getDeck(91000001, oldDeck!.id))?.characters,
          deck.characters,
        );
        assert.equal(await decks.getDeck(91000002, oldDeck!.id), null);
        await assert.rejects(
          decks.updateDeck(91000002, oldDeck!.id, { name: "forbidden" }),
          { statusCode: 404 },
        );
        await decks.updateDeck(91000001, oldDeck!.id, { name: "updated-deck" });
        const data = JSON.stringify({
          m: { roomId: 54321, endedAt: "2026-09-10" },
          states: [{ phase: "gameEnd" }],
        });
        const game = await games.addGame({
          playerIds: [91000001, 91000002],
          coreVersion: "existing-compatible",
          gameVersion: "v5.0.0",
          data,
          winnerId: 91000002,
        });
        assert.deepEqual((await games.getGame(game.id))?.players, [
          { player: { id: 91000001 }, who: 0 },
          { player: { id: 91000002 }, who: 1 },
        ]);
        assert.equal((await games.getGame(game.id))?.data, data);
        assert.equal(
          (await games.gamesHasUser(91000002, {})).data[0]?.gameId,
          game.id,
        );
        await assert.rejects(
          games.addGame({
            playerIds: [91000001, 2147483000],
            coreVersion: "must-rollback",
            gameVersion: "v5.0.0",
            data: "{}",
            winnerId: null,
          }),
        );
        assert.equal((await games.getAllGames({})).count, 1);
        await database.close();
        database = undefined;
        // A fresh Node process opens its own pg pool and reads persisted bytes.
        const moduleUrl = pathToFileURL(
          resolve(import.meta.dirname, "database.ts"),
        ).href;
        const restartScript = `
          import { createDatabase } from ${JSON.stringify(moduleUrl)};

          const database = createDatabase(process.env.SERVER_DB_TEST_URL);
          try {
            const rows = await database.sql\`SELECT data, "winnerId" FROM "Game" WHERE id = ${game.id}\`;
            if (
              rows.length !== 1 ||
              rows[0].winnerId !== 91000002 ||
              JSON.parse(rows[0].data).m.roomId !== 54321
            ) {
              throw new Error("Persisted replay mismatch");
            }
            console.log("restart-persistence-ok");
          } finally {
            await database.close();
          }
        `;
        const { stdout } = await execute(
          process.execPath,
          [
            "--import",
            import.meta.resolve("@gi-tcg/config/preload"),
            "--input-type=module",
            "-e",
            restartScript,
          ],
          { env: { ...process.env, SERVER_DB_TEST_URL: url }, timeout: 15_000 },
        );
        assert.equal(stdout.trim(), "restart-persistence-ok");
        database = createDatabase(url);
        const restarted = createDecks(database);
        assert.equal(
          (await restarted.getDeck(91000001, oldDeck!.id))?.name,
          "updated-deck",
        );
        await restarted.deleteDeck(91000001, oldDeck!.id);
      } finally {
        await database?.close();
        await legacy.close();
      }
    });
  },
);

test(
  "fresh SQL migrations are atomic and schema or checksum drift is rejected on rerun",
  {
    skip: !testUrl,
    timeout: 60_000,
  },
  async () => {
    await fixture(async (url) => {
      const result = await migrateDatabase(url, migrationsDirectory);
      assert.equal(result.applied.length, 3);
      const client = createSql(url);
      try {
        await setDeckOwnerForeignKey(client, "CASCADE");
        await assert.rejects(
          migrateDatabase(url, migrationsDirectory),
          /foreign key differs/,
        );
        await setDeckOwnerForeignKey(client, "RESTRICT");
        await client`UPDATE "__drizzle_migrations" SET hash = 'changed' WHERE name = '0000_init'`;
        await assert.rejects(
          migrateDatabase(url, migrationsDirectory),
          /SQL migration changed/,
        );
      } finally {
        await client.close();
      }
    });
  },
);
