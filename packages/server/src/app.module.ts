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

import { Elysia, status } from "elysia";
import { node } from "@elysiajs/node";
import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";
import { createAppRoutes } from "./app.controller";
import { DatabaseService } from "./db/database.service";
import { UsersService } from "./users/users.service";
import { DecksService } from "./decks/decks.service";
import { GamesService } from "./games/games.service";
import { MetricsService } from "./metrics/metrics.service";
import { RoomsService } from "./rooms/rooms.service";
import { AuthService } from "./auth/auth.service";
import { createAuthRoutes } from "./auth/auth.controller";
import { createUsersRoutes } from "./users/users.controller";
import { createDecksRoutes } from "./decks/decks.controller";
import { createGamesRoutes } from "./games/games.controller";
import { createMetricsRoutes } from "./metrics/metrics.controller";
import { createRoomsRoutes } from "./rooms/rooms.module";
import { createFrontendHandler } from "./frontend";
import { errorResponse } from "./errors";
import { listenHttp, type HttpListenOptions } from "./http-server";
import { attachRoomWebSocketServer } from "./room-transport/websocket";

export function createApplication({
  database = new DatabaseService(),
  secret = process.env.JWT_SECRET,
  basePath = WEB_CLIENT_BASE_PATH,
  production = process.env.NODE_ENV === "production",
  frontendDirectory = process.env.FRONTEND_DIRECTORY,
} = {}) {
  const metrics = new MetricsService();
  const users = new UsersService(database);
  const decks = new DecksService(database);
  const games = new GamesService(database, metrics);
  const auth = new AuthService(users, secret);
  const rooms = new RoomsService(users, decks, games, metrics);
  const prefix =
    ("/" + basePath.split("/").filter(Boolean).join("/")).replace(/\/$/, "") +
    "/api";
  const app = new Elysia({
    adapter: node(),
    strictPath: false,
  }).onError(({ code, error, set }) => {
    if (code === "VALIDATION" || code === "PARSE")
      return status(400, { statusCode: 400, message: "Invalid request" });
    if (code === "NOT_FOUND")
      return status(404, { statusCode: 404, message: "Not Found" });
    return errorResponse(error);
  });
  if (!production) {
    app.onRequest(({ request, set }) => {
      set.headers["access-control-allow-origin"] = "*";
      set.headers["access-control-allow-methods"] =
        "HEAD,GET,POST,PUT,PATCH,DELETE,OPTIONS";
      set.headers["access-control-allow-headers"] =
        request.headers.get("access-control-request-headers") ??
        "authorization,content-type";
      if (request.method === "OPTIONS") {
        set.status = 204;
        return new Response(null, { status: 204 });
      }
    });
  }
  app
    .use(createMetricsRoutes(metrics))
    .group(prefix, (api) =>
      api
        .use(createAppRoutes())
        .use(createAuthRoutes(auth))
        .use(createUsersRoutes(users, auth))
        .use(createDecksRoutes(decks, auth))
        .use(createGamesRoutes(games, auth))
        .use(createRoomsRoutes(rooms, auth)),
    );
  if (production) {
    const serveFrontend = createFrontendHandler({
      directory: frontendDirectory,
      basePath,
    });
    app.get("/*", ({ request }) => serveFrontend(request));
  }
  return { app, database, users, decks, games, auth, rooms, metrics, prefix };
}

export async function listenApplication(
  service: ReturnType<typeof createApplication>,
  options?: HttpListenOptions,
) {
  service.app.compile();
  const http = await listenHttp(
    (request) => service.app.fetch(request),
    options,
  );
  const transport = attachRoomWebSocketServer(
    http.server,
    service.rooms,
    service.auth,
    service.prefix,
  );
  return {
    ...http,
    async stop() {
      await transport.close();
      await http.stop();
    },
  };
}
