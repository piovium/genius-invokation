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

import { createHmac, timingSafeEqual } from "node:crypto";
import { unauthorized } from "../errors";
import type { UsersService } from "../users/users.service";
import {
  isGuestJwtPayload,
  isUserJwtPayload,
  type JwtPayload,
} from "./user.decorator";

export const CODE_EXCHANGE_URL =
  process.env.GH_CODE_EXCHANGE_URL ||
  "https://github.com/login/oauth/access_token";
export const GET_USER_API_URL =
  process.env.GH_GET_USER_API_URL || "https://api.github.com/user";
const encodeJwtPart = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const TOKEN_LIFETIME_SECONDS = 42 * 24 * 60 * 60;

export class AuthService {
  private readonly secret: string;
  constructor(
    private readonly users: Pick<UsersService, "create">,
    secret = process.env.JWT_SECRET,
    private readonly endpoints = {
      exchange: CODE_EXCHANGE_URL,
      user: GET_USER_API_URL,
    },
  ) {
    if (!secret) throw new Error("JWT_SECRET is not set");
    this.secret = secret;
  }
  private sign(payload: JwtPayload) {
    const iat = Math.floor(Date.now() / 1000);
    const content =
      encodeJwtPart({ alg: "HS256", typ: "JWT" }) +
      "." +
      encodeJwtPart({ ...payload, iat, exp: iat + TOKEN_LIFETIME_SECONDS });
    return (
      content +
      "." +
      createHmac("sha256", this.secret).update(content).digest("base64url")
    );
  }
  verify(token: string): JwtPayload | null {
    if (typeof token !== "string" || token.length > 8192) return null;
    try {
      const segments = token.split(".");
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
      const expectedSignature = createHmac("sha256", this.secret)
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
      if (!isUserJwtPayload(payload) && !isGuestJwtPayload(payload))
        return null;
      return payload;
    } catch {
      return null;
    }
  }
  async login(code: string) {
    const exchanged = await fetch(this.endpoints.exchange, {
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
    const identity = await fetch(this.endpoints.user, {
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
    await this.users.create(user.id!, result.access_token);
    return { accessToken: this.sign({ user: 1, sub: user.id! }) };
  }
  async signGuest(playerId: string) {
    return this.sign({ user: 0, sub: playerId });
  }
}
