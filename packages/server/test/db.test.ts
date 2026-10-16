import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { GamesService } from "../src/games/games.service";
import { DbService } from "../src/db/db.service";
import type { MetricsService } from "../src/metrics/metrics.service";

const root = path.resolve(import.meta.dirname, "..");
const migrationsFolder = path.join(root, "drizzle");
async function legacy(client: PGlite) {
  await client.exec(
    `CREATE TABLE "_prisma_migrations" (migration_name text, finished_at timestamp, rolled_back_at timestamp)`,
  );
  for (const name of (await readdir(path.join(root, "prisma/migrations")))
    .filter((n) => /^\d/.test(n))
    .sort()) {
    await client.exec(
      await readFile(
        path.join(root, "prisma/migrations", name, "migration.sql"),
        "utf8",
      ),
    );
    await client.query(
      `INSERT INTO "_prisma_migrations" VALUES ($1, now(), null)`,
      [name],
    );
  }
}

for (const existing of [false, true]) {
  test(
    existing
      ? "adopts populated Prisma database without data loss"
      : "initializes an empty database",
    async () => {
      const client = new PGlite();
      try {
        if (existing) {
          await legacy(client);
          await client.exec(
            `INSERT INTO "User" (id, name) VALUES (1, 'legacy'), (2, 'other'); INSERT INTO "Deck" (name, code, "requiredVersion", "ownerUserId", "updatedAt") VALUES ('old', 'code', 0, 1, '2025-01-01');`,
          );
        }
        const db = drizzle({ client });
        await migrate(db, { migrationsFolder });
        await migrate(db, { migrationsFolder }); // restart/deploy is idempotent
        if (existing) {
          assert.equal(
            (
              await db.select().from(schema.users).where(eq(schema.users.id, 1))
            )[0]?.name,
            "legacy",
          );
          assert.equal(
            (await db.select().from(schema.decks))[0]?.updatedAt.toISOString(),
            "2025-01-01T00:00:00.000Z",
          );
        } else {
          await db.insert(schema.users).values([{ id: 1 }, { id: 2 }]);
        }
        const [deck] = await db
          .insert(schema.decks)
          .values({
            name: "new",
            code: "test",
            requiredVersion: 1,
            ownerUserId: 1,
          })
          .returning();
        assert.ok(deck!.id > (existing ? 1 : 0));
        assert.ok(deck!.updatedAt instanceof Date);
        const [updated] = await db
          .update(schema.decks)
          .set({ name: "updated" })
          .where(eq(schema.decks.id, deck!.id))
          .returning();
        assert.ok(updated!.updatedAt >= deck!.updatedAt);
        let storedGames = 0;
        const database = new DbService();
        database.db = db;
        const service = new GamesService(database, {
          incrementStoredGames() {
            storedGames++;
          },
        } as MetricsService);
        const game = await service.addGame({
          playerIds: [1, 2],
          coreVersion: "test",
          gameVersion: "test",
          data: '{"log":true}',
          winnerId: 1,
        });
        assert.equal((await service.getGame(game.id))?.data, '{"log":true}');
        assert.deepEqual((await service.getGame(game.id))?.players, [
          { player: { id: 1 }, who: 0 },
          { player: { id: 2 }, who: 1 },
        ]);
        const page = await service.getAllGames({ skip: 0, take: 1 });
        assert.equal(page.count, 1);
        assert.equal("data" in page.data[0]!, false);
        assert.equal(
          (await service.getAllGames({ skip: 10, take: 1 })).count,
          1,
        );
        assert.equal(
          (await service.gamesHasUser(1, {})).data[0]?.game.id,
          game.id,
        );
        assert.equal(await service.getGame(999), null);
        await assert.rejects(
          service.addGame({
            playerIds: [1, 999],
            coreVersion: "test",
            gameVersion: "test",
            data: "bad",
            winnerId: null,
          }),
        );
        assert.equal((await service.getAllGames({})).count, 1);
        assert.equal(storedGames, 1);
      } finally {
        await client.close();
      }
    },
  );
}

test("rejects incomplete or drifted legacy databases", async () => {
  for (const drift of [false, true]) {
    const client = new PGlite();
    try {
      if (drift) {
        await legacy(client);
        await client.exec('ALTER TABLE "User" DROP COLUMN "name"');
      } else await client.exec('CREATE TABLE "User" (id integer PRIMARY KEY)');
      await assert.rejects(migrate(drizzle({ client }), { migrationsFolder }));
      assert.equal(
        (await client.query(`SELECT count(*)::int AS n FROM "User"`)).rows
          .length,
        1,
      );
    } finally {
      await client.close();
    }
  }
});

test("deck ownership, pagination and user upsert/update semantics", async () => {
  const { DEFAULT_ASSETS_MANAGER } = await import("@gi-tcg/assets-manager");
  const prepare = DEFAULT_ASSETS_MANAGER.prepareForSync;
  DEFAULT_ASSETS_MANAGER.prepareForSync = async () => {};
  await import("../src/auth/auth.service");
  const { DecksService } = await import("../src/decks/decks.service");
  const { UsersService } = await import("../src/users/users.service");
  const client = new PGlite();
  try {
    const database = new DbService();
    database.db = drizzle({ client });
    await migrate(drizzle({ client }), { migrationsFolder });
    const users = new UsersService(database);
    await users.create(1, "first");
    await users.create(1, "replacement");
    await users.create(2, "second");
    await users.updateUserInfo(1, { name: "Alice" });
    await users.updateUserInfo(1, {});
    assert.equal(
      (
        await database.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, 1))
      )[0]?.ghToken,
      "replacement",
    );
    await assert.rejects(users.updateUserInfo(999, {}), { status: 404 });
    const decks = new DecksService(database);
    // Isolate persistence from card assets/validation (unchanged by this migration).
    decks.deckToCode = async (deck) => ({
      ...deck,
      code: "test",
      requiredVersion: 2,
    });
    Object.assign(decks, { codeToDeck: () => ({ characters: [], cards: [] }) });
    const deck = await decks.createDeck(1, {
      name: "one",
      characters: [],
      cards: [],
    });
    assert.equal(await decks.getDeck(2, deck.id), null);
    await assert.rejects(decks.updateDeck(2, deck.id, { name: "stolen" }), {
      status: 404,
    });
    await assert.rejects(decks.deleteDeck(2, deck.id), { status: 404 });
    assert.equal((await decks.getAllDecks(1, {})).count, 1);
    assert.equal((await decks.getAllDecks(1, { requiredVersion: 1 })).count, 0);
    assert.equal((await decks.getAllDecks(1, { take: 0 })).data.length, 0);
    assert.equal((await decks.getAllDecks(1, { skip: 1 })).count, 1);
    await decks.updateDeck(1, deck.id, { name: "renamed" });
    assert.equal((await decks.getDeck(1, deck.id))?.name, "renamed");
    await decks.deleteDeck(1, deck.id);
    await assert.rejects(decks.deleteDeck(1, deck.id), { status: 404 });
  } finally {
    await client.close();
    DEFAULT_ASSETS_MANAGER.prepareForSync = prepare;
  }
});
