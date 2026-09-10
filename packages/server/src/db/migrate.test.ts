import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { test } from "node:test";
import { createDatabase, createSql } from "./database";
import { migrateDatabase } from "./migrate";
import { games } from "./schema";

const testUrl = process.env.SERVER_DB_TEST_URL;
const migrationsDirectory = resolve(import.meta.dirname, "../../drizzle");

type Client = ReturnType<typeof createSql>;

/** Scratch schema for one run; it is spliced into DDL, so keep it a bare identifier. */
function scratchSchema() {
  const name = `gi_migration_probe_${randomBytes(8).toString("hex")}`;
  if (!/^\w+$/.test(name)) throw new Error("Unexpected test schema name");
  return name;
}

test(
  "real PostgreSQL fresh migration is idempotent and preserves rows and foreign-key actions",
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
      const scopedUrl = base.toString();
      const migrate = () => migrateDatabase(scopedUrl, migrationsDirectory);
      const first = await migrate();
      assert.equal(first.applied.length, 3);
      client = createSql(scopedUrl);
      await client`INSERT INTO "User" (id, name) VALUES (91000001, 'migration-probe')`;
      const repeated = await migrate();
      assert.deepEqual(repeated.applied, []);
      const [row] = await client`SELECT name FROM "User" WHERE id = 91000001`;
      assert.equal(row!.name, "migration-probe");
      const database = createDatabase(scopedUrl);
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
      // A database whose log is gone but whose schema matches is adopted as a
      // whole, never recreated.
      await client`DROP TABLE "__drizzle_migrations"`;
      const adopted = await migrate();
      assert.deepEqual(adopted.adopted, [
        "0000_init",
        "0001_user_add_color",
        "0002_user_add_name",
      ]);
      assert.deepEqual(adopted.applied, []);
      const [kept] = await client`SELECT name FROM "User" WHERE id = 91000001`;
      assert.equal(kept!.name, "migration-probe");
      await client`INSERT INTO "__drizzle_migrations" (name, hash, created_at) VALUES ('9999_future', 'future', 0)`;
      await assert.rejects(migrate(), /does not ship/);
      await client`DELETE FROM "__drizzle_migrations" WHERE name = '9999_future'`;
      await client.unsafe(
        'ALTER TABLE "Deck" DROP CONSTRAINT "Deck_ownerUserId_fkey"',
      );
      await assert.rejects(migrate(), /foreign key differs/);
    } finally {
      await client?.close();
      await admin.unsafe(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
      await admin.close();
    }
  },
);
