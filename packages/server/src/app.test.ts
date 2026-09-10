import { test } from "node:test";
import assert from "node:assert/strict";
import { createApplication, listenApplication } from "./app";
import { createDatabase } from "./db/database";
import { createGuestId } from "./auth/guest-id";

test("real Elysia HTTP keeps public routes, protected APIs, errors, metrics and API prefix", async () => {
  // The pg pool remains lazy for routes that never need the database.
  // Database-backed requests and restart persistence have separate live PG tests.
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
  const url = server.url;
  try {
    assert.equal(
      await (await fetch(new URL("play/api/hello", url))).text(),
      "Hello World!",
    );
    const version = (await (
      await fetch(new URL("play/api/version", url))
    ).json()) as {
      coreVersion: string;
      supportedGameVersions: string[];
      currentGameVersion: string;
    };
    assert.equal(typeof version.coreVersion, "string");
    assert.ok(
      version.supportedGameVersions.includes(version.currentGameVersion),
    );
    assert.equal(
      await (await fetch(new URL("play/api/users/me", url))).json(),
      null,
    );
    assert.equal(
      await (await fetch(new URL("play/api/rooms/current", url))).json(),
      null,
    );
    const guestToken = await service.auth.signGuest(createGuestId());
    const currentRoom = await fetch(new URL("play/api/rooms/current", url), {
      headers: { authorization: "Bearer " + guestToken },
    });
    assert.equal(currentRoom.status, 200);
    assert.equal(await currentRoom.json(), null);
    for (const path of ["decks", "games", "games/mine", "users/91000001"]) {
      const response = await fetch(new URL("play/api/" + path, url));
      assert.equal(response.status, 401);
      assert.partialDeepStrictEqual(await response.json(), { statusCode: 401 });
    }
    const teapot = await fetch(new URL("play/api/teapot", url));
    assert.equal(teapot.status, 418);
    assert.partialDeepStrictEqual(await teapot.json(), {
      message: "I'm a teapot~",
    });
    const missing = await fetch(
      new URL("play/api/rooms/1/players/1/notification", url),
    );
    assert.equal(missing.status, 404);
    await missing.body?.cancel();
    const wrongPrefix = await fetch(new URL("api/hello", url));
    assert.equal(wrongPrefix.status, 404);
    await wrongPrefix.body?.cancel();
    const metrics = await fetch(new URL("metrics", url));
    assert.equal(metrics.status, 200);
    assert.equal(
      metrics.headers.get("content-type"),
      service.metrics.contentType,
    );
    assert.ok((await metrics.text()).includes("gi_rooms_active"));
    const preflight = await fetch(new URL("play/api/decks", url), {
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
