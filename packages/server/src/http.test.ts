import { test } from "node:test";
import assert from "node:assert/strict";
import { Elysia, t } from "elysia";
import { node } from "@elysiajs/node";
import { nameSchema } from "./http";
import { listenHttp } from "./http-server";

test("HTTP name validation preserves the old 64 Unicode character limit", async () => {
  const app = new Elysia({ adapter: node() }).post("/", ({ body }) => body, {
    body: t.Object({ name: nameSchema }),
  });
  const server = await listenHttp(app.fetch, {
    hostname: "127.0.0.1",
    port: 0,
  });
  const submitName = (name: string) =>
    fetch(server.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  try {
    for (const name of ["a".repeat(64), "😀".repeat(64), "中文名字"]) {
      const response = await submitName(name);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { name });
    }
    for (const name of ["", "a".repeat(65), "😀".repeat(65)]) {
      const response = await submitName(name);
      assert.ok(response.status >= 400);
      assert.ok(response.status < 500);
      await response.body?.cancel();
    }
  } finally {
    await server.stop();
  }
});
