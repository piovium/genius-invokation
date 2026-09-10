import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export interface SqlConnection {
  (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResultRow[]>;
  unsafe(text: string, values?: unknown[]): Promise<QueryResultRow[]>;
}

function createQueries(connection: Pool | PoolClient): SqlConnection {
  const unsafe = async (text: string, values?: unknown[]) => {
    const result = await connection.query(text, values);
    // The original migration files contain multiple SQL statements. pg returns
    // one result per statement when the query has no parameters.
    return Array.isArray(result) ? (result.at(-1)?.rows ?? []) : result.rows;
  };
  return Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0]!;
      for (let index = 0; index < values.length; index++)
        text += "$" + (index + 1) + strings[index + 1];
      return unsafe(text, values);
    },
    { unsafe },
  );
}

export function createSql(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL");
  const databaseSchema = url.searchParams.get("schema") ?? "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseSchema))
    throw new Error("Invalid PostgreSQL schema name");
  url.searchParams.delete("schema");
  const connectionLimit = Number(process.env.DATABASE_CONNECTION_LIMIT ?? 2);
  if (!Number.isSafeInteger(connectionLimit) || connectionLimit < 1)
    throw new Error("DATABASE_CONNECTION_LIMIT must be a positive integer");
  const pool = new Pool({
    connectionString: url.toString(),
    max: connectionLimit,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    options: "-c search_path=" + databaseSchema,
  });
  pool.on("error", () => console.error("PostgreSQL idle connection failed"));
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

export class DatabaseService {
  readonly client: ReturnType<typeof createSql>;
  readonly db;
  constructor(connectionString?: string) {
    this.client = createSql(connectionString);
    this.db = drizzle(this.client.pool, { schema });
  }
  async connect() {
    await this.client`SELECT 1`;
  }
  async close() {
    await this.client.close();
  }
}
