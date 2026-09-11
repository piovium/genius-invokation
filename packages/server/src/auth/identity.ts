import { Elysia } from "elysia";
import { unauthorized } from "../errors";
import { isUserJwtPayload, type JwtPayload, type UserJwtPayload } from "./jwt";
import type { Auth } from "./session";

/**
 * Verifies the request's bearer token and returns its payload; `null` when the
 * header is missing or unusable.
 */
function readIdentity(request: Request, auth: Auth): JwtPayload | null {
  const [scheme, token] =
    request.headers.get("authorization")?.split(" ") ?? [];
  return scheme === "Bearer" && token ? auth.verify(token) : null;
}

/** Throws 401 unless the request carries a valid token of any kind. */
function requireIdentity(request: Request, auth: Auth): JwtPayload {
  const identity = readIdentity(request, auth);
  if (!identity) throw unauthorized();
  return identity;
}

/** Throws 401 unless the request carries a registered account's token. */
function requireUserIdentity(request: Request, auth: Auth): UserJwtPayload {
  const identity = requireIdentity(request, auth);
  if (!isUserJwtPayload(identity)) throw unauthorized();
  return identity;
}

/**
 * Builds one opt-in macro: when a route enables it, `read(request)` is added to
 * the context as `field`; otherwise it contributes nothing.
 */
const inject =
  (field: string, read: (request: Request) => unknown) => (enabled: boolean) =>
    enabled
      ? {
          resolve: ({ request }: { request: Request }) => ({
            [field]: read(request),
          }),
        }
      : {};

/**
 * Elysia plugin that resolves the caller's identity for the routes that mount it:
 *
 * - `{ identity: true }` injects `identity`, `null` for anonymous callers;
 * - `{ user: true }` requires a registered account and injects `user`;
 * - `{ player: true }` requires any authenticated caller and injects `player`.
 *
 * A macro resolves only for the routes that ask for it, so a route that reads no
 * identity never verifies a token.
 */
export const identity = (auth: Auth) =>
  new Elysia({ name: "identity" }).macro({
    identity: inject("identity", (request) => readIdentity(request, auth)),
    user: inject("user", (request) => requireUserIdentity(request, auth)),
    player: inject("player", (request) => requireIdentity(request, auth)),
  });
