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
import { type } from "arktype";
import { sValidator } from "@hono/standard-validator";
import { gamesService } from "../services";
import { User, type AuthEnv } from "../auth/user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { PaginationDto, IntParam } from "../utils";

export const GamesController = new Hono<AuthEnv>()
  .use(AuthGuard())
  .get("/", sValidator("query", PaginationDto), async (c) =>
    c.json(await gamesService.getAllGames(c.req.valid("query"))),
  )
  .get("/mine", sValidator("query", PaginationDto), async (c) =>
    c.json(await gamesService.gamesHasUser(User(c)!, c.req.valid("query"))),
  )
  .get("/:gameId", sValidator("param", type({ gameId: IntParam })), async (c) =>
    c.json(await gamesService.getGame(c.req.valid("param").gameId)),
  );
