import { expect, test } from "vitest";
import {
  SelectOptionDoneEM,
  SelectOptionRequest,
  SelectOptionUiType,
} from "@gi-tcg/typings";
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


test.each([undefined, SelectOptionUiType.OPTION, SelectOptionUiType.CARD_FACE])(
  "preserves optional per-option UI type %s through the protocol",
  (uiType) => {
    const request = {
      prompt: "Choose",
      options: [{ key: "one", text: "One", uiType }],
    };
    expect(
      SelectOptionRequest.decode(SelectOptionRequest.encode(request).finish()),
    ).toEqual(request);
    const notification = { who: 0, selectedUiType: uiType };
    expect(
      SelectOptionDoneEM.decode(SelectOptionDoneEM.encode(notification).finish()),
    ).toEqual(notification);
  },
);

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
