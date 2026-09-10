import { createHmac, timingSafeEqual } from "node:crypto";
import { unauthorized } from "../errors";
import type { Users } from "../users/users";
import { isGuestJwtPayload, isUserJwtPayload, type JwtPayload } from "./jwt";

export const CODE_EXCHANGE_URL =
  process.env.GH_CODE_EXCHANGE_URL ||
  "https://github.com/login/oauth/access_token";
export const GET_USER_API_URL =
  process.env.GH_GET_USER_API_URL || "https://api.github.com/user";

const TOKEN_LIFETIME_SECONDS = 42 * 24 * 60 * 60;
const encodeJwtPart = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

export interface AuthEndpoints {
  exchange: string;
  user: string;
}

export interface Auth {
  /** Returns the payload of a well-formed, unexpired token; `null` otherwise. */
  verify(token: string): JwtPayload | null;
  /** Exchanges a GitHub OAuth code for this service's own access token. */
  login(code: string): Promise<{ accessToken: string }>;
  signGuest(playerId: string): Promise<string>;
}

export interface AuthOptions {
  users: Pick<Users, "create">;
  secret?: string;
  endpoints?: AuthEndpoints;
}

export function createAuth({
  users,
  secret = process.env.JWT_SECRET,
  endpoints = { exchange: CODE_EXCHANGE_URL, user: GET_USER_API_URL },
}: AuthOptions): Auth {
  if (!secret) throw new Error("JWT_SECRET is not set");

  const sign = (payload: JwtPayload) => {
    const iat = Math.floor(Date.now() / 1000);
    const content =
      encodeJwtPart({ alg: "HS256", typ: "JWT" }) +
      "." +
      encodeJwtPart({ ...payload, iat, exp: iat + TOKEN_LIFETIME_SECONDS });
    return (
      content + "." + createHmac("sha256", secret).update(content).digest("base64url")
    );
  };

  const verify = (token: string): JwtPayload | null => {
    if (typeof token !== "string" || token.length > 8192) return null;
    try {
      const segments = token.split(".");
      // Every segment must be canonical base64url; anything else is a forgery.
      if (
        segments.length !== 3 ||
        segments.some(
          (segment) =>
            !/^[A-Za-z0-9_-]+$/.test(segment) ||
            Buffer.from(segment, "base64url").toString("base64url") !== segment,
        )
      )
        return null;
      const header = JSON.parse(
        Buffer.from(segments[0]!, "base64url").toString(),
      );
      if (
        header.alg !== "HS256" ||
        (header.typ !== undefined && header.typ !== "JWT")
      )
        return null;
      const expectedSignature = createHmac("sha256", secret)
        .update(segments[0] + "." + segments[1])
        .digest();
      const suppliedSignature = Buffer.from(segments[2]!, "base64url");
      if (
        suppliedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(suppliedSignature, expectedSignature)
      )
        return null;
      const payload = JSON.parse(
        Buffer.from(segments[1]!, "base64url").toString(),
      );
      const now = Math.floor(Date.now() / 1000);
      if (
        !Number.isSafeInteger(payload.exp) ||
        payload.exp <= now ||
        (payload.nbf !== undefined &&
          (!Number.isFinite(payload.nbf) || payload.nbf > now))
      )
        return null;
      if (!isUserJwtPayload(payload) && !isGuestJwtPayload(payload)) return null;
      return payload;
    } catch {
      return null;
    }
  };

  const login = async (code: string) => {
    const exchanged = await fetch(endpoints.exchange, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_CLIENT_SECRET,
        code,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = (await exchanged.json()) as { access_token?: string };
    if (
      !exchanged.ok ||
      typeof result.access_token !== "string" ||
      !result.access_token
    )
      throw unauthorized("GitHub code exchange failed");
    const identity = await fetch(endpoints.user, {
      headers: {
        authorization: "Bearer " + result.access_token,
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const user = (await identity.json()) as { id?: number };
    if (!identity.ok || !Number.isSafeInteger(user.id) || user.id! <= 0)
      throw unauthorized("GitHub user lookup failed");
    await users.create(user.id!, result.access_token);
    return { accessToken: sign({ user: 1, sub: user.id! }) };
  };

  return {
    verify,
    login,
    signGuest: async (playerId: string) => sign({ user: 0, sub: playerId }),
  };
}
