import {
  pgTable,
  integer,
  serial,
  text,
  timestamp,
  jsonb,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";

// Preserve Prisma's physical names, timestamp precision and referential actions.
const createdAt = () =>
  timestamp("createdAt", { precision: 3 }).notNull().defaultNow();
export const users = pgTable("User", {
  id: integer().primaryKey(),
  name: text(),
  chessboardColor: text(),
  ghToken: text(),
  createdAt: createdAt(),
});
export const games = pgTable("Game", {
  id: serial().primaryKey(),
  coreVersion: text().notNull(),
  gameVersion: text().notNull(),
  data: jsonb().notNull(),
  winnerId: integer(),
  createdAt: createdAt(),
});
export const playersOnGames = pgTable(
  "PlayerOnGames",
  {
    playerId: integer().notNull(),
    gameId: integer().notNull(),
    who: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.gameId] }),
    foreignKey({
      name: "PlayerOnGames_playerId_fkey",
      columns: [table.playerId],
      foreignColumns: [users.id],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      name: "PlayerOnGames_gameId_fkey",
      columns: [table.gameId],
      foreignColumns: [games.id],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
export const decks = pgTable(
  "Deck",
  {
    id: serial().primaryKey(),
    name: text().notNull(),
    code: text().notNull(),
    requiredVersion: integer().notNull(),
    ownerUserId: integer().notNull(),
    createdAt: createdAt(),
    // Application-side default/update, matching Prisma @updatedAt (no DB default).
    updatedAt: timestamp("updatedAt", { precision: 3 })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: "Deck_ownerUserId_fkey",
      columns: [table.ownerUserId],
      foreignColumns: [users.id],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
export type Deck = typeof decks.$inferSelect;
export type Game = typeof games.$inferSelect;
export type PlayerOnGames = typeof playersOnGames.$inferSelect;
