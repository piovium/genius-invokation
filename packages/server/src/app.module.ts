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

import { Hono } from "hono";
import { cors } from "hono/cors";
import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { GamesModule } from "./games/games.module";
import { DecksModule } from "./decks/decks.module";
import { RoomsModule } from "./rooms/rooms.module";
import { MetricsModule } from "./metrics/metrics.module";
import { DatabaseExceptionFilter } from "./db/db.module";

const api = new Hono()
  .route("/", AppController)
  .route("/auth", AuthModule)
  .route("/users", UsersModule)
  .route("/games", GamesModule)
  .route("/decks", DecksModule)
  .route("/rooms", RoomsModule)
  .all("*", (c) => c.notFound());

export const AppModule = new Hono();
if (process.env.NODE_ENV !== "production") {
  AppModule.use(
    cors({
      origin: "*",
      allowMethods: ["HEAD", "GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
}
AppModule.use(DatabaseExceptionFilter)
  .route(`${WEB_CLIENT_BASE_PATH}api`, api)
  .route("/", MetricsModule);
