import { CURRENT_VERSION } from "@gi-tcg/core";
import type { PlayerInfo, RoomConfig } from "./types";

/** Room timeouts short enough to test, with the room's own switches overridable. */
export function testRoomConfig(
  overrides: Partial<RoomConfig> = {},
): RoomConfig {
  return {
    initTotalActionTime: 45,
    rerollTime: 40,
    roundTotalActionTime: 60,
    actionTime: 25,
    gameVersion: CURRENT_VERSION,
    watchable: false,
    private: true,
    allowGuest: true,
    ...overrides,
  };
}

/** The guest the room tests seat: no cards, so the engine needs no card data. */
export function guestPlayerInfo(id: string, name = id): PlayerInfo {
  return { isGuest: true, id, name, deck: { characters: [], cards: [] } };
}
