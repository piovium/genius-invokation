import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createSql, DatabaseService } from "./database.service";
import { games } from "./schema";
import { migrateDatabase } from "./migrate";

test(
  "real PostgreSQL fresh migration is idempotent and keeps rows and FK actions",
  {
    skip: !process.env.SERVER_DB_TEST_URL,
    timeout: 30_000,
  },
  async () => {
    const base = new URL(process.env.SERVER_DB_TEST_URL!);
    if (base.pathname !== "/gi_server_harness")
      throw new Error("Use the isolated gi_server_harness database");
    const name = "gi_migration_probe_" + randomBytes(8).toString("hex");
    const admin = createSql(base.toString());
    let client: ReturnType<typeof createSql> | undefined;
    try {
      await admin.unsafe('CREATE SCHEMA "' + name + '"');
      base.searchParams.set("schema", name);
      const folder = resolve(import.meta.dirname, "../../prisma/migrations");
      assert.equal(
        (await migrateDatabase(base.toString(), folder)).applied.length,
        3,
      );
      client = createSql(base.toString());
      await client`INSERT INTO "User" (id, name) VALUES (91000001, 'migration-probe')`;
      assert.deepEqual(
        (await migrateDatabase(base.toString(), folder)).applied,
        [],
      );
      const [row] = await client`SELECT name FROM "User" WHERE id = 91000001`;
      assert.equal(row!.name, "migration-probe");
      const database = new DatabaseService(base.toString());
      try {
        const replay = JSON.stringify({ m: { roomId: 7 } });
        const [game] = await database.db
          .insert(games)
          .values({
            coreVersion: "probe",
            gameVersion: "probe",
            data: replay,
          })
          .returning();
        assert.equal(game!.data, replay);
        assert.ok(game!.createdAt instanceof Date);
      } finally {
        await database.close();
      }
      await client.unsafe(
        'CREATE TABLE "_prisma_migrations" (migration_name TEXT, checksum TEXT, finished_at TIMESTAMPTZ, rolled_back_at TIMESTAMPTZ)',
      );
      await client`INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at) VALUES ('20990101000000_future', 'future', now())`;
      await assert.rejects(
        migrateDatabase(base.toString(), folder),
        /legacy migrations unknown/,
      );
      await client`DELETE FROM "_prisma_migrations" WHERE migration_name = '20990101000000_future'`;
      await client.unsafe(
        'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
      );
      await assert.rejects(
        migrateDatabase(base.toString(), folder),
        /foreign key differs/,
      );
    } finally {
      await client?.close();
      if (!/^gi_migration_probe_[a-f0-9]{16}$/.test(name))
        throw new Error("Unexpected test schema name");
      await admin.unsafe('DROP SCHEMA IF EXISTS "' + name + '" CASCADE');
      await admin.close();
    }
  },
);
