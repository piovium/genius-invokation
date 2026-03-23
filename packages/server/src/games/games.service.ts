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
import { PrismaService } from "../db/prisma.service";
import type { Game as GameModel, PlayerOnGames } from "#prisma/client";
import type { PaginationDto, PaginationResult } from "../utils";
import { MetricsService } from "../metrics/metrics.service";

export interface AddGameOption {
  playerIds: number[];
  coreVersion: string;
  gameVersion: string;
  data: string;
  winnerId: number | null;
}

interface GameNoData extends Omit<GameModel, "data"> {}

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  async addGame({ playerIds, ...data }: AddGameOption): Promise<GameModel> {
    const playerOnGames = playerIds.map((id, who) => ({
      playerId: id,
      who,
    }));
    const game = await this.prisma.game.create({
      data: {
        ...data,
        players: {
          create: playerOnGames,
        },
      },
    });
    this.metrics.incrementStoredGames();
    return game;
  }

  async getAllGames({
    skip = 0,
    take = 10,
  }: PaginationDto): Promise<PaginationResult<GameNoData>> {
    const [data, count] = await this.prisma.game.findManyAndCount({
      skip,
      take,
      omit: { data: true },
      include: {
        players: {
          select: {
            player: {
              select: {
                id: true,
              },
            },
            who: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { count, data };
  }

  async getGame(gameId: number) {
    return await this.prisma.game.findFirst({
      where: {
        id: gameId,
      },
      include: {
        players: {
          select: {
            player: {
              select: {
                id: true,
              },
            },
            who: true,
          },
        },
      },
    });
  }

  async gamesHasUser(
    userId: number,
    { skip = 0, take = 10 }: PaginationDto,
  ): Promise<PaginationResult<PlayerOnGames & { game: GameNoData }>> {
    const [data, count] = await this.prisma.playerOnGames.findManyAndCount({
      skip,
      take,
      where: {
        playerId: userId,
      },
      include: {
        game: {
          omit: {
            data: true,
          },
        },
      },
      orderBy: {
        game: {
          createdAt: "desc",
        },
      },
    });
    return { data, count };
  }
}
