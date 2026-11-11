import { expect, test } from "vitest";
import {
  SelectOptionDoneEM,
  SelectOptionRequest,
  SelectOptionType,
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

test.each([
  SelectOptionType.NONE,
  SelectOptionType.CARD_FACE,
  SelectOptionType.ICON,
])("preserves option presentation through RPC encoding for type %s", (type) => {
  const request = {
    prompt: "Choose",
    type,
    options: [
      { key: "image", text: "", imageId: 1101, title: "Character" },
      { key: "text", text: "Text only" },
      { key: "auto", imageId: 1101 },
      { key: "empty", imageId: 1101, title: "", text: "" },
      { key: "fallback" },
    ],
  };
  expect(
    SelectOptionRequest.decode(SelectOptionRequest.encode(request).finish()),
  ).toEqual(request);
});

test.each([
  { who: 1 },
  { who: 0, selectedImageType: SelectOptionType.NONE },
  {
    who: 0,
    selectedImageId: 332001,
    selectedImageType: SelectOptionType.CARD_FACE,
    selectedTitle: "",
    selectedText: "",
  },
  {
    who: 0,
    selectedImageId: 112011,
    selectedImageType: SelectOptionType.ICON,
    selectedTitle: "Title",
    selectedText: "Text",
  },
])("preserves selected option notification fields %j", (notification) => {
  expect(
    SelectOptionDoneEM.decode(SelectOptionDoneEM.encode(notification).finish()),
  ).toEqual(notification);
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
