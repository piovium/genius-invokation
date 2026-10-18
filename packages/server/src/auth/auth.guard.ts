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
import { every } from "hono/combine";
import { ForbiddenException } from "../errors";
import { jwt, verify } from "hono/jwt";
import { isUserJwtPayload } from "./user.decorator";
import type { Context } from "hono";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET environment variable is not set.");
}

const alg = "HS256";
const options = {
  iat: false,
} as const;

const jwtMiddleware = jwt({
  secret,
  alg: "HS256",
  verification: options,
});

export const getJwtPayload = async (ctx: Context) => {
  const payload = ctx.get("jwtPayload");
  if (payload) {
    return payload;
  }
  const authHeader = ctx.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return await verify(token, secret, { ...options, alg });
  } catch (error) {
    return null;
  }
};

const verifyJwtPayload = createMiddleware(async (ctx, next) => {
  const jwtPayload = await getJwtPayload(ctx);
  if (!jwtPayload || !isUserJwtPayload(jwtPayload)) {
    throw new ForbiddenException();
  }
  await next();
});

export const AuthGuard = every(jwtMiddleware, verifyJwtPayload);
