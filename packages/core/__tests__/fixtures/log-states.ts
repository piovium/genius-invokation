import { Game } from "../../src/game";
import type { ExtensionDefinition } from "../../src/base/extension";
import type { GameData } from "../../src/data";
import type { GameStateLogEntry } from "../../src/log";

/** Stable input for the pre-migration replay encoding golden. */
export function logStates(): { entries: GameStateLogEntry[]; data: GameData } {
  const shared = { label: "shared", count: 42 };
  const definition: ExtensionDefinition = {
    __definition: "extensions",
    type: "extension",
    id: 91000003,
    version: {
      from: "official",
      value: { predicate: "since", version: "v3.3.0" },
    },
    description: "Replay compatibility fixture",
    schema: {},
    skills: [],
    initialState: {
      shared,
      list: [shared, shared],
      singleton: [shared],
      empty: [],
      map: new Map([[shared, "value"]]),
      set: new Set([shared]),
    },
  };
  const data = {
    characters: new Map(),
    entities: new Map(),
    attachments: new Map(),
    extensions: new Map([[definition.id, definition]]),
  };
  const startingState = Game.createInitialState({
    decks: [
      { characters: [], cards: [] },
      { characters: [], cards: [] },
    ],
    data,
    randomSeed: 20260910,
    versionBehavior: "v3.3.0",
  });
  const actionState = {
    ...startingState,
    roundNumber: 1,
    phase: "action" as const,
  };
  const gameEndState = {
    ...actionState,
    roundNumber: 2,
    winner: 0 as const,
    phase: "gameEnd" as const,
  };
  const entries: GameStateLogEntry[] = [
    { state: startingState, canResume: false },
    { state: actionState, canResume: true },
    { state: gameEndState, canResume: false },
  ];
  return { entries, data };
}
