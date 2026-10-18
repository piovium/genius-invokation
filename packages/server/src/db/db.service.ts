import { drizzle } from "drizzle-orm/node-postgres";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import pg from "pg";

export class DbService {
  db!: PgAsyncDatabase<PgQueryResultHKT>;
  private close?: () => Promise<void>;

  async onModuleInit() {
    if (process.env.DATABASE_URL) {
      const limit = Number(process.env.DATABASE_CONNECTION_LIMIT);
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number.isInteger(limit) && limit > 0 ? limit : undefined,
      });
      this.db = drizzle({ client: pool });
      this.close = () => pool.end();
    } else if (process.env.NODE_ENV !== "production") {
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle } = await import("drizzle-orm/pglite");
      const client = new PGlite(process.env.PGLITE_DATA_DIR);
      this.db = drizzle({ client });
      this.close = () => client.close();
    } else {
      throw new Error("DATABASE_URL is not set");
    }
    await this.db.execute(sql`select 1`);
  }

  async onModuleDestroy() {
    const close = this.close;
    this.close = undefined;
    await close?.();
  }
}
