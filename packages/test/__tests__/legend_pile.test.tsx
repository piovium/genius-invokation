// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Game } from "@gi-tcg/core";
import getData from "@gi-tcg/data";
import { test, expect } from "vitest";

const CHARACTER_IDS = [1301, 1103, 1501];

const NON_LEGEND_CARD_IDS = [331102, 331202, 331302];

const LEGEND_CARD_IDS = [
  330001,
  330002,
  330008,
  330009,
  330011,
  330012,
  330013,
];

test("initPlayerState moves at most initialHandsCount legend cards to pile top", () => {
  const data = getData();
  const initialHandsCount = 5;
  const deckCards = [...NON_LEGEND_CARD_IDS, ...LEGEND_CARD_IDS];
  expect(LEGEND_CARD_IDS.length).toBeGreaterThan(initialHandsCount);
  const state = Game.createInitialState({
    data,
    versionBehavior: "v6.6.0",
    initialHandsCount,
    decks: [
      {
        characters: CHARACTER_IDS,
        cards: deckCards,
        noShuffle: true,
      },
      {
        characters: CHARACTER_IDS,
        cards: deckCards,
        noShuffle: true,
      },
    ],
  });
  for (const player of state.players) {
    const pile = player.pile;
    expect(pile).toHaveLength(deckCards.length);
    const topLegends = pile.slice(0, initialHandsCount);
    for (const card of topLegends) {
      expect(card.definition.tags).toContain("legend");
    }
    expect(pile[initialHandsCount].definition.tags).not.toContain("legend");
    const remainingLegendCount = pile
      .slice(initialHandsCount)
      .filter((card) => card.definition.tags.includes("legend")).length;
    expect(remainingLegendCount).toBe(
      LEGEND_CARD_IDS.length - initialHandsCount,
    );
  }
});

test("initPlayerState moves all legend cards to pile top when not exceeding initialHandsCount", () => {
  const data = getData();
  const initialHandsCount = 5;
  const deckCards = [...NON_LEGEND_CARD_IDS, ...LEGEND_CARD_IDS.slice(0, 3)];
  const state = Game.createInitialState({
    data,
    versionBehavior: "v6.6.0",
    initialHandsCount,
    decks: [
      {
        characters: CHARACTER_IDS,
        cards: deckCards,
        noShuffle: true,
      },
      {
        characters: CHARACTER_IDS,
        cards: deckCards,
        noShuffle: true,
      },
    ],
  });
  for (const player of state.players) {
    const pile = player.pile;
    const firstLegendIndex = pile.findIndex((card) =>
      card.definition.tags.includes("legend"),
    );
    const lastLegendIndex = pile.findLastIndex((card) =>
      card.definition.tags.includes("legend"),
    );
    expect(firstLegendIndex).toBe(0);
    const legendCount = pile.filter((card) =>
      card.definition.tags.includes("legend"),
    ).length;
    expect(lastLegendIndex).toBe(legendCount - 1);
  }
});
