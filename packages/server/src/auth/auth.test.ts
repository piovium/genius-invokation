import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { AuthService } from "./auth.service";
import type { UsersService } from "../users/users.service";
import { createGuestId } from "./guest-id";
import { listenHttp } from "../http-server";

function createTestJwt(payload: unknown, secret: string, alg = "HS256") {
  const signingInput =
    Buffer.from(JSON.stringify({ alg, typ: "JWT" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url");
  return (
    signingInput +
    "." +
    createHmac("sha256", secret).update(signingInput).digest("base64url")
  );
}

test("existing user JWTs and new guest JWTs verify; tampering, expiry and algorithm confusion fail", async () => {
  const auth = new AuthService({} as UsersService, "unit-fixture-secret");
  const payload = {
    user: 1,
    sub: 91000001,
    exp: Math.floor(Date.now() / 1000) + 60,
  };
  assert.equal(
    auth.verify(createTestJwt(payload, "unit-fixture-secret"))?.sub,
    payload.sub,
  );
  const guestId = createGuestId();
  const guestToken = await auth.signGuest(guestId);
  assert.equal(auth.verify(guestToken)?.sub, guestId);
  const guestPayload = JSON.parse(
    Buffer.from(guestToken.split(".")[1]!, "base64url").toString(),
  );
  assert.equal(guestPayload.exp - guestPayload.iat, 42 * 86400);
  for (const token of [
    createTestJwt(payload, "other-secret"),
    createTestJwt(payload, "unit-fixture-secret", "none"),
    createTestJwt({ ...payload, exp: 1 }, "unit-fixture-secret"),
    createTestJwt({ ...payload, user: 2 }, "unit-fixture-secret"),
    createTestJwt(
      { ...payload, user: 0, sub: "not-a-guest-id" },
      "unit-fixture-secret",
    ),
    guestToken + ".extra",
    "a".repeat(8193),
  ])
    assert.equal(auth.verify(token), null);
});

test("OAuth exchanges code over real HTTP, saves identity token and returns a compatible 42-day JWT", async () => {
  const requests: { path: string; auth: string | null; body?: unknown }[] = [];
  const saved: { id: number; ghToken: string }[] = [];
  const fixture = await listenHttp(
    async (request) => {
      const path = new URL(request.url).pathname;
      requests.push({
        path,
        auth: request.headers.get("authorization"),
        ...(request.method === "POST" ? { body: await request.json() } : {}),
      });
      return path === "/exchange"
        ? Response.json({ access_token: "oauth-fixture-access-token" })
        : Response.json({ id: 91000001 });
    },
    { hostname: "127.0.0.1", port: 0 },
  );
  try {
    const users = {
      create: async (id: number, ghToken: string) => {
        saved.push({ id, ghToken });
      },
    } as unknown as UsersService;
    const auth = new AuthService(users, "unit-fixture-secret", {
      exchange: fixture.url + "exchange",
      user: fixture.url + "user",
    });
    const result = await auth.login("fixture-code");
    assert.equal(auth.verify(result.accessToken)?.sub, 91000001);
    assert.deepEqual(saved, [
      { id: 91000001, ghToken: "oauth-fixture-access-token" },
    ]);
    assert.partialDeepStrictEqual(requests[0]!.body, { code: "fixture-code" });
    assert.equal(requests[1]!.auth, "Bearer oauth-fixture-access-token");
  } finally {
    await fixture.stop();
  }
});
