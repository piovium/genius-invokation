import { expect, test } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { resolve } from "node:path";
import { games } from "./schema";
import { officialProfile } from "../profiles/compiler";

test("migrations allow legacy rows and persist complete Profile JSON", async () => {
  const client = new PGlite();
  try {
    const db = drizzle({ client });
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dirname, "../../drizzle"),
    });
    const profile = officialProfile("v3.3.0").profile;
    await db.insert(games).values([
      { coreVersion: "test", gameVersion: "v3.3.0", data: {} },
      {
        coreVersion: "test",
        gameVersion: profile.id,
        profile,
        data: { gv: profile.id, profile },
      },
    ]);
    const rows = await db.select().from(games).orderBy(games.id);
    expect(rows[0]!.profile).toBeNull();
    expect(rows[0]!.gameVersion).toBe("v3.3.0");
    expect(rows[1]!.profile).toEqual(profile);
    expect(rows[1]!.data).toEqual({ gv: profile.id, profile });
    await migrate(db, {
      migrationsFolder: resolve(import.meta.dirname, "../../drizzle"),
    });
  } finally {
    await client.close();
  }
}, 15000);
