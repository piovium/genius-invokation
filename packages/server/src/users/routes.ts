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
import { notFound } from "../errors";
import { idSchema, nameSchema } from "../http";
import type { Users } from "./users";

export interface UpdateUserInfoDto {
  chessboardColor?: string | null;
  name?: string | null;
}

export const createUsersRoutes = (users: Users, auth: Auth) =>
  new Elysia({ prefix: "/users" })
    .use(identity(auth))
    .get(
      "/me",
      async ({ identity }) => {
        // An explicit JSON null marks "no account"; an empty body would not parse.
        if (identity?.user !== 1) return Response.json(null);
        const user = await users.findById(identity.sub);
        if (!user) throw notFound();
        return user;
      },
      { identity: true },
    )
    .patch("/me", ({ user, body }) => users.updateUserInfo(user.sub, body), {
      user: true,
      body: t.Object({
        name: t.Optional(t.Union([nameSchema, t.Null()])),
        chessboardColor: t.Optional(
          t.Union([t.String({ pattern: "^#[0-9a-fA-F]{6}$" }), t.Null()]),
        ),
      }),
    })
    .get(
      "/:id",
      async ({ params }) => {
        const user = await users.findById(params.id);
        if (!user) throw notFound();
        return user;
      },
      { user: true, params: t.Object({ id: idSchema }) },
    );
