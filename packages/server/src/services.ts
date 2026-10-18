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

import console from "node:console";
import { DbService } from "./db/db.module";
import { UsersService } from "./users/users.service";
import { AuthService } from "./auth/auth.service";
import { DecksService } from "./decks/decks.service";
import { GamesService } from "./games/games.service";
import { RoomsService } from "./rooms/rooms.service";
import { MetricsService } from "./metrics/metrics.service";
import { redis } from "./redis";

// Temporary singleton service registry.
// The initialization/finalization is manually maintained and written.
export const dbService = new DbService();
export const usersService = new UsersService();
export const authService = new AuthService();
export const decksService = new DecksService();
export const gamesService = new GamesService();
export const roomsService = new RoomsService();
export const metricsService = new MetricsService();

let initialization: Promise<void> | undefined;
let shutdown: Promise<void> | undefined;

export function initializeServices() {
  return (initialization ??= (async () => {
    try {
      await dbService.onModuleInit();
      roomsService.onModuleInit();
    } catch (error) {
      await shutdownServices().catch(console.error);
      throw error;
    }
  })());
}

export function shutdownServices() {
  return (shutdown ??= (async () => {
    const results = await Promise.allSettled([
      dbService.onModuleDestroy(),
      redis?.quit(),
    ]);
    const errors = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (errors.length) {
      throw new AggregateError(errors, "Failed to close services");
    }
  })());
}
