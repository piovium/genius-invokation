import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createSql, type SqlConnection } from "./database.service";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function findMigrationDirectory() {
  if (process.env.MIGRATIONS_DIRECTORY)
    return resolve(process.env.MIGRATIONS_DIRECTORY);
  for (const candidate of [
    resolve(import.meta.dirname, "migrations"),
    resolve(import.meta.dirname, "../../migrations"),
  ]) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* Source and packaged layouts differ. */
    }
  }
  throw new Error("Migration SQL is missing from the server distribution");
}

/**
 * Apply this server's SQL migrations. A database whose schema was created from
 * the same files by other bookkeeping (the isolated fixture) is adopted after
 * its recorded checksums are verified.
 */
export async function migrateDatabase(
  connectionString?: string,
  migrationDirectory?: string,
) {
  const directory = migrationDirectory ?? (await findMigrationDirectory());
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (
    !names.length ||
    names.some((name) => !/^\d{14}_[A-Za-z0-9_]+$/.test(name))
  )
    throw new Error("Invalid original SQL migration manifest");
  const sources = await Promise.all(
    names.map(async (name) => {
      const text = await readFile(
        resolve(directory, name, "migration.sql"),
        "utf8",
      );
      const normalized = text.replaceAll("\r\n", "\n");
      return {
        name,
        text,
        hash: hash(normalized),
        acceptedHashes: new Set([
          hash(text),
          hash(normalized),
          hash(normalized.replaceAll("\n", "\r\n")),
        ]),
      };
    }),
  );
  const client = createSql(connectionString);
  try {
    return await client.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext(current_database()), hashtext(current_schema() || ':gi-server-migrations'))`;
      const [migrationState] =
        await tx`SELECT to_regclass('"_HarnessMigration"') IS NOT NULL AS fixture, to_regclass('"User"') IS NOT NULL AS populated`;
      if (!migrationState)
        throw new Error("Cannot read the database migration state");
      const fixtureHistory = migrationState.fixture
        ? await tx.unsafe('SELECT name, sha256 FROM "_HarnessMigration"')
        : [];
      if (fixtureHistory.some((row) => !names.includes(row.name)))
        throw new Error("Database has migrations unknown to this server build");
      await tx.unsafe(
        'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" ("id" SERIAL PRIMARY KEY, "hash" TEXT NOT NULL, "created_at" BIGINT NOT NULL, "name" TEXT NOT NULL UNIQUE)',
      );
      const recorded = await tx.unsafe(
        'SELECT name, hash FROM "__drizzle_migrations"',
      );
      if (recorded.some((row) => !names.includes(row.name)))
        throw new Error("Database has migrations newer than this server build");
      const applied: string[] = [];
      const adopted: string[] = [];
      for (const source of sources) {
        const existing = recorded.find((row) => row.name === source.name);
        if (existing) {
          if (existing.hash !== source.hash)
            throw new Error(
              "Previously applied SQL migration changed: " + source.name,
            );
          continue;
        }
        const fixture = fixtureHistory.find((row) => row.name === source.name);
        if (fixture) {
          if (!source.acceptedHashes.has(fixture.sha256))
            throw new Error(
              "Adopted SQL migration checksum differs: " + source.name,
            );
          adopted.push(source.name);
        } else {
          if (source === sources[0] && migrationState.populated)
            throw new Error(
              "Existing tables have no completed migration history; refusing to recreate or adopt an unknown schema",
            );
          await tx.unsafe(source.text);
          applied.push(source.name);
        }
        await tx`INSERT INTO "__drizzle_migrations" (name, hash, created_at) VALUES (${source.name}, ${source.hash}, ${Date.now()})`;
      }
      await verifyDeployedSchema(tx);
      return { applied, adopted, total: sources.length, schemaVerified: true };
    });
  } finally {
    await client.close();
  }
}

async function verifyDeployedSchema(tx: SqlConnection) {
  // Check constraints after both adoption and fresh creation. A matching log
  // cannot excuse missing tables/columns or altered foreign-key actions.
  const columns =
    await tx`SELECT table_name, column_name, data_type, is_nullable, datetime_precision, column_default FROM information_schema.columns WHERE table_schema = current_schema() AND table_name IN ('User','Deck','Game','PlayerOnGames')`;
  const expected = {
    User: {
      id: "integer",
      ghToken: "text",
      createdAt: "timestamp without time zone",
      chessboardColor: "text",
      name: "text",
    },
    Deck: {
      id: "integer",
      name: "text",
      code: "text",
      requiredVersion: "integer",
      ownerUserId: "integer",
      createdAt: "timestamp without time zone",
      updatedAt: "timestamp without time zone",
    },
    Game: {
      id: "integer",
      coreVersion: "text",
      gameVersion: "text",
      data: "jsonb",
      winnerId: "integer",
      createdAt: "timestamp without time zone",
    },
    PlayerOnGames: {
      playerId: "integer",
      gameId: "integer",
      who: "integer",
    },
  };
  const nullable = new Set([
    "User.ghToken",
    "User.chessboardColor",
    "User.name",
    "Game.winnerId",
  ]);
  for (const [table, fields] of Object.entries(expected))
    for (const [name, type] of Object.entries(fields)) {
      const column = columns.find(
        (row) => row.table_name === table && row.column_name === name,
      );
      if (
        !column ||
        column.data_type !== type ||
        column.is_nullable !==
          (nullable.has(table + "." + name) ? "YES" : "NO") ||
        (type.startsWith("timestamp") && column.datetime_precision !== 3)
      )
        throw new Error(
          "Existing database column differs from the deployed SQL schema: " +
            table +
            "." +
            name,
        );
      const isSerial = name === "id" && (table === "Game" || table === "Deck");
      if (
        name === "createdAt"
          ? column.column_default !== "CURRENT_TIMESTAMP"
          : isSerial
            ? !/^nextval\(/.test(column.column_default ?? "")
            : column.column_default !== null
      )
        throw new Error(
          "Existing column default differs from deployed SQL: " +
            table +
            "." +
            name,
        );
    }
  const constraints =
    await tx`SELECT conname, contype, confupdtype, confdeltype, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = current_schema()::regnamespace`;
  for (const [name, definition] of [
    [
      "PlayerOnGames_playerId_fkey",
      'FOREIGN KEY ("playerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    ],
    [
      "PlayerOnGames_gameId_fkey",
      'FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    ],
    [
      "Deck_ownerUserId_fkey",
      'FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    ],
  ]) {
    const constraint = constraints.find((row) => row.conname === name);
    if (
      !constraint ||
      constraint.contype !== "f" ||
      constraint.confupdtype !== "c" ||
      constraint.confdeltype !== "r" ||
      constraint.definition !== definition
    )
      throw new Error(
        "Existing foreign key differs from deployed SQL: " + name,
      );
  }
  for (const [name, definition] of [
    ["User_pkey", "PRIMARY KEY (id)"],
    ["Game_pkey", "PRIMARY KEY (id)"],
    ["Deck_pkey", "PRIMARY KEY (id)"],
    ["PlayerOnGames_pkey", 'PRIMARY KEY ("playerId", "gameId")'],
  ]) {
    if (
      !constraints.some(
        (row) => row.conname === name && row.definition === definition,
      )
    )
      throw new Error(
        "Existing primary key differs from deployed SQL: " + name,
      );
  }
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await migrateDatabase()));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Database migration failed",
    );
    process.exitCode = 1;
  }
}
