import { isGuestId } from "./guest-id";

export interface UserJwtPayload {
  user: 1;
  sub: number;
  iat?: number;
  exp?: number;
}
export interface GuestJwtPayload {
  user: 0;
  sub: string;
  iat?: number;
  exp?: number;
}
export type JwtPayload = UserJwtPayload | GuestJwtPayload;

function hasSubject(payload: unknown): payload is { user: unknown; sub: unknown } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "user" in payload &&
    "sub" in payload
  );
}

export function isUserJwtPayload(payload: unknown): payload is UserJwtPayload {
  return (
    hasSubject(payload) &&
    payload.user === 1 &&
    Number.isSafeInteger(payload.sub) &&
    Number(payload.sub) > 0
  );
}
export function isGuestJwtPayload(
  payload: unknown,
): payload is GuestJwtPayload {
  return hasSubject(payload) && payload.user === 0 && isGuestId(payload.sub);
}
