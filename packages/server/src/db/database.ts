import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export interface SqlConnection {
  (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResultRow[]>;
  unsafe(text: string, values?: unknown[]): Promise<QueryResultRow[]>;
}

/**
 * Wrap one pool or pooled client as a tagged template that binds interpolated
 * values as `$1`, `$2`, ... and that also exposes `unsafe()` for the SQL no
 * template can build.
 */
function createQueries(connection: Pool | PoolClient): SqlConnection {
  const unsafe = async (text: string, values?: unknown[]) => {
    const result = await connection.query(text, values);
    // A migration file holds several statements, and a parameterless query
    // answers with one result per statement: report the rows of the last one.
    return Array.isArray(result) ? (result.at(-1)?.rows ?? []) : result.rows;
  };
  return Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) =>
      unsafe(
        strings
          .map((part, index) => (index === 0 ? part : `$${index}${part}`))
          .join(""),
        values,
      ),
    { unsafe },
  );
}

/** Open a pg pool bound to the schema named in the connection string. */
export function createSql(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error(
      `DATABASE_URL must use postgres:// or postgresql://, not ${url.protocol}//`,
    );
  const databaseSchema = url.searchParams.get("schema") ?? "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseSchema))
    throw new Error(
      `The "schema" query parameter must be a bare PostgreSQL identifier, got "${databaseSchema}"`,
    );
  url.searchParams.delete("schema");
  const connectionLimit = Number(process.env.DATABASE_CONNECTION_LIMIT ?? 2);
  if (!Number.isSafeInteger(connectionLimit) || connectionLimit < 1)
    throw new Error(
      `DATABASE_CONNECTION_LIMIT must be a positive integer, got "${process.env.DATABASE_CONNECTION_LIMIT}"`,
    );
  const pool = new Pool({
    connectionString: url.toString(),
    max: connectionLimit,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    options: `-c search_path=${databaseSchema}`,
  });
  pool.on("error", () =>
    console.error(
      "PostgreSQL idle connection failed; the pool discards it and reconnects on demand",
    ),
  );
  return Object.assign(createQueries(pool), {
    pool,
    close: () => pool.end(),
    async begin<T>(callback: (tx: SqlConnection) => Promise<T>) {
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        const result = await callback(createQueries(connection));
        await connection.query("COMMIT");
        return result;
      } catch (error) {
        await connection.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },
  });
}

/** One pool's SQL tag and Drizzle query builder, with their lifecycle. */
export interface Database {
  readonly sql: ReturnType<typeof createSql>;
  readonly db: NodePgDatabase<typeof schema>;
  connect(): Promise<void>;
  close(): Promise<void>;
}

/** Build the database handle for a connection string. */
export function createDatabase(connectionString?: string): Database {
  const sql = createSql(connectionString);
  return {
    sql,
    db: drizzle(sql.pool, { schema }),
    async connect() {
      await sql`SELECT 1`;
    },
    async close() {
      await sql.close();
    },
  };
}
