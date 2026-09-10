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

import { Elysia, t } from "elysia";
import { identity } from "../auth/identity";
import type { Auth } from "../auth/session";
import { idSchema, paginationSchema } from "../http";
import type { Games } from "./games";

export function createGamesRoutes(games: Games, auth: Auth) {
  return new Elysia({ prefix: "/games" })
    .use(identity(auth))
    .get("/", ({ query }) => games.getAllGames(query), {
      query: t.Object(paginationSchema),
      user: true,
    })
    .get("/mine", ({ user, query }) => games.gamesHasUser(user.sub, query), {
      query: t.Object(paginationSchema),
      user: true,
    })
    .get(
      "/:gameId",
      async ({ params }) =>
        (await games.getGame(params.gameId)) ?? Response.json(null),
      { params: t.Object({ gameId: idSchema }), user: true },
    );
}
