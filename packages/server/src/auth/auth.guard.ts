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
import { UnauthorizedException, ForbiddenException } from "../errors";
import { jwt } from "hono/jwt";
import { isUserJwtPayload, type AuthEnv } from "./user.decorator";

// Resolve an optional identity once for every API request. Public routes can
// use this identity without requiring authentication.
export const parseAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const [scheme, token] = c.req.header("Authorization")?.split(" ") ?? [];
  if (scheme === "Bearer" && token) {
    try {
      await jwt({
        secret: process.env.JWT_SECRET!,
        alg: "HS256",
        verification: { iat: false },
      })(c, async () => {});
    } catch (error) {
      if (!(error instanceof HTTPException) || error.status !== 401)
        throw error;
      c.set("authError", error);
    }
  }
  await next();
});

// Register after public routes and before routes that require a login user.
export const AuthGuard = createMiddleware<AuthEnv>(async (c, next) => {
  const payload = c.get("jwtPayload");
  if (!payload) throw c.get("authError") ?? new UnauthorizedException();
  if (!isUserJwtPayload(payload)) throw new ForbiddenException();
  await next();
});
