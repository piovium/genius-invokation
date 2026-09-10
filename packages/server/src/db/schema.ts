import {
  integer,
  customType,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// node-postgres already parses JSONB. The legacy replay is itself a JSON string;
// Drizzle's generic jsonb mapper would parse that string a second time.
const persistedReplay = customType<{ data: unknown; driverData: unknown }>({
  dataType: () => "jsonb",
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => value,
});

// Match the deployed DDL exactly: quoted table/column names, timestamp
// precision, defaults, relation actions and composite primary key all stay put.
export const users = pgTable("User", {
  id: integer("id").primaryKey(),
  name: text("name"),
  chessboardColor: text("chessboardColor"),
  ghToken: text("ghToken"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .notNull()
    .defaultNow(),
});
export const games = pgTable("Game", {
  id: serial("id").primaryKey(),
  coreVersion: text("coreVersion").notNull(),
  gameVersion: text("gameVersion").notNull(),
  data: persistedReplay("data").notNull(),
  winnerId: integer("winnerId"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .notNull()
    .defaultNow(),
});
export const playerOnGames = pgTable(
  "PlayerOnGames",
  {
    playerId: integer("playerId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    who: integer("who").notNull(),
  },
  (table) => [
    primaryKey({
      name: "PlayerOnGames_pkey",
      columns: [table.playerId, table.gameId],
    }),
  ],
);
export const decks = pgTable("Deck", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  requiredVersion: integer("requiredVersion").notNull(),
  ownerUserId: integer("ownerUserId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" }).notNull(),
});
export type UserModel = typeof users.$inferSelect;
export type DeckModel = typeof decks.$inferSelect;
export type GameModel = typeof games.$inferSelect;
export type PlayerOnGames = typeof playerOnGames.$inferSelect;
