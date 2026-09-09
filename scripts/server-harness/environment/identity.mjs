import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const TEST_USERS = Object.freeze([
  Object.freeze({ id: 91000001, login: "harness-user-a", name: "Harness User A", avatar_url: "http://127.0.0.1:19090/avatars/a.svg" }),
  Object.freeze({ id: 91000002, login: "harness-user-b", name: "Harness User B", avatar_url: "http://127.0.0.1:19090/avatars/b.svg" }),
]);

export function createIdentityServer({ tokenA, tokenB }) {
  if (![tokenA, tokenB].every((value) => /^harness-fake-[a-f0-9]{48}$/.test(value ?? "")) || tokenA === tokenB) {
    throw new Error("Identity fixture requires two distinct synthetic harness tokens");
  }
  const identities = new Map([[`Bearer ${tokenA}`, TEST_USERS[0]], [`Bearer ${tokenB}`, TEST_USERS[1]]]);
  const server = createServer({ maxHeaderSize: 16 * 1024, requestTimeout: 10_000, headersTimeout: 5_000 }, (request, response) => {
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json");
    const reply = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
    if (request.method !== "GET") { response.setHeader("allow", "GET"); return reply(405, { error: "GET required" }); }
    if (request.url === "/healthz") return reply(200, { fixture: "HARNESS_ISOLATED_IDENTITY", ready: true });
    if (request.url === "/github/user") {
      const user = identities.get(request.headers.authorization);
      return user ? reply(200, user) : reply(401, { error: "Invalid fixture credential" });
    }
    if (/^\/avatars\/[ab]\.svg$/.test(request.url ?? "")) {
      response.setHeader("content-type", "image/svg+xml");
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#64748b"/></svg>');
      return;
    }
    return reply(404, { error: "Unknown fixture endpoint" });
  });
  server.maxRequestsPerSocket = 1000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createIdentityServer({ tokenA: process.env.HARNESS_GH_TOKEN_A, tokenB: process.env.HARNESS_GH_TOKEN_B });
  server.listen(9090, "0.0.0.0", () => process.stdout.write("HARNESS_ISOLATED_IDENTITY listening on port 9090\n"));
  const stop = () => { server.closeAllConnections(); server.close(() => process.exit(0)); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
