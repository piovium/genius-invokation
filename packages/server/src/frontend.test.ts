import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createFrontendHandler } from "./frontend";
import { listenHttp } from "./http-server";

test("real file responses honor the base path and cover MIME types, cache validators, SPA fallback and beta injection", async () => {
  const folder = await mkdtemp(join(tmpdir(), "gi-frontend-test-"));
  let server: Awaited<ReturnType<typeof listenHttp>> | undefined;
  try {
    await writeFile(
      join(folder, "index.html"),
      "<!doctype html><head><!-- server:head --></head><body><!-- server:body --></body>",
    );
    await writeFile(join(folder, "app-fixture.js"), "console.log('fixture');");
    await writeFile(join(folder, "sw.js"), "self.skipWaiting();");
    server = await listenHttp(
      createFrontendHandler({
        directory: folder,
        basePath: "/play/",
        beta: true,
      }),
      { hostname: "127.0.0.1", port: 0 },
    );
    const url = server.url;
    const request = (path: string, init?: RequestInit) =>
      fetch(new URL(path, url), init);
    const script = await request("play/app-fixture.js");
    assert.match(script.headers.get("content-type") ?? "", /javascript/);
    assert.ok(script.headers.get("cache-control")?.includes("immutable"));
    assert.equal(await script.text(), "console.log('fixture');");
    const conditional = await request("play/app-fixture.js", {
      headers: { "if-none-match": script.headers.get("etag")! },
    });
    assert.equal(conditional.status, 304);
    const worker = await request("play/sw.js");
    assert.ok(worker.headers.get("cache-control")?.includes("no-cache"));
    await worker.body?.cancel();
    for (const route of ["play", "play/", "play/rooms/123"]) {
      const page = await request(route);
      assert.equal(page.status, 200);
      assert.ok(page.headers.get("cache-control")?.includes("no-cache"));
      assert.ok(
        (await page.text()).includes('<meta name="robots" content="noindex">'),
      );
    }
    for (const route of [
      "elsewhere",
      "play/api/missing",
      "play/%2e%2e%2fsecret",
      "play/%5csecret",
    ]) {
      const denied = await request(route);
      assert.equal(denied.status, 404);
      await denied.body?.cancel();
    }
  } finally {
    await server?.stop();
    // Guard the recursive delete so only the scratch folder we created is removed.
    if (
      dirname(resolve(folder)) !== resolve(tmpdir()) ||
      !basename(folder).startsWith("gi-frontend-test-")
    )
      throw new Error("Unexpected temporary frontend path");
    await rm(folder, { recursive: true, force: true });
  }
});
