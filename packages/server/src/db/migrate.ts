import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createSql, type SqlConnection } from "./database";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Shipped migrations are `<timestamp>_<name>` folders, e.g. `20251013090510_init`. */
const MIGRATION_FOLDER = /^\d{14}_[A-Za-z0-9_]+$/;

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
      /* The packaged and source layouts differ; try the next candidate. */
    }
  }
  throw new Error(
    "Migration SQL is missing from this server build; set MIGRATIONS_DIRECTORY or ship the migrations/ directory",
  );
}

/**
 * Apply the SQL migrations that ship with this server. A database whose schema
 * was already created from those same files and recorded by other bookkeeping
 * (the isolated test fixture) is adopted once its recorded checksums match.
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
  if (!names.length || names.some((name) => !MIGRATION_FOLDER.test(name)))
    throw new Error(
      `Migrations in ${directory} must be folders named like 20251013090510_init`,
    );
  const knownNames = new Set(names);
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
        hash: sha256(normalized),
        acceptedHashes: new Set([
          sha256(text),
          sha256(normalized),
          sha256(normalized.replaceAll("\n", "\r\n")),
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
      if (fixtureHistory.some((row) => !knownNames.has(row.name)))
        throw new Error("Database has migrations unknown to this server build");
      const fixtureHashes = new Map(
        fixtureHistory.map((row) => [row.name, row.sha256] as const),
      );
      await tx.unsafe(
        'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" ("id" SERIAL PRIMARY KEY, "hash" TEXT NOT NULL, "created_at" BIGINT NOT NULL, "name" TEXT NOT NULL UNIQUE)',
      );
      const recorded = await tx.unsafe(
        'SELECT name, hash FROM "__drizzle_migrations"',
      );
      if (recorded.some((row) => !knownNames.has(row.name)))
        throw new Error("Database has migrations newer than this server build");
      const appliedHashes = new Map(
        recorded.map((row) => [row.name, row.hash] as const),
      );
      const applied: string[] = [];
      const adopted: string[] = [];
      for (const [index, source] of sources.entries()) {
        const appliedHash = appliedHashes.get(source.name);
        if (appliedHash !== undefined) {
          if (appliedHash !== source.hash)
            throw new Error(
              `Previously applied SQL migration changed: ${source.name}`,
            );
          continue;
        }
        const fixtureHash = fixtureHashes.get(source.name);
        if (fixtureHash !== undefined) {
          if (!source.acceptedHashes.has(fixtureHash))
            throw new Error(
              `Adopted SQL migration checksum differs: ${source.name}`,
            );
          adopted.push(source.name);
        } else {
          if (index === 0 && migrationState.populated)
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

/** `information_schema` spells a millisecond timestamp like this. */
const TIMESTAMP = "timestamp without time zone";

type ColumnExpectation = readonly [type: string, nullable: boolean];

/** Every column the deployed DDL creates, in the order the migrations add them. */
const expectedColumns: Record<string, Record<string, ColumnExpectation>> = {
  User: {
    id: ["integer", false],
    ghToken: ["text", true],
    createdAt: [TIMESTAMP, false],
    chessboardColor: ["text", true],
    name: ["text", true],
  },
  Deck: {
    id: ["integer", false],
    name: ["text", false],
    code: ["text", false],
    requiredVersion: ["integer", false],
    ownerUserId: ["integer", false],
    createdAt: [TIMESTAMP, false],
    updatedAt: [TIMESTAMP, false],
  },
  Game: {
    id: ["integer", false],
    coreVersion: ["text", false],
    gameVersion: ["text", false],
    data: ["jsonb", false],
    winnerId: ["integer", true],
    createdAt: [TIMESTAMP, false],
  },
  PlayerOnGames: {
    playerId: ["integer", false],
    gameId: ["integer", false],
    who: ["integer", false],
  },
};

type DefaultKind = "now" | "sequence" | "none";

/** The deployed DDL defaults only `createdAt` and the `serial` id columns. */
function defaultKind(table: string, name: string): DefaultKind {
  if (name === "createdAt") return "now";
  if (name === "id" && (table === "Game" || table === "Deck"))
    return "sequence";
  return "none";
}

const matchesDefault: Record<DefaultKind, (value: string | null) => boolean> = {
  now: (value) => value === "CURRENT_TIMESTAMP",
  sequence: (value) => value?.startsWith("nextval(") ?? false,
  none: (value) => value === null,
};

/** Referential actions as the one-letter codes `pg_constraint` stores. */
const FOREIGN_KEY_CODES = { contype: "f", confupdtype: "c", confdeltype: "r" };

/** Deployed constraint: name, kind, `pg_get_constraintdef` text, action codes. */
const expectedConstraints: readonly [
  name: string,
  kind: string,
  definition: string,
  codes?: Record<string, string>,
][] = [
  [
    "PlayerOnGames_playerId_fkey",
    "foreign key",
    'FOREIGN KEY ("playerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    FOREIGN_KEY_CODES,
  ],
  [
    "PlayerOnGames_gameId_fkey",
    "foreign key",
    'FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    FOREIGN_KEY_CODES,
  ],
  [
    "Deck_ownerUserId_fkey",
    "foreign key",
    'FOREIGN KEY ("ownerUserId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT',
    FOREIGN_KEY_CODES,
  ],
  ["User_pkey", "primary key", "PRIMARY KEY (id)"],
  ["Game_pkey", "primary key", "PRIMARY KEY (id)"],
  ["Deck_pkey", "primary key", "PRIMARY KEY (id)"],
  ["PlayerOnGames_pkey", "primary key", 'PRIMARY KEY ("playerId", "gameId")'],
];

/**
 * Compare the live schema with the deployed DDL after both adoption and fresh
 * creation: a matching migration log cannot excuse a column, default, primary
 * key or foreign key that drifted from the SQL.
 */
async function verifyDeployedSchema(tx: SqlConnection) {
  const columns =
    await tx`SELECT table_name, column_name, data_type, is_nullable, datetime_precision, column_default FROM information_schema.columns WHERE table_schema = current_schema() AND table_name IN ('User','Deck','Game','PlayerOnGames')`;
  const columnByName = new Map(
    columns.map((column) => [
      `${column.table_name}.${column.column_name}`,
      column,
    ]),
  );
  for (const [table, expectations] of Object.entries(expectedColumns))
    for (const [name, [type, nullable]] of Object.entries(expectations)) {
      const column = columnByName.get(`${table}.${name}`);
      if (
        !column ||
        column.data_type !== type ||
        column.is_nullable !== (nullable ? "YES" : "NO") ||
        (type === TIMESTAMP && column.datetime_precision !== 3)
      )
        throw new Error(
          `Existing database column differs from the deployed SQL schema: ${table}.${name}`,
        );
      if (!matchesDefault[defaultKind(table, name)](column.column_default))
        throw new Error(
          `Existing column default differs from deployed SQL: ${table}.${name}`,
        );
    }
  const constraints =
    await tx`SELECT conname, contype, confupdtype, confdeltype, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = current_schema()::regnamespace`;
  const constraintByName = new Map(
    constraints.map((constraint) => [constraint.conname, constraint]),
  );
  for (const [name, kind, definition, codes] of expectedConstraints) {
    const constraint = constraintByName.get(name);
    const actionsMatch =
      codes === undefined ||
      Object.entries(codes).every(
        ([field, code]) => constraint?.[field] === code,
      );
    if (constraint?.definition !== definition || !actionsMatch)
      throw new Error(`Existing ${kind} differs from deployed SQL: ${name}`);
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
