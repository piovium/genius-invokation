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
import type { DatabaseService } from "../db/database.service";
import {
  games,
  playerOnGames,
  type GameModel,
  type PlayerOnGames,
} from "../db/schema";
import type { PaginationDto, PaginationResult } from "../utils";
import type { MetricsService } from "../metrics/metrics.service";

export interface AddGameOption {
  playerIds: number[];
  coreVersion: string;
  gameVersion: string;
  data: string;
  winnerId: number | null;
}
interface GameNoData extends Omit<GameModel, "data"> {}
const summaryColumns = {
  id: games.id,
  coreVersion: games.coreVersion,
  gameVersion: games.gameVersion,
  winnerId: games.winnerId,
  createdAt: games.createdAt,
};
export class GamesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly metrics: MetricsService,
  ) {}
  async addGame({ playerIds, ...data }: AddGameOption): Promise<GameModel> {
    const game = await this.database.db.transaction(async (tx) => {
      const [game] = await tx.insert(games).values(data).returning();
      if (playerIds.length)
        await tx
          .insert(playerOnGames)
          .values(
            playerIds.map((playerId, who) => ({
              playerId,
              gameId: game!.id,
              who,
            })),
          );
      return game!;
    });
    this.metrics.incrementStoredGames();
    return game;
  }
  async getAllGames({
    skip = 0,
    take = 10,
  }: PaginationDto): Promise<PaginationResult<GameNoData>> {
    return this.database.db.transaction(
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
              .map((link) => ({
                player: { id: link.playerId },
                who: link.who,
              })),
          })),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  }
  async getGame(gameId: number) {
    const [game] = await this.database.db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (!game) return null;
    const links = await this.database.db
      .select()
      .from(playerOnGames)
      .where(eq(playerOnGames.gameId, gameId))
      .orderBy(playerOnGames.who);
    return {
      ...game,
      players: links.map((link) => ({
        player: { id: link.playerId },
        who: link.who,
      })),
    };
  }
  async gamesHasUser(
    userId: number,
    { skip = 0, take = 10 }: PaginationDto,
  ): Promise<PaginationResult<PlayerOnGames & { game: GameNoData }>> {
    return this.database.db.transaction(
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
  }
}
