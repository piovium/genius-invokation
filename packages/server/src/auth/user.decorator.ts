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

import type { Context } from "hono";
import type { HTTPException } from "hono/http-exception";
import type { JwtVariables } from "hono/jwt";
import { isGuestId } from "../utils";

export type AuthEnv = {
  Variables: JwtVariables & { authError?: HTTPException };
};

export function isUserJwtPayload(
  payload: unknown,
): payload is { user: 1; sub: number } {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "user" in payload &&
    payload.user === 1 &&
    "sub" in payload &&
    typeof payload.sub === "number"
  );
}

export function isGuestJwtPayload(
  payload: unknown,
): payload is { sub: string } {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "sub" in payload &&
    isGuestId(payload.sub)
  );
}

export function User(c: Context<AuthEnv>): number | null {
  const payload = c.get("jwtPayload");
  return isUserJwtPayload(payload) ? payload.sub : null;
}

export function Guest(c: Context<AuthEnv>): string | null {
  const payload = c.get("jwtPayload");
  return isGuestJwtPayload(payload) ? payload.sub : null;
}

export function UserOrGuest(c: Context<AuthEnv>): number | string | null {
  return User(c) ?? Guest(c);
}
