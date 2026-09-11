import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { Elysia, t } from "elysia";
import { node } from "@elysiajs/node";
import { nameSchema } from "./http";
import { listenHttp } from "./http-server";

const MAX_NAME_LENGTH = 64;

test("routing ignores the client-controlled Host header", async () => {
  const app = new Elysia({ adapter: node() })
    .get("/metrics", () => "METRICS")
    .get("/*", () => "SPA");
  const server = await listenHttp(app.fetch, {
    hostname: "127.0.0.1",
    port: 0,
  });
  const get = (host: string) =>
    new Promise<string>((resolve, reject) => {
      const socket = net.connect(Number(server.url.port), "127.0.0.1", () => {
        socket.write(
          `GET /metrics HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`,
        );
      });
      let received = "";
      socket.setEncoding("utf8");
      socket.on("data", (chunk: string) => (received += chunk));
      socket.on("close", () => resolve(received));
      socket.on("error", reject);
    });
  try {
    // Elysia 1.4 misses every route when the routing URL's authority is a bare
    // host shorter than four characters, so a container reached as `http://api`
    // must still reach the API.
    for (const host of ["api", "a", "abcd", "example.com"]) {
      const response = await get(host);
      assert.match(response, /^HTTP\/1\.1 200/);
      assert.match(response, /METRICS/);
    }
  } finally {
    await server.stop();
  }
});

test("HTTP name validation preserves the old 64-character Unicode limit", async () => {
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
    // Cover single-byte, surrogate-pair and multi-byte names: the limit counts
    // Unicode code points, not UTF-16 units or encoded bytes.
    for (const name of [
      "a".repeat(MAX_NAME_LENGTH),
      "😀".repeat(MAX_NAME_LENGTH),
      "中文名字",
    ]) {
      const response = await submitName(name);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { name });
    }
    for (const name of [
      "",
      "a".repeat(MAX_NAME_LENGTH + 1),
      "😀".repeat(MAX_NAME_LENGTH + 1),
    ]) {
      const response = await submitName(name);
      assert.ok(response.status >= 400);
      assert.ok(response.status < 500);
      await response.body?.cancel();
    }
  } finally {
    await server.stop();
  }
});
