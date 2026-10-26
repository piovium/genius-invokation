import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { Game, CURRENT_VERSION } from "@gi-tcg/core";
import { firstValueFrom, filter } from "rxjs";
import { Hono } from "hono";

const deck = { characters: [1101, 1201, 1301], cards: Array(30).fill(332001) };

vi.mock("../services", async () => {
  const { ProfilesService } = await import("../profiles/profiles.service");
  return {
    profilesService: new ProfilesService(),
    redisService: null,
    usersService: {
      findById: vi.fn(async (id) => ({ id, name: `Player ${id}` })),
    },
    decksService: {
      getDeck: vi.fn(async () => ({
        characters: [1101, 1201, 1301],
        cards: Array(30).fill(332001),
      })),
    },
    gamesService: { addGame: vi.fn(async () => ({})) },
    metricsService: {
      incrementCreatedRooms: vi.fn(),
      incrementFinishedRooms: vi.fn(),
      incrementStartedRooms: vi.fn(),
    },
  };
});
vi.mock("../utils", () => ({
  createGuestId: () => `guest-${Math.random()}`,
  verifyDeck: vi.fn(async () => "v3.3.0"),
  DeckVerificationError: class extends Error {},
}));

import { profilesService, gamesService } from "../services";
import { verifyDeck } from "../utils";
import { RoomsService } from "./rooms.service";
import { AppController } from "../app.controller";
import { handleError } from "../errors";
import type { Profile, ProfileSummary } from "../profiles/types";

beforeAll(() => profilesService.onModuleInit());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("profile endpoints round-trip namespaced IDs, assets and hash", async () => {
  const api = new Hono().onError(handleError).route("/", AppController);
  const list = (await (await api.request("/profiles")).json()) as ReturnType<
    typeof profilesService.list
  >;
  expect(list.defaultProfileId).toBe(`official/${CURRENT_VERSION}`);
  const summary = list.profiles.find((p) => p.id === "piovium/lianyu-s1")!;
  const response = await api.request(
    `/profile/${encodeURIComponent(summary.id)}`,
  );
  expect(response.status).toBe(200);
  const detail = (await response.json()) as Profile & ProfileSummary;
  expect(detail.profileHash).toBe(summary.profileHash);
  expect(detail.assets.officialDeckCompatible).toBe(true);
  expect((await api.request("/profile/unknown%2Fid")).status).toBe(404);
});

test("rooms default to latest and enforce requiredVersion against the selected base", async () => {
  vi.useFakeTimers();
  const rooms = new RoomsService();
  const { room } = await rooms.createRoomFromGuest({ name: "Host", deck });
  expect(room.profile.id).toBe(`official/${CURRENT_VERSION}`);
  expect(room.profile.baseVersion).toBe(CURRENT_VERSION);
  vi.mocked(verifyDeck).mockResolvedValueOnce(CURRENT_VERSION);
  await expect(
    rooms.createRoomFromGuest({
      name: "Host",
      deck,
      profileId: "official/v3.3.0",
    }),
  ).rejects.toThrow("higher game version");
  const oldRoom = await rooms.createRoomFromGuest({
    name: "Host",
    deck,
    profileId: "official/v3.3.0",
  });
  vi.mocked(verifyDeck).mockResolvedValueOnce(CURRENT_VERSION);
  await expect(
    rooms.joinRoomFromGuest(oldRoom.room.id, { name: "Guest", deck }),
  ).rejects.toThrow("higher game version");
  await expect(
    rooms.createRoomFromGuest({ name: "Host", deck, profileId: "unknown/id" }),
  ).rejects.toThrow("not found");
});

test("game state, player/spectator SSE and archives retain the selected Profile", async () => {
  vi.useFakeTimers();
  const rooms = new RoomsService();
  const initialState = vi.spyOn(Game, "createInitialState");
  vi.spyOn(Game.prototype, "start").mockImplementation(async function (
    this: Game,
  ) {
    await this.onPause?.(this.state, [], false);
    return null;
  });
  const { room } = await rooms.createRoomFromUser(1, {
    hostDeckId: 1,
    profileId: "piovium/moyu-s7",
    randomSeed: 123,
    hostFirst: true,
    watchable: true,
  });
  await rooms.joinRoomFromUser(2, room.id, 2);
  const compiled = profilesService.get("piovium/moyu-s7");
  expect(initialState.mock.calls[0]![0]).toMatchObject({
    ...compiled.profile.gameConfig,
    randomSeed: 123,
    hostWho: 0,
    hostRelatedExecution: true,
    versionBehavior: compiled.profile.versionBehavior,
  });
  expect(initialState.mock.calls[0]![0].data).toBe(compiled.data);
  for (const visitor of [1, null]) {
    const event = await firstValueFrom(
      rooms
        .playerNotification(room.id, visitor, 1)
        .pipe(filter(({ data }) => data.type === "initialized")),
    );
    expect(event.data).toMatchObject({ profile: room.profile });
  }
  await vi.waitFor(() => expect(gamesService.addGame).toHaveBeenCalled());
  const archive = vi.mocked(gamesService.addGame).mock.calls.at(-1)![0];
  expect(archive.gameVersion).toBe("piovium/moyu-s7");
  expect(archive.profile).toEqual(compiled.profile);
  const log = JSON.parse(archive.data);
  expect(log.gv).toBe(archive.gameVersion);
  expect(log.profile).toEqual(compiled.profile);
});
