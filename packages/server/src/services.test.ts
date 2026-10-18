import console from "node:console";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import axios from "axios";

const mocks = vi.hoisted(() => ({
  pool: { query: vi.fn(), end: vi.fn() },
  redis: { get: vi.fn(), hdel: vi.fn(), quit: vi.fn() },
}));
vi.mock("pg", () => ({
  default: {
    Pool: class {
      constructor() {
        return mocks.pool;
      }
    },
  },
}));
vi.mock("./redis", () => ({ redis: mocks.redis }));
vi.mock("@gi-tcg/data", () => ({ default: vi.fn() }));
vi.mock("@gi-tcg/assets-manager", () => ({
  DEFAULT_ASSETS_MANAGER: {
    prepareForSync: vi.fn(),
    getData: async (id: number) => ({
      id,
      shareId: id,
      tags: [],
      sinceVersion: null,
      relatedCharacterId: null,
      relatedCharacterTags: [],
    }),
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.pool.query.mockReset();
  mocks.pool.end.mockResolvedValue(undefined);
  mocks.redis.get.mockResolvedValue(null);
  mocks.redis.hdel.mockResolvedValue(1);
  mocks.redis.quit.mockResolvedValue("OK");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("PGLITE_DATA_DIR", undefined);
  vi.stubEnv("JWT_SECRET", "service-tests");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("service lifecycle", () => {
  it("initializes a real in-memory PGlite database and closes services once", async () => {
    const services = await import("./services");
    const close = vi.spyOn(services.dbService, "onModuleDestroy");
    const initialization = services.initializeServices();
    expect(services.initializeServices()).toBe(initialization);
    await initialization;
    expect(
      await services.dbService.db.execute(sql`select 1 as value`),
    ).toMatchObject({ rows: [{ value: 1 }] });
    expect(await services.metricsService.getMetrics()).toContain(
      "gi_rooms_active 0",
    );
    const closing = services.shutdownServices();
    expect(services.shutdownServices()).toBe(closing);
    await closing;
    expect(close).toHaveBeenCalledOnce();
    expect(mocks.redis.quit).toHaveBeenCalledOnce();
  });

  it("closes an opened pool when database initialization fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://unused/test");
    const failure = new Error("cannot connect");
    mocks.pool.query.mockRejectedValue(failure);
    const services = await import("./services");
    const initialization = services.initializeServices();
    await expect(initialization).rejects.toHaveProperty("cause", failure);
    expect(mocks.pool.end).toHaveBeenCalledOnce();
    expect(mocks.redis.quit).toHaveBeenCalledOnce();
    await services.shutdownServices();
    expect(mocks.pool.end).toHaveBeenCalledOnce();
  });

  it("requires a database URL in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const services = await import("./services");
    await expect(services.initializeServices()).rejects.toThrow(
      "DATABASE_URL is not set",
    );
    expect(mocks.redis.quit).toHaveBeenCalledOnce();
  });
});

it("signs user and guest tokens with the original payload and 42-day lifetime", async () => {
  const { authService, usersService } = await import("./services");
  vi.spyOn(axios, "post").mockResolvedValue({
    status: 200,
    data: { access_token: "github-token" },
  });
  vi.spyOn(axios, "get").mockResolvedValue({ status: 200, data: { id: 123 } });
  vi.spyOn(usersService, "create").mockResolvedValue(undefined);
  const { accessToken } = await authService.login("oauth-code");
  expect(usersService.create).toHaveBeenCalledWith(123, "github-token");
  const user = await verify(accessToken, "service-tests", "HS256");
  expect(user).toMatchObject({ user: 1, sub: 123 });
  expect(user.exp! - user.iat!).toBe(42 * 24 * 60 * 60);
  const guest = await verify(
    await authService.signGuest("guest-id"),
    "service-tests",
    "HS256",
  );
  expect(guest).toMatchObject({ user: 0, sub: "guest-id" });
  expect(guest.exp! - guest.iat!).toBe(42 * 24 * 60 * 60);
});

it("bridges a real room's replay and heartbeat, cleans up on disconnect and drains on shutdown", async () => {
  const { roomsService, metricsService, shutdownServices } =
    await import("./services");
  const { streamNotification } = await import("./rooms/rooms.controller");
  roomsService.onModuleInit();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.useFakeTimers();
  const deck = {
    characters: [1, 2, 3],
    cards: Array.from(
      { length: 30 },
      (_, index) => 100 + Math.floor(index / 2),
    ),
  };
  const { playerId, room } = await roomsService.createRoomFromGuest({
    name: "Guest",
    deck,
  });
  try {
    expect(await metricsService.getMetrics()).toContain("gi_rooms_active 1");
    const source = roomsService.playerNotification(room.id, playerId, playerId);
    const app = new Hono().get("/", (c) => streamNotification(c, source));
    const response = await app.request("/");
    const reader = response.body!.getReader();
    const frame = async () =>
      new TextDecoder().decode((await reader.read()).value);
    expect(await frame()).toContain('"waiting"');
    expect(await frame()).toContain('"rpc"');
    expect(await frame()).toContain('"oppRpc"');
    await vi.advanceTimersByTimeAsync(10000);
    expect(await frame()).toContain('"ping"');
    const timers = vi.getTimerCount();
    await reader.cancel();
    expect(vi.getTimerCount()).toBeLessThan(timers);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("disconnected"),
    );

    let drained = false;
    const draining = roomsService.waitForShutdown().then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    await expect(
      roomsService.createRoomFromGuest({ name: "Another", deck }),
    ).rejects.toHaveProperty("status", 409);
    roomsService.deleteRoom(playerId, room.id);
    await draining;
    expect(drained).toBe(true);
    expect(await metricsService.getMetrics()).toContain("gi_rooms_active 0");
  } finally {
    if (roomsService.currentRoom(playerId))
      roomsService.deleteRoom(playerId, room.id);
    vi.clearAllTimers();
    await shutdownServices();
  }
});
