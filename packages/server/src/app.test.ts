import console from "node:console";
import { createHmac } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { ConflictException, UnauthorizedException } from "./errors";
import { sign } from "hono/jwt";
import { serve } from "@hono/node-server";
import { DrizzleQueryError } from "drizzle-orm";
import { Observable, Subject, of } from "rxjs";

const services = vi.hoisted(() => ({
  authService: { login: vi.fn(), signGuest: vi.fn() },
  usersService: { findById: vi.fn(), updateUserInfo: vi.fn() },
  decksService: {
    createDeck: vi.fn(),
    deckToCode: vi.fn(),
    getAllDecks: vi.fn(),
    getDeck: vi.fn(),
    updateDeck: vi.fn(),
    deleteDeck: vi.fn(),
  },
  gamesService: {
    getAllGames: vi.fn(),
    gamesHasUser: vi.fn(),
    getGame: vi.fn(),
  },
  roomsService: {
    getAllRooms: vi.fn(),
    currentRoom: vi.fn(),
    getRoom: vi.fn(),
    createRoomFromUser: vi.fn(),
    createRoomFromGuest: vi.fn(),
    joinRoomFromUser: vi.fn(),
    joinRoomFromGuest: vi.fn(),
    deleteRoom: vi.fn(),
    getRoomGameLog: vi.fn(),
    playerNotification: vi.fn(),
    receivePlayerResponse: vi.fn(),
    receivePlayerGiveUp: vi.fn(),
  },
  metricsService: {
    contentType: "text/plain; version=0.0.4",
    getMetrics: vi.fn(),
  },
}));
vi.mock("./services", () => services);
vi.mock("@gi-tcg/assets-manager", () => ({
  DEFAULT_ASSETS_MANAGER: { prepareForSync: vi.fn() },
}));
vi.mock("@gi-tcg/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@gi-tcg/config")>()),
  WEB_CLIENT_BASE_PATH: "/beta/",
  IS_BETA: true,
}));
vi.mock("@gi-tcg/data-code-analyzer", () => ({
  analyzeResult: { tested: true },
}));
vi.mock("./redis", () => ({ redis: null }));

import { AppModule } from "./app.module";
import { frontend } from "./frontend";
import { AuthGuard, parseAuth } from "./auth/auth.guard";
import { UserOrGuest, type AuthEnv } from "./auth/user.decorator";
import { DatabaseExceptionFilter } from "./db/database-exception.filter";
import { streamNotification } from "./rooms/rooms.controller";
import type { SSEPayload } from "./rooms/rooms.service";
import { createGuestId } from "./utils";

const secret = "migration-tests";
const deck = { name: "Deck", characters: [1, 2, 3], cards: Array(30).fill(1) };
const jsonRequest = (method: string, value: unknown, token?: string) => ({
  method,
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(value),
});
const token = (payload = { user: 1, sub: 123 }) =>
  sign(payload, secret, "HS256");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", secret);
  services.usersService.findById.mockResolvedValue({
    id: 123,
    login: "tester",
  });
  services.decksService.getAllDecks.mockResolvedValue({ count: 0, data: [] });
  services.decksService.createDeck.mockResolvedValue({
    id: 7,
    code: "encoded",
  });
  services.decksService.deckToCode.mockResolvedValue({
    code: "encoded",
    requiredVersion: 0,
  });
  services.roomsService.getAllRooms.mockReturnValue([]);
  services.roomsService.getRoom.mockReturnValue({
    id: 0,
    config: { allowGuest: true },
  });
  services.metricsService.getMetrics.mockResolvedValue("gi_rooms_active 0\n");
});
afterEach(() => vi.unstubAllEnvs());

describe("HTTP contract", () => {
  it("mounts the API prefix, root metrics and empty responses", async () => {
    expect(await (await AppModule.request("/beta/api/hello")).text()).toBe(
      "Hello World!",
    );
    expect((await AppModule.request("/api/hello")).status).toBe(404);
    expect((await AppModule.request("/beta/api/missing")).status).toBe(404);
    const metrics = await AppModule.request("/metrics");
    expect(metrics.headers.get("Content-Type")).toContain("version=0.0.4");
    expect(await metrics.text()).toBe("gi_rooms_active 0\n");
    const health = await AppModule.request("/beta/api/healthz");
    expect(health.status).toBe(200);
    expect(await health.text()).toBe("");
    expect(
      await (await AppModule.request("/beta/api/users/me")).json(),
    ).toBeNull();
    expect(
      await (await AppModule.request("/beta/api/rooms/current")).json(),
    ).toBeNull();
    expect((await AppModule.request("/beta/api/teapot")).status).toBe(418);
    expect(
      await (await AppModule.request("/beta/api/version")).json(),
    ).toHaveProperty("supportedGameVersions");
  });

  it("uses official CORS and preserves the analyzer's public header", async () => {
    const response = await AppModule.request("/beta/api/decks", {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.test",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "PATCH",
    );
    expect(
      (
        await AppModule.request("/beta/api/data_code_analyzer_result")
      ).headers.get("Access-Control-Allow-Origin"),
    ).toBe("*");
  });

  it("preserves creation status, JSON and empty update/delete responses", async () => {
    const accessToken = await token();
    const created = await AppModule.request(
      "/beta/api/decks",
      jsonRequest("POST", deck, accessToken),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ id: 7, code: "encoded" });
    expect(
      (
        await AppModule.request(
          "/beta/api/decks/version",
          jsonRequest("POST", deck),
        )
      ).status,
    ).toBe(201);
    const patched = await AppModule.request(
      "/beta/api/users/me",
      jsonRequest("PATCH", { chessboardColor: null }, accessToken),
    );
    expect(patched.status).toBe(200);
    expect(await patched.text()).toBe("");
    const deleted = await AppModule.request("/beta/api/rooms/0", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.text()).toBe("");
    expect(services.roomsService.deleteRoom).toHaveBeenCalledWith(123, 0);
  });
});

describe("authentication", () => {
  it("keeps public routes before the auth boundary and protects every later route", async () => {
    expect((await AppModule.request("/beta/api/users/me")).status).toBe(200);
    expect(
      (
        await AppModule.request(
          "/beta/api/decks/version",
          jsonRequest("POST", deck),
        )
      ).status,
    ).toBe(201);
    for (const [method, path] of [
      ["PATCH", "users/me"],
      ["GET", "users/123"],
      ["POST", "decks"],
      ["GET", "decks"],
      ["GET", "decks/7"],
      ["PATCH", "decks/7"],
      ["DELETE", "decks/7"],
      ["GET", "decks/version"],
      ["GET", "games"],
      ["GET", "games/mine"],
      ["GET", "games/7"],
    ] as const) {
      expect(
        (await AppModule.request(`/beta/api/${path}`, { method })).status,
      ).toBe(401);
    }
    // Auth middleware in other sub-applications must not affect public rooms.
    expect((await AppModule.request("/beta/api/rooms")).status).toBe(200);
  });

  it("distinguishes missing, invalid, expired, guest and user credentials", async () => {
    const guestId = createGuestId();
    const guestToken = await sign({ user: 0, sub: guestId }, secret, "HS256");
    const expired = await sign({ user: 1, sub: 123, exp: 1 }, secret, "HS256");
    for (const credential of [
      undefined,
      "Bearer invalid",
      `Bearer ${expired}`,
      `Basic ${await token()}`,
    ]) {
      const headers = credential ? { Authorization: credential } : undefined;
      expect(
        (await AppModule.request("/beta/api/decks", { headers })).status,
      ).toBe(401);
      expect(
        await (
          await AppModule.request("/beta/api/users/me", { headers })
        ).json(),
      ).toBeNull();
    }
    expect(
      (
        await AppModule.request("/beta/api/decks", {
          headers: { Authorization: `Bearer ${guestToken}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await AppModule.request("/beta/api/decks", {
          headers: { Authorization: `Bearer ${await token()}` },
        })
      ).status,
    ).toBe(200);
    const app = new Hono<AuthEnv>()
      .use(parseAuth)
      .get("/", (c) => c.json(UserOrGuest(c)));
    expect(
      await (
        await app.request("/", {
          headers: { Authorization: `Bearer ${guestToken}` },
        })
      ).json(),
    ).toBe(guestId);
  });

  it("accepts the existing HS256 wire format with a numeric sub", async () => {
    const encode = (data: unknown) =>
      Buffer.from(JSON.stringify(data)).toString("base64url");
    const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ user: 1, sub: 123, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}`;
    const legacy = `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
    expect(
      (
        await AppModule.request("/beta/api/decks", {
          headers: { Authorization: `Bearer ${legacy}` },
        })
      ).status,
    ).toBe(200);
  });

  it("does not swallow downstream errors on public routes", async () => {
    const app = new Hono<AuthEnv>().use(parseAuth).get("/", () => {
      throw new ConflictException("conflict");
    });
    const response = await app.request("/", {
      headers: { Authorization: `Bearer ${await token()}` },
    });
    expect(response.status).toBe(409);
    expect(await response.text()).toBe("conflict");
    const protectedApp = new Hono<AuthEnv>()
      .use(parseAuth)
      .get("/", AuthGuard, (c) => c.text("ok"));
    const badSignature = await sign(
      { user: 1, sub: 123 },
      "wrong-secret",
      "HS256",
    );
    expect(
      (
        await protectedApp.request("/", {
          headers: { Authorization: `Bearer ${badSignature}` },
        })
      ).status,
    ).toBe(401);
  });
});

describe("Standard Schema validation", () => {
  it("applies numeric morphs and preserves path/query parsing differences", async () => {
    const headers = { Authorization: `Bearer ${await token()}` };
    expect(
      (
        await AppModule.request(
          "/beta/api/decks?skip=1e1&take=30&requiredVersion=0",
          { headers },
        )
      ).status,
    ).toBe(200);
    expect(services.decksService.getAllDecks).toHaveBeenLastCalledWith(123, {
      skip: 10,
      take: 30,
      requiredVersion: 0,
    });
    for (const query of [
      "skip=0",
      "skip=",
      "skip=%20",
      "skip=1.5",
      "take=31",
      "requiredVersion=-1",
      "take=1&take=2",
    ]) {
      expect(
        (await AppModule.request(`/beta/api/decks?${query}`, { headers }))
          .status,
      ).toBe(400);
    }
    expect((await AppModule.request("/beta/api/rooms/0")).status).toBe(200);
    for (const id of ["1e1", "0x10", "1.5", "abc"]) {
      expect((await AppModule.request(`/beta/api/rooms/${id}`)).status).toBe(
        400,
      );
    }
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players/invalid/notification",
        )
      ).status,
    ).toBe(400);
  });

  it("validates JSON, lengths, optional fields and explicit nullability", async () => {
    for (const value of [
      null,
      [],
      { ...deck, characters: [1, 2] },
      { ...deck, cards: [1] },
      { ...deck, name: "" },
      { ...deck, characters: [0, 2, 3] },
    ]) {
      const response = await AppModule.request(
        "/beta/api/decks/version",
        jsonRequest("POST", value),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty("success", false);
    }
    expect(
      (
        await AppModule.request("/beta/api/decks/version", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        })
      ).status,
    ).toBe(400);
    const accessToken = await token();
    for (const value of [
      { name: null },
      { chessboardColor: "red" },
      { name: "x".repeat(65) },
    ]) {
      expect(
        (
          await AppModule.request(
            "/beta/api/users/me",
            jsonRequest("PATCH", value, accessToken),
          )
        ).status,
      ).toBe(400);
    }
    for (const value of [
      {},
      { name: "😀".repeat(64) },
      { chessboardColor: null },
      { chessboardColor: "#aAbB09" },
    ]) {
      expect(
        (
          await AppModule.request(
            "/beta/api/users/me",
            jsonRequest("PATCH", value, accessToken),
          )
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await AppModule.request(
          "/beta/api/decks/version",
          jsonRequest("POST", { ...deck, extra: true }),
        )
      ).status,
    ).toBe(201);
    expect(services.decksService.deckToCode).toHaveBeenLastCalledWith({
      ...deck,
      extra: true,
    });
  });

  it("selects room DTOs by identity for creation and joining", async () => {
    const accessToken = await token();
    services.roomsService.createRoomFromUser.mockResolvedValue({ id: 0 });
    services.roomsService.createRoomFromGuest.mockResolvedValue({
      playerId: "guest-id",
      room: { id: 0 },
    });
    services.roomsService.joinRoomFromGuest.mockResolvedValue({
      playerId: "guest-id",
    });
    services.authService.signGuest.mockResolvedValue("guest-token");
    const guestBody = { name: "Guest", deck };
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms",
          jsonRequest("POST", { hostDeckId: 7 }, accessToken),
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms",
          jsonRequest("POST", guestBody, accessToken),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms",
          jsonRequest("POST", { hostDeckId: 7 }),
        )
      ).status,
    ).toBe(400);
    const guest = await AppModule.request(
      "/beta/api/rooms",
      jsonRequest("POST", guestBody),
    );
    expect(await guest.json()).toEqual({
      accessToken: "guest-token",
      playerId: "guest-id",
      room: { id: 0 },
    });
    for (const option of [
      { hostFirst: null },
      { actionTime: 24 },
      { gameVersion: -1 },
      { watchable: "true" },
      { randomSeed: 2147483547 },
    ]) {
      expect(
        (
          await AppModule.request(
            "/beta/api/rooms",
            jsonRequest("POST", { ...guestBody, ...option }),
          )
        ).status,
      ).toBe(400);
    }
    const joined = await AppModule.request(
      "/beta/api/rooms/0/players",
      jsonRequest("POST", { deckId: 7 }, accessToken),
    );
    expect(joined.status).toBe(201);
    expect(await joined.text()).toBe("");
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players",
          jsonRequest("POST", guestBody, accessToken),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players",
          jsonRequest("POST", { deckId: 7 }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players",
          jsonRequest("POST", guestBody),
        )
      ).status,
    ).toBe(201);
  });

  it("validates action responses and enforces player ownership", async () => {
    const accessToken = await token();
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players/123/actionResponse",
          jsonRequest("POST", { id: 1, response: "AA==" }, accessToken),
        )
      ).status,
    ).toBe(201);
    expect(services.roomsService.receivePlayerResponse).toHaveBeenCalledWith(
      0,
      123,
      { id: 1, response: "AA==" },
    );
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players/123/actionResponse",
          jsonRequest("POST", { id: 1, response: "bad!" }, accessToken),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players/456/giveUp",
          jsonRequest("POST", {}, accessToken),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await AppModule.request(
          "/beta/api/rooms/0/players/123/giveUp",
          jsonRequest("POST", {}, accessToken),
        )
      ).status,
    ).toBe(201);
  });
});

it("maps database unique violations in middleware and leaves other errors at 500", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const [code, status] of [
    ["23505", 409],
    ["23503", 500],
  ] as const) {
    const app = new Hono().use(DatabaseExceptionFilter).get("/", () => {
      throw new DrizzleQueryError(
        "insert",
        [],
        Object.assign(new Error("database failure"), { code }),
      );
    });
    const response = await app.request("/");
    expect(response.status).toBe(status);
    expect(await response.text()).toBe(
      status === 409 ? "Record already exists" : "Internal Server Error",
    );
  }
});

it("serves production assets, conditional requests and SPA fallbacks after API routes", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const directory = await mkdtemp(path.join(tmpdir(), "hono-frontend-"));
  try {
    await Promise.all([
      writeFile(
        path.join(directory, "index.html"),
        "<head><!-- server:head --></head><body><!-- server:body --></body>",
      ),
      writeFile(path.join(directory, "sw.js"), "/* worker */"),
      writeFile(path.join(directory, "bundle.js"), "/* bundle */"),
    ]);
    const app = new Hono().route("/", AppModule);
    await frontend(app, directory);
    const asset = await app.request("/beta/bundle.js");
    expect(asset.headers.get("Cache-Control")).toContain("immutable");
    expect(asset.headers.get("Content-Type")).toContain("javascript");
    const etag = asset.headers.get("ETag")!;
    expect(etag).toBeTruthy();
    expect(
      (
        await app.request("/beta/bundle.js", {
          headers: { "If-None-Match": etag },
        })
      ).status,
    ).toBe(304);
    expect(
      (await app.request("/beta/sw.js")).headers.get("Cache-Control"),
    ).toContain("no-cache");
    for (const url of ["/beta", "/beta/", "/beta/rooms/example"]) {
      expect(await (await app.request(url)).text()).toContain(
        '<meta name="robots" content="noindex">',
      );
    }
    expect(await (await app.request("/beta/api/hello")).text()).toBe(
      "Hello World!",
    );
    expect((await app.request("/beta/api/unknown")).status).toBe(404);
    expect((await app.request("/metrics")).headers.get("ETag")).toBeNull();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("SSE transport", () => {
  it("preserves frame order and completes finite sources", async () => {
    const app = new Hono().get("/", (c) =>
      streamNotification(
        c,
        of(
          { data: { type: "waiting" as const } },
          { data: { type: "ping" as const } },
        ),
      ),
    );
    const response = await app.request("/");
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await response.text()).toBe(
      'data: {"type":"waiting"}\nid: 1\n\ndata: {"type":"ping"}\nid: 2\n\n',
    );
  });

  it("unsubscribes on cancellation and observable errors", async () => {
    const disposed = vi.fn();
    const source = new Observable<{ data: SSEPayload }>((subscriber) => {
      subscriber.next({ data: { type: "waiting" } });
      return disposed;
    });
    const app = new Hono().get("/", (c) => streamNotification(c, source));
    const response = await app.request("/");
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(disposed).toHaveBeenCalledOnce();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = new Hono().get("/", (c) =>
      streamNotification(
        c,
        new Observable((subscriber) => {
          subscriber.error(new Error("stream failed"));
          return disposed;
        }),
      ),
    );
    expect(await (await failed.request("/")).text()).toBe("");
    expect(disposed).toHaveBeenCalledTimes(2);
  });

  it("returns permission errors before opening an SSE response", async () => {
    services.roomsService.playerNotification.mockImplementation(() => {
      throw new UnauthorizedException();
    });
    const response = await AppModule.request(
      "/beta/api/rooms/0/players/123/notification",
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).not.toBe("text/event-stream");
  });

  it("streams immediately and disposes on a real Node connection abort", async () => {
    const disposed = Promise.withResolvers<void>();
    const source = new Subject<{ data: SSEPayload }>();
    const app = new Hono().get("/", (c) =>
      streamNotification(
        c,
        new Observable((subscriber) => {
          subscriber.next({ data: { type: "waiting" } });
          const sub = source.subscribe(subscriber);
          return () => {
            sub.unsubscribe();
            disposed.resolve();
          };
        }),
      ),
    );
    const server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Expected TCP server");
    const abort = new AbortController();
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}`, {
        signal: abort.signal,
      });
      const reader = response.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        '"waiting"',
      );
      source.next({ data: { type: "ping" } });
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        '"ping"',
      );
      abort.abort();
      await disposed.promise;
      expect(source.observed).toBe(false);
    } finally {
      abort.abort();
      if ("closeAllConnections" in server) server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
