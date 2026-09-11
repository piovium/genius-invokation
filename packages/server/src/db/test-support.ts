import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

/** The drizzle directory shipped beside this package, applied by the database tests. */
export const migrationsDirectory = resolve(
  import.meta.dirname,
  "../../drizzle",
);

/** Scratch schema for one run; it is spliced into DDL, so keep it a bare identifier. */
export function scratchSchema(prefix: string) {
  const name = `${prefix}_${randomBytes(8).toString("hex")}`;
  if (!/^\w+$/.test(name)) throw new Error("Unexpected database test schema");
  return name;
}
