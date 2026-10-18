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
import { NotFoundException } from "../errors";
import { type } from "arktype";
import { sValidator } from "@hono/standard-validator";
import { usersService } from "../services";
import { User, type AuthEnv } from "../auth/user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { IntParam, stringLength } from "../utils";

export const UpdateUserInfoDto = type({
  "chessboardColor?": type(/^#[0-9a-fA-F]{6}$/).or("null"),
  "name?": stringLength(1, 64),
});
export type UpdateUserInfoDto = typeof UpdateUserInfoDto.infer;

export const UsersController = new Hono<AuthEnv>()
  .get("/me", async (c) => {
    const userId = User(c);
    if (userId === null) {
      return c.json(null);
    }
    const user = await usersService.findById(userId);
    if (!user) {
      throw new NotFoundException();
    }
    return c.json(user);
  })
  .use(AuthGuard)
  .patch("/me", sValidator("json", UpdateUserInfoDto), async (c) => {
    await usersService.updateUserInfo(User(c)!, c.req.valid("json"));
    return c.body(null, 200);
  })
  .get("/:id", sValidator("param", type({ id: IntParam })), async (c) => {
    const { id } = c.req.valid("param");
    const user = await usersService.findById(id);
    if (!user) {
      throw new NotFoundException();
    }
    return c.json(user);
  });
