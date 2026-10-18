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

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { isUserJwtPayload, type AuthEnv } from "./user.decorator";

export function AuthGuard(isPublic = false) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const [scheme, token] = c.req.header("Authorization")?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      if (!isPublic) {
        throw new HTTPException(401);
      }
      return next();
    }
    // Only catch verification errors; downstream errors must remain errors.
    try {
      await jwt({
        secret: process.env.JWT_SECRET!,
        alg: "HS256",
        verification: { iat: false },
      })(c, async () => {});
    } catch (error) {
      if (!isPublic) {
        throw error;
      }
      return next();
    }
    if (!isPublic && !isUserJwtPayload(c.get("jwtPayload"))) {
      throw new HTTPException(403);
    }
    return next();
  });
}

export const Public = () => AuthGuard(true);
