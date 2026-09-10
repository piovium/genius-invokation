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
import { requireUser, requestIdentity } from "../auth/auth.guard";
import { isUserJwtPayload } from "../auth/user.decorator";
import { notFound } from "../errors";
import { idSchema, nameSchema } from "../http";
import type { UsersService } from "./users.service";
export interface UpdateUserInfoDto {
  chessboardColor?: string | null;
  name?: string | null;
}
export function createUsersRoutes(users: UsersService, auth: AuthService) {
  return new Elysia({ prefix: "/users" })
    .get("/me", async ({ request }) => {
      const identity = requestIdentity(request, auth);
      if (!isUserJwtPayload(identity)) return Response.json(null);
      const user = await users.findById(identity.sub);
      if (!user) throw notFound();
      return user;
    })
    .patch(
      "/me",
      ({ request, body }) =>
        users.updateUserInfo(requireUser(request, auth), body),
      {
        body: t.Object({
          name: t.Optional(t.Union([nameSchema, t.Null()])),
          chessboardColor: t.Optional(
            t.Union([t.String({ pattern: "^#[0-9a-fA-F]{6}$" }), t.Null()]),
          ),
        }),
      },
    )
    .get(
      "/:id",
      async ({ request, params }) => {
        requireUser(request, auth);
        const user = await users.findById(params.id);
        if (!user) throw notFound();
        return user;
      },
      { params: t.Object({ id: idSchema }) },
    );
}
