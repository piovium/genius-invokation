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
import { isGuestId } from "../utils";
import type { JWTPayload } from "hono/utils/jwt/types";
import { getJwtPayload } from "./auth.guard";

export function isUserJwtPayload(
  payload: JWTPayload,
): payload is JWTPayload & { user: 1; sub: number } {
  return (
    "user" in payload &&
    payload.user === 1 &&
    "sub" in payload &&
    typeof payload.sub === "number"
  );
}

export function isGuestJwtPayload(
  payload: JWTPayload,
): payload is JWTPayload & { sub: string } {
  return "sub" in payload && isGuestId(payload.sub);
}

export async function getUserId(c: Context): Promise<number | null> {
  const payload = await getJwtPayload(c);
  return payload && isUserJwtPayload(payload) ? payload.sub : null;
}

export async function getGuestId(c: Context): Promise<string | null> {
  const payload = await getJwtPayload(c);
  return payload && isGuestJwtPayload(payload) ? payload.sub : null;
}

export async function getUserOrGuestId(
  c: Context,
): Promise<number | string | null> {
  const payload = await getJwtPayload(c);
  return payload && (isUserJwtPayload(payload) || isGuestJwtPayload(payload))
    ? payload.sub
    : null;
}
