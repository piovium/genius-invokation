import { expect, test } from "vitest";
import { verifyRpcResponse } from "../src/io";
import { StateMutator } from "../src/mutator";
import { Game } from "../src/game";
import { GiTcgIoNotProvideError } from "../src/error";

test.each([
  null,
  {},
  { selectedIndex: "0" },
  { selectedIndex: 0.5 },
  { selectedIndex: Number.NaN },
  { selectedIndex: Number.POSITIVE_INFINITY },
])("rejects malformed selectOption response %j", (response) => {
  expect(() => verifyRpcResponse("selectOption", response)).toThrow();
});

test("accepts an integer option index", () => {
  expect(() =>
    verifyRpcResponse("selectOption", { selectedIndex: 0 }),
  ).not.toThrow();
});

test("option selection stops previews without interaction IO", async () => {
  const state = Game.createInitialState({
    decks: [
      { characters: [], cards: [] },
      { characters: [], cards: [] },
    ],
    data: {
      characters: new Map(),
      entities: new Map(),
      attachments: new Map(),
      extensions: new Map(),
    },
  });
  const mutator = new StateMutator(state, {
    onNotify: () => {},
    onPause: async () => {},
  });
  await expect(
    mutator.selectOption(0, "Choose", [{ key: "one", text: "One" }]),
  ).rejects.toBeInstanceOf(GiTcgIoNotProvideError);
});
