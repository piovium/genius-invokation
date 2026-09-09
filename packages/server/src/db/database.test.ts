import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createSql, DatabaseService } from "./database.service";
import { migrateDatabase } from "./migrate";
import { DecksService } from "../decks/decks.service";
import { GamesService } from "../games/games.service";
import { MetricsService } from "../metrics/metrics.service";
import { ASSETS_MANAGER } from "../utils";

const execute = promisify(execFile);
const testUrl = process.env.SERVER_DB_TEST_URL;
const migrationDirectory = resolve(
  import.meta.dirname,
  "../../prisma/migrations",
);
async function fixture(body: (url: string) => Promise<void>) {
  if (!testUrl) throw new Error("SERVER_DB_TEST_URL is required");
  const base = new URL(testUrl);
  if (base.pathname !== "/gi_server_harness")
    throw new Error(
      "Database tests require the isolated gi_server_harness database",
    );
  const schema = "gi_migration_test_" + randomBytes(8).toString("hex");
  const admin = createSql(testUrl);
  await admin.unsafe('CREATE SCHEMA "' + schema + '"');
  try {
    base.searchParams.set("schema", schema);
    await body(base.toString());
  } finally {
    if (!/^gi_migration_test_[a-f0-9]{16}$/.test(schema))
      throw new Error("Unexpected database test schema");
    await admin.unsafe('DROP SCHEMA "' + schema + '" CASCADE');
    await admin.close();
  }
}

test(
  "existing Prisma rows are adopted without loss; Drizzle ownership, transactions and process restart preserve them",
  {
    skip: !testUrl,
    timeout: 60_000,
  },
  async () => {
    await fixture(async (url) => {
      const legacy = createSql(url);
      let database: DatabaseService | undefined;
      try {
        await legacy.unsafe(
          'CREATE TABLE "_prisma_migrations" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)',
        );
        const names = (
          await readdir(migrationDirectory, { withFileTypes: true })
        )
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort();
        for (const name of names) {
          const source = await readFile(
            resolve(migrationDirectory, name, "migration.sql"),
            "utf8",
          );
          await legacy.unsafe(source);
          await legacy`INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (${crypto.randomUUID()}, ${createHash("sha256").update(source).digest("hex")}, ${name}, now(), 1)`;
        }
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
        const before =
          await legacy`SELECT id, name, "ghToken", "createdAt" FROM "User" ORDER BY id`;
        const first = await migrateDatabase(url, migrationDirectory);
        assert.deepEqual(first.adopted, names);
        assert.deepEqual(first.applied, []);
        assert.deepEqual(
          await legacy`SELECT id, name, "ghToken", "createdAt" FROM "User" ORDER BY id`,
          before,
        );
        const repeated = await migrateDatabase(url, migrationDirectory);
        assert.deepEqual(repeated.adopted, []);
        assert.deepEqual(repeated.applied, []);
        database = new DatabaseService(url);
        const decks = new DecksService(database);
        const games = new GamesService(database, new MetricsService());
        assert.deepEqual(
          (await decks.getDeck(91000001, oldDeck!.id))?.characters,
          deck.characters,
        );
        assert.equal(await decks.getDeck(91000002, oldDeck!.id), null);
        await assert.rejects(
          decks.updateDeck(91000002, oldDeck!.id, { name: "forbidden" }),
          { status: 404 },
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
          resolve(import.meta.dirname, "database.service.ts"),
        ).href;
        const { stdout } = await execute(
          process.execPath,
          [
            "--import",
            import.meta.resolve("@gi-tcg/config/preload"),
            "--input-type=module",
            "-e",
            `import { DatabaseService } from ${JSON.stringify(moduleUrl)}; const d = new DatabaseService(process.env.SERVER_DB_TEST_URL); try { const rows = await d.client\`SELECT data, "winnerId" FROM "Game" WHERE id = ${game.id}\`; if(rows.length!==1 || rows[0].winnerId!==91000002 || JSON.parse(rows[0].data).m.roomId!==54321) throw new Error('Persisted replay mismatch'); console.log('restart-persistence-ok'); } finally { await d.close(); }`,
          ],
          { env: { ...process.env, SERVER_DB_TEST_URL: url }, timeout: 15_000 },
        );
        assert.equal(stdout.trim(), "restart-persistence-ok");
        database = new DatabaseService(url);
        assert.equal(
          (await new DecksService(database).getDeck(91000001, oldDeck!.id))
            ?.name,
          "updated-deck",
        );
        await new DecksService(database).deleteDeck(91000001, oldDeck!.id);
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
      const result = await migrateDatabase(url, migrationDirectory);
      assert.equal(result.applied.length, 3);
      const client = createSql(url);
      try {
        await client.unsafe(
          'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
        );
        await client.unsafe(
          'ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE',
        );
        await assert.rejects(
          migrateDatabase(url, migrationDirectory),
          /foreign key differs/,
        );
        await client.unsafe(
          'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
        );
        await client.unsafe(
          'ALTER TABLE "Deck" ADD CONSTRAINT "Deck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE',
        );
        await client`UPDATE "__drizzle_migrations" SET hash = 'changed' WHERE name = '20251013090510_init'`;
        await assert.rejects(
          migrateDatabase(url, migrationDirectory),
          /SQL migration changed/,
        );
      } finally {
        await client.close();
      }
    });
  },
);
