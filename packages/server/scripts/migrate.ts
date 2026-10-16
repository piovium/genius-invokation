import "dotenv/config";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const migrationsFolder = path.resolve(import.meta.dirname, "../drizzle");
if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder });
  } finally {
    await pool.end();
  }
} else if (
  process.env.NODE_ENV !== "production" &&
  process.env.PGLITE_DATA_DIR
) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(process.env.PGLITE_DATA_DIR);
  try {
    await migrate(drizzle({ client }), { migrationsFolder });
  } finally {
    await client.close();
  }
} else {
  throw new Error(
    "DATABASE_URL is required (or PGLITE_DATA_DIR for local development)",
  );
}
