import { test } from "node:test";
import assert from "node:assert/strict";
import { createApplication, listenApplication } from "./app";
import { createDatabase } from "./db/database";
import { createGuestId } from "./auth/guest-id";

test("real Elysia HTTP serves public routes and metrics, guards protected APIs, and rejects paths outside the API prefix", async () => {
  // The pg pool stays lazy for routes that never touch the database, so an
  // unreachable URL is fine here; database-backed requests and restart
  // persistence have their own live PG tests.
  const database = createDatabase(
    "postgresql://unused:unused@127.0.0.1:1/unused",
  );
  const service = createApplication({
    database,
    secret: "http-fixture-secret",
    basePath: "/play/",
    production: false,
  });
  const server = await listenApplication(service, {
    hostname: "127.0.0.1",
    port: 0,
  });
  const request = (path: string, init?: RequestInit) =>
    fetch(new URL(path, server.url), init);
  const getJson = async (path: string, init?: RequestInit) =>
    (await request(path, init)).json();
  try {
    assert.equal(
      await (await request("play/api/hello")).text(),
      "Hello World!",
    );
    const version = (await getJson("play/api/version")) as {
      coreVersion: string;
      supportedGameVersions: string[];
      currentGameVersion: string;
    };
    assert.equal(typeof version.coreVersion, "string");
    assert.ok(
      version.supportedGameVersions.includes(version.currentGameVersion),
    );
    for (const path of ["play/api/users/me", "play/api/rooms/current"]) {
      assert.equal(await getJson(path), null);
    }
    const guestToken = await service.auth.signGuest(createGuestId());
    const currentRoom = await request("play/api/rooms/current", {
      headers: { authorization: `Bearer ${guestToken}` },
    });
    assert.equal(currentRoom.status, 200);
    assert.equal(await currentRoom.json(), null);
    for (const path of ["decks", "games", "games/mine", "users/91000001"]) {
      const response = await request(`play/api/${path}`);
      assert.equal(response.status, 401);
      assert.partialDeepStrictEqual(await response.json(), { statusCode: 401 });
    }
    const teapot = await request("play/api/teapot");
    assert.equal(teapot.status, 418);
    assert.partialDeepStrictEqual(await teapot.json(), {
      message: "I'm a teapot~",
    });
    for (const path of [
      "play/api/rooms/1/players/1/notification",
      "api/hello",
    ]) {
      const missing = await request(path);
      assert.equal(missing.status, 404);
      await missing.body?.cancel();
    }
    const metrics = await request("metrics");
    assert.equal(metrics.status, 200);
    assert.equal(
      metrics.headers.get("content-type"),
      service.metrics.contentType,
    );
    assert.ok((await metrics.text()).includes("gi_rooms_active"));
    const preflight = await request("play/api/decks", {
      method: "OPTIONS",
      headers: {
        origin: "http://127.0.0.1:5173",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  } finally {
    await service.rooms.close();
    await server.stop();
    await database.close();
  }
});
