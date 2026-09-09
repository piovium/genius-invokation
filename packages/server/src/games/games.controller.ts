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
import type { AuthService } from "../auth/auth.service";
import { requireUser } from "../auth/auth.guard";
import { idSchema, paginationSchema } from "../http";
import type { GamesService } from "./games.service";
export function createGamesRoutes(games: GamesService, auth: AuthService) {
  return new Elysia({ prefix: "/games" })
    .get(
      "/",
      ({ request, query }) => {
        requireUser(request, auth);
        return games.getAllGames(query);
      },
      { query: t.Object(paginationSchema) },
    )
    .get(
      "/mine",
      ({ request, query }) =>
        games.gamesHasUser(requireUser(request, auth), query),
      { query: t.Object(paginationSchema) },
    )
    .get(
      "/:gameId",
      async ({ request, params }) => {
        requireUser(request, auth);
        const game = await games.getGame(params.gameId);
        return game ?? Response.json(null);
      },
      { params: t.Object({ gameId: idSchema }) },
    );
}
