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

import { DbService } from "./db/db.module";
import { UsersService } from "./users/users.service";
import { AuthService } from "./auth/auth.service";
import { DecksService } from "./decks/decks.service";
import { GamesService } from "./games/games.service";
import { RoomsService } from "./rooms/rooms.service";
import { MetricsService } from "./metrics/metrics.service";
import { ProfilesService } from "./profiles/profiles.service";
import Redis from "ioredis";

// Temporary singleton service registry.
// The initialization/finalization is manually maintained and written.
export const profilesService = new ProfilesService();
export const dbService = new DbService();
export const usersService = new UsersService();
export const authService = new AuthService();
export const decksService = new DecksService();
export const gamesService = new GamesService();
export const roomsService = new RoomsService();
export const metricsService = new MetricsService();
export const redisService = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

let initialization: Promise<AsyncDisposableStack> | undefined;

export function initializeServices() {
  return (initialization ??= (async () => {
    await using disposeStack = new AsyncDisposableStack();
    disposeStack.defer(async () => {
      await dbService.onModuleDestroy();
    });
    disposeStack.defer(async () => {
      await redisService?.quit();
    });
    await profilesService.onModuleInit();
    await dbService.onModuleInit();
    await roomsService.onModuleInit();
    return disposeStack.move();
  })());
}
