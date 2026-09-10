// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { count, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../db/database";
import {
  games,
  playerOnGames,
  type GameModel,
  type PlayerOnGames,
} from "../db/schema";
import type { Metrics } from "../metrics/metrics";
import type { PaginationDto, PaginationResult } from "../utils";

export interface AddGameOption {
  playerIds: number[];
  coreVersion: string;
  gameVersion: string;
  data: string;
  winnerId: number | null;
}

/** A stored game without its replay payload, as the summary queries report it. */
export interface GameSummary extends Omit<GameModel, "data"> {}

/** One seat of a game, reported as the bare player id the client knows. */
export interface GamePlayer {
  player: { id: number };
  who: number;
}

/** A stored game, replay included. */
export interface GameDetails extends GameModel {
  players: GamePlayer[];
}

export interface Games {
  addGame(option: AddGameOption): Promise<GameModel>;
  getAllGames(query: PaginationDto): Promise<PaginationResult<GameSummary>>;
  getGame(gameId: number): Promise<GameDetails | null>;
  gamesHasUser(
    userId: number,
    query: PaginationDto,
  ): Promise<PaginationResult<PlayerOnGames & { game: GameSummary }>>;
}

const summaryColumns = {
  id: games.id,
  coreVersion: games.coreVersion,
  gameVersion: games.gameVersion,
  winnerId: games.winnerId,
  createdAt: games.createdAt,
};

const toGamePlayer = ({ playerId, who }: PlayerOnGames): GamePlayer => ({
  player: { id: playerId },
  who,
});

export function createGames(database: Database, metrics: Metrics): Games {
  return {
    async addGame({ playerIds, ...data }) {
      const game = await database.db.transaction(async (tx) => {
        const [game] = await tx.insert(games).values(data).returning();
        if (playerIds.length)
          await tx.insert(playerOnGames).values(
            playerIds.map((playerId, who) => ({
              playerId,
              gameId: game!.id,
              who,
            })),
          );
        return game!;
      });
      metrics.incrementStoredGames();
      return game;
    },

    async getAllGames({ skip = 0, take = 10 }) {
      return database.db.transaction(
        async (tx) => {
          const rows = await tx
            .select(summaryColumns)
            .from(games)
            .orderBy(desc(games.createdAt), desc(games.id))
            .offset(skip)
            .limit(take);
          const [total] = await tx.select({ value: count() }).from(games);
          const links = rows.length
            ? await tx
                .select()
                .from(playerOnGames)
                .where(
                  inArray(
                    playerOnGames.gameId,
                    rows.map((row) => row.id),
                  ),
                )
            : [];
          return {
            count: total!.value,
            data: rows.map((row) => ({
              ...row,
              players: links
                .filter((link) => link.gameId === row.id)
                .sort((a, b) => a.who - b.who)
                .map(toGamePlayer),
            })),
          };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    },

    async getGame(gameId) {
      const [game] = await database.db
        .select()
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1);
      if (!game) return null;
      const links = await database.db
        .select()
        .from(playerOnGames)
        .where(eq(playerOnGames.gameId, gameId))
        .orderBy(playerOnGames.who);
      return { ...game, players: links.map(toGamePlayer) };
    },

    async gamesHasUser(userId, { skip = 0, take = 10 }) {
      return database.db.transaction(
        async (tx) => {
          const rows = await tx
            .select({
              playerId: playerOnGames.playerId,
              gameId: playerOnGames.gameId,
              who: playerOnGames.who,
              game: summaryColumns,
            })
            .from(playerOnGames)
            .innerJoin(games, eq(playerOnGames.gameId, games.id))
            .where(eq(playerOnGames.playerId, userId))
            .orderBy(desc(games.createdAt), desc(games.id))
            .offset(skip)
            .limit(take);
          const [total] = await tx
            .select({ value: count() })
            .from(playerOnGames)
            .where(eq(playerOnGames.playerId, userId));
          return { count: total!.value, data: rows };
        },
        { isolationLevel: "repeatable read", accessMode: "read only" },
      );
    },
  };
}
