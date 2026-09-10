import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApi, delay } from "./http.mjs";

test("HTTP JSON keeps UTF-8 characters split between network chunks", async (t) => {
  const server = createServer(async (_, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    const bytes = Buffer.from('{"name":"七圣召唤"}');
    const split = bytes.indexOf(Buffer.from("七")) + 1;
    response.write(bytes.subarray(0, split));
    await delay(10);
    response.end(bytes.subarray(split));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const api = createApi(`http://127.0.0.1:${server.address().port}`);
  assert.equal((await api("/")).data.name, "七圣召唤");
});

test("unexpected HTTP status fails without echoing credentials or response bodies", async (t) => {
  const server = createServer((_, response) => { response.writeHead(500); response.end("secret-server-body"); });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const api = createApi(`http://127.0.0.1:${server.address().port}`);
  await assert.rejects(api("/", { token: "secret-token" }), (error) => {
    assert.match(error.message, /HTTP 500/);
    assert.doesNotMatch(error.message, /secret/);
    return true;
  });
});
