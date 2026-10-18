import console from "node:console";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const lifecycle = vi.hoisted(() => ({
  initializeServices: vi.fn(),
  shutdownServices: vi.fn(),
  roomsService: { waitForShutdown: vi.fn() },
  frontend: vi.fn(),
}));
vi.mock("./services", () => lifecycle);
vi.mock("./frontend", () => ({ frontend: lifecycle.frontend }));
vi.mock("./app.module", async () => {
  const { Hono } = await import("hono");
  return { AppModule: new Hono().get("/", (c) => c.text("ok")) };
});
import { startServer } from "./main";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", "startup-test");
  vi.stubEnv("PORT", "0");
  lifecycle.initializeServices.mockResolvedValue(undefined);
  lifecycle.shutdownServices.mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

it("keeps serving during room drain, then closes the listener and services once", async () => {
  const drained = Promise.withResolvers<void>();
  lifecycle.roomsService.waitForShutdown.mockReturnValue(drained.promise);
  const { server, shutdown } = await startServer();
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Expected TCP listener");
    expect("keepAliveTimeout" in server && server.keepAliveTimeout).toBe(65000);
    expect("requestTimeout" in server && server.requestTimeout).toBe(0);
    const stopping = shutdown();
    expect(shutdown()).toBe(stopping);
    expect(lifecycle.shutdownServices).not.toHaveBeenCalled();
    expect(await (await fetch(`http://[::1]:${address.port}/`)).text()).toBe(
      "ok",
    );
    drained.resolve();
    await stopping;
    expect(server.listening).toBe(false);
    expect(lifecycle.shutdownServices).toHaveBeenCalledOnce();
    expect(lifecycle.roomsService.waitForShutdown).toHaveBeenCalledOnce();
  } finally {
    drained.resolve();
    if ("closeAllConnections" in server) server.closeAllConnections();
    await shutdown();
  }
});

it.each(["initializeServices", "frontend"] as const)(
  "cleans up when %s fails before listening",
  async (step) => {
    const failure = new Error("startup failure");
    lifecycle[step].mockRejectedValue(failure);
    await expect(startServer()).rejects.toBe(failure);
    expect(lifecycle.shutdownServices).toHaveBeenCalledOnce();
    expect(lifecycle.roomsService.waitForShutdown).not.toHaveBeenCalled();
  },
);
