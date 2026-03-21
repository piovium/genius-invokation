// Copyright (C) 2024-2025 Guyutongxue
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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { test, expect } from "bun:test";
import { shuffle, sortDice } from "../src/utils";
import { DiceType } from "@gi-tcg/typings";
import { StateSymbol, type PlayerState } from "../src/base/state";

test("sort dice", () => {
  const dice = [
    DiceType.Omni,
    DiceType.Electro,
    DiceType.Electro,
    DiceType.Dendro,
    DiceType.Pyro,
    DiceType.Pyro,
    DiceType.Cryo,
    DiceType.Hydro,
    DiceType.Anemo,
  ];
  const shuffled = shuffle(dice);
  // 草和雷是出战角色的骰子（有效骰）
  const playerState: PlayerState = {
    [StateSymbol]: "player",
    who: 0,
    activeCharacterId: -1,
    characters: [
      {
        [StateSymbol]: "character",
        id: -1,
        entities: [],
        variables: {} as never,
        definition: {
          __definition: "characters",
          id: 1601,
          skills: [],
          tags: ["dendro"],
          type: "character",
          varConfigs: {} as never,
          version: {
            from: "official",
            value: {
              predicate: "until",
              version: "v3.3.0",
            },
          },
          associatedNightsoulsBlessing: null,
          specialEnergy: null,
          enabledLunarReactions: [],
        },
      },
      {
        [StateSymbol]: "character",
        id: -2,
        entities: [],
        variables: {} as never,
        definition: {
          __definition: "characters",
          id: 1401,
          skills: [],
          tags: ["electro"],
          type: "character",
          varConfigs: {} as never,
          version: {
            from: "official",
            value: {
              predicate: "until",
              version: "v3.3.0",
            },
          },
          associatedNightsoulsBlessing: null,
          specialEnergy: null,
          enabledLunarReactions: [],
        },
      },
    ],
    hands: [],
    pile: [],
    initialPile: [],
    dice: shuffled,
    summons: [],
    supports: [],
    combatStatuses: [],
    canCharged: false,
    canPlunging: false,
    declaredEnd: false,
    skipNextTurn: false,
    hasDefeated: false,
    legendUsed: false,
    defeatedSwitching: false,
    removedEntities: [],
    roundSkillLog: new Map(),
    phaseDamageLog: [],
    phaseReactionLog: [],
  };
  const sorted = sortDice(playerState, shuffled);
  expect(sorted).toEqual(dice);
});
