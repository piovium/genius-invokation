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

import { isGuestId } from "./guest-id";

export type UserJwtPayload = {
  user: 1;
  sub: number;
  iat?: number;
  exp?: number;
};
export type GuestJwtPayload = {
  user: 0;
  sub: string;
  iat?: number;
  exp?: number;
};
export type JwtPayload = UserJwtPayload | GuestJwtPayload;
export function isUserJwtPayload(payload: unknown): payload is UserJwtPayload {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "user" in payload &&
    payload.user === 1 &&
    "sub" in payload &&
    Number.isSafeInteger(payload.sub) &&
    Number(payload.sub) > 0
  );
}
export function isGuestJwtPayload(
  payload: unknown,
): payload is GuestJwtPayload {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "user" in payload &&
    payload.user === 0 &&
    "sub" in payload &&
    isGuestId(payload.sub)
  );
}
