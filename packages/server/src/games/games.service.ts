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

import { Injectable } from "@nestjs/common";
import { count, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { DbService } from "../db/db.service";
import {
  games,
  playersOnGames,
  type Game as GameModel,
  type PlayerOnGames,
} from "../db/schema";
import type { PaginationDto, PaginationResult } from "../utils";
import { MetricsService } from "../metrics/metrics.service";

export interface AddGameOption {
  playerIds: number[];
  coreVersion: string;
  gameVersion: string;
  data: string;
  winnerId: number | null;
}
type GameNoData = Omit<GameModel, "data">;
const { data: logData, ...summaryColumns } = getTableColumns(games);

@Injectable()
export class GamesService {
  constructor(
    private database: DbService,
    private metrics: MetricsService,
  ) {}

  async addGame({ playerIds, ...data }: AddGameOption): Promise<GameModel> {
    const game = await this.database.db.transaction(async (tx) => {
      const [game] = await tx.insert(games).values(data).returning();
      if (playerIds.length) {
        await tx
          .insert(playersOnGames)
          .values(
            playerIds.map((playerId, who) => ({
              playerId,
              who,
              gameId: game!.id,
            })),
          );
      }
      return game!;
    });
    this.metrics.incrementStoredGames();
    return game;
  }

  async getAllGames({
    skip = 0,
    take = 10,
  }: PaginationDto): Promise<PaginationResult<GameNoData>> {
    return this.database.db.transaction(async (tx) => {
      const data = await tx
        .select(summaryColumns)
        .from(games)
        .offset(skip)
        .limit(take)
        .orderBy(desc(games.createdAt));
      const [total] = await tx.select({ count: count() }).from(games);
      const players = data.length
        ? await tx
            .select()
            .from(playersOnGames)
            .where(
              inArray(
                playersOnGames.gameId,
                data.map((g) => g.id),
              ),
            )
        : [];
      return {
        count: total!.count,
        data: data.map((game) => ({
          ...game,
          players: players
            .filter((p) => p.gameId === game.id)
            .map((p) => ({ player: { id: p.playerId }, who: p.who })),
        })),
      };
    });
  }

  async getGame(gameId: number) {
    return this.database.db.transaction(async (tx) => {
      const [game] = await tx
        .select()
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1);
      if (!game) return null;
      const players = await tx
        .select({
          player: { id: playersOnGames.playerId },
          who: playersOnGames.who,
        })
        .from(playersOnGames)
        .where(eq(playersOnGames.gameId, gameId));
      return { ...game, players };
    });
  }

  async gamesHasUser(
    userId: number,
    { skip = 0, take = 10 }: PaginationDto,
  ): Promise<PaginationResult<PlayerOnGames & { game: GameNoData }>> {
    return this.database.db.transaction(async (tx) => {
      const data = await tx
        .select({ ...getTableColumns(playersOnGames), game: summaryColumns })
        .from(playersOnGames)
        .innerJoin(games, eq(games.id, playersOnGames.gameId))
        .where(eq(playersOnGames.playerId, userId))
        .offset(skip)
        .limit(take)
        .orderBy(desc(games.createdAt));
      const [total] = await tx
        .select({ count: count() })
        .from(playersOnGames)
        .where(eq(playersOnGames.playerId, userId));
      return { data, count: total!.count };
    });
  }
}
