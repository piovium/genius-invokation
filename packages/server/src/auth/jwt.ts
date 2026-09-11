import { isGuestId } from "./guest-id";

/** The two standard time claims both payload shapes carry. */
interface JwtTimeClaims {
  iat?: number;
  exp?: number;
}

export interface UserJwtPayload extends JwtTimeClaims {
  user: 1;
  sub: number;
}

export interface GuestJwtPayload extends JwtTimeClaims {
  user: 0;
  sub: string;
}
export type JwtPayload = UserJwtPayload | GuestJwtPayload;

/** True when `value` is a positive integer that a JS number can represent exactly. */
export const isPositiveSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/** Checks that the two claim fields every payload shape carries are present. */
function hasIdentityClaims(
  payload: unknown,
): payload is { user: unknown; sub: unknown } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "user" in payload &&
    "sub" in payload
  );
}

export function isUserJwtPayload(payload: unknown): payload is UserJwtPayload {
  if (!hasIdentityClaims(payload) || payload.user !== 1) return false;
  return isPositiveSafeInteger(payload.sub);
}
export function isGuestJwtPayload(
  payload: unknown,
): payload is GuestJwtPayload {
  return (
    hasIdentityClaims(payload) && payload.user === 0 && isGuestId(payload.sub)
  );
}
