import { Elysia } from "elysia";
import { unauthorized } from "../errors";
import { isUserJwtPayload, type JwtPayload, type UserJwtPayload } from "./jwt";
import type { Auth } from "./session";

/** Reads the bearer token of a request; `null` when it is missing or unusable. */
export function readIdentity(request: Request, auth: Auth): JwtPayload | null {
  const [scheme, token] = request.headers.get("authorization")?.split(" ") ?? [];
  return scheme === "Bearer" && token ? auth.verify(token) : null;
}

/** Throws 401 unless the request carries a valid token of any kind. */
export function requireIdentity(request: Request, auth: Auth): JwtPayload {
  const identity = readIdentity(request, auth);
  if (!identity) throw unauthorized();
  return identity;
}

/** Throws 401 unless the request carries a registered account's token. */
export function requireUserIdentity(
  request: Request,
  auth: Auth,
): UserJwtPayload {
  const identity = requireIdentity(request, auth);
  if (!isUserJwtPayload(identity)) throw unauthorized();
  return identity;
}

/**
 * Elysia plugin that hands the caller's token to the routes of a prefix:
 *
 * - `{ identity: true }` injects `identity`, `null` for anonymous callers;
 * - `{ user: true }` requires a registered account and injects `user`;
 * - `{ player: true }` requires any authenticated caller and injects `player`.
 *
 * A macro resolves only for the routes that ask for it, so a route that reads no
 * identity never hashes a token.
 */
export const identity = (auth: Auth) =>
  new Elysia({ name: "identity" }).macro({
    identity: (enabled: boolean) =>
      enabled
        ? {
            resolve: ({ request }) => ({
              identity: readIdentity(request, auth),
            }),
          }
        : {},
    user: (enabled: boolean) =>
      enabled
        ? {
            resolve: ({ request }) => ({
              user: requireUserIdentity(request, auth),
            }),
          }
        : {},
    player: (enabled: boolean) =>
      enabled
        ? {
            resolve: ({ request }) => ({
              player: requireIdentity(request, auth),
            }),
          }
        : {},
  });
