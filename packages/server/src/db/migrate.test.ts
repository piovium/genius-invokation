import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { test } from "node:test";
import { createDatabase, createSql } from "./database";
import { migrateDatabase } from "./migrate";
import { games } from "./schema";

const testUrl = process.env.SERVER_DB_TEST_URL;
const migrationDirectory = resolve(import.meta.dirname, "../../migrations");

/** Table the isolated harness fixture used to record the SQL it had applied. */
const HARNESS_MIGRATION_DDL =
  'CREATE TABLE "_HarnessMigration" ("name" TEXT PRIMARY KEY, "sha256" TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())';

type Client = ReturnType<typeof createSql>;

/** Scratch schema for one run; it is spliced into DDL, so keep it a bare identifier. */
function scratchSchema() {
  const name = `gi_migration_probe_${randomBytes(8).toString("hex")}`;
  if (!/^\w+$/.test(name)) throw new Error("Unexpected test schema name");
  return name;
}

test(
  "real PostgreSQL fresh migration is idempotent and keeps rows and FK actions",
  {
    skip: !testUrl,
    timeout: 30_000,
  },
  async () => {
    const base = new URL(testUrl!);
    if (base.pathname !== "/gi_server_harness")
      throw new Error("Use the isolated gi_server_harness database");
    const name = scratchSchema();
    const admin = createSql(base.toString());
    let client: Client | undefined;
    try {
      await admin.unsafe(`CREATE SCHEMA "${name}"`);
      base.searchParams.set("schema", name);
      const first = await migrateDatabase(base.toString(), migrationDirectory);
      assert.equal(first.applied.length, 3);
      client = createSql(base.toString());
      await client`INSERT INTO "User" (id, name) VALUES (91000001, 'migration-probe')`;
      const repeated = await migrateDatabase(
        base.toString(),
        migrationDirectory,
      );
      assert.deepEqual(repeated.applied, []);
      const [row] = await client`SELECT name FROM "User" WHERE id = 91000001`;
      assert.equal(row!.name, "migration-probe");
      const database = createDatabase(base.toString());
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
      await client.unsafe(HARNESS_MIGRATION_DDL);
      await client`INSERT INTO "_HarnessMigration" ("name", "sha256") VALUES ('20990101000000_future', 'future')`;
      await assert.rejects(
        migrateDatabase(base.toString(), migrationDirectory),
        /migrations unknown to this server build/,
      );
      await client`DROP TABLE "_HarnessMigration"`;
      await client.unsafe(
        'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
      );
      await assert.rejects(
        migrateDatabase(base.toString(), migrationDirectory),
        /foreign key differs/,
      );
    } finally {
      await client?.close();
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
      await admin.close();
    }
  },
);
