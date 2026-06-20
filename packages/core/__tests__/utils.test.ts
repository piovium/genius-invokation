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

import { test, expect } from "vitest";
import { shuffle, sortDice, computeConvertDice } from "../src/utils";
import { DiceType } from "@gi-tcg/typings";
import { StateSymbol, type PlayerState } from "../src/base/state";
import type { ElementTag } from "../src/base/character";
import { chooseDiceValue } from "@gi-tcg/utils";

const makeCharacter = (id: number, element: ElementTag, alive?: 0 | 1) => ({
  [StateSymbol]: "character",
  id: -id,
  entities: [],
  variables: { alive: alive ?? 1 },
  definition: {
    __definition: "characters",
    id: 1100 + id,
    skills: [],
    tags: [element],
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
});

const makePlayerState = (
  characters: { element: ElementTag; alive?: 0 | 1 }[],
  dice: DiceType[],
): PlayerState => ({
  [StateSymbol]: "player",
  who: 0,
  activeCharacterId: -1,
  characters: [
    ...characters.map((c, index) =>
      makeCharacter(index + 1, c.element, c.alive),
    ),
  ] as any,
  hands: [],
  pile: [],
  initialPile: [],
  dice,
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
});

test("sort dice", () => {
  const dice = [8, 4, 4, 7, 3, 3, 1, 2, 5];
  const shuffled = shuffle(dice);
  const playerState = makePlayerState(
    [
      { element: "electro" },
      { element: "dendro" },
      { element: "pyro", alive: 0 },
    ],
    shuffled as any,
  );
  const sorted = sortDice(playerState, shuffled);
  // 测试基本顺序和有效骰定义
  expect(sorted).toEqual(dice);
});

test("convert dice", () => {
  const dice = [8, 4, 4, 7, 3, 3, 1, 2, 5];
  const shuffled = shuffle(dice);
  const playerState = makePlayerState(
    [
      { element: "electro" },
      { element: "dendro" },
      { element: "pyro", alive: 0 },
    ],
    shuffled as any,
  );
  // 测试基本顺序
  expect(computeConvertDice(playerState, DiceType.Geo, 1)).toEqual([
    8, 4, 4, 7, 3, 3, 2, 5, 6,
  ]);
  // 测试目标保护
  expect(computeConvertDice(playerState, DiceType.Anemo, 3)).toEqual([
    8, 4, 4, 7, 5, 5, 5, 5, 3,
  ]);
});

test("auto select dice", () => {
  // 2同色 无效
  expect(
    chooseDiceValue(
      new Map([[DiceType.Aligned, 2]]),
      [8, 4, 4, 7, 6, 6, 6, 3, 3, 1, 2, 5],
      new Set([4, 7]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([3, 3]);
  // 2同色 后台
  expect(
    chooseDiceValue(
      new Map([[DiceType.Aligned, 2]]),
      [4, 4, 7, 7, 7, 3, 1],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([7, 7]);
  // 3同色 前台
  expect(
    chooseDiceValue(
      new Map([[DiceType.Aligned, 3]]),
      [8, 4, 4, 4, 7, 3, 3, 1, 2, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([4, 4, 4]);
  // 3同色 补足
  expect(
    chooseDiceValue(
      new Map([[DiceType.Aligned, 3]]),
      [8, 8, 4, 4, 7, 6, 3, 3, 1, 2, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([1, 8, 8]);
  // 3指定 万能
  expect(
    chooseDiceValue(
      new Map([[DiceType.Cryo, 3]]),
      [8, 8, 8, 4, 4, 7, 6, 3, 3, 2, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([8, 8, 8]);
  // 1雷2杂
  expect(
    chooseDiceValue(
      new Map<DiceType, number>([
        [DiceType.Electro, 1],
        [DiceType.Void, 2],
      ]),
      [3, 3, 4],
      new Set([3]),
      new Set([3]),
      new Set(),
    ),
  ).toEqual([4, 3, 3]);
  // 3杂
  expect(
    chooseDiceValue(
      new Map([[DiceType.Void, 3]]),
      [8, 8, 4, 4, 7, 3, 3, 1, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([1, 5, 7]);
  // 0
  expect(
    chooseDiceValue(
      new Map(),
      [8, 8, 4, 4, 7, 3, 3, 1, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([]);
});

test("auto select dice unable to pay", () => {
  // 3同色 不足
  expect(
    chooseDiceValue(
      new Map([[DiceType.Aligned, 3]]),
      [8, 4, 7, 3, 1, 2],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([]);
  // 3指定 不足
  expect(
    chooseDiceValue(
      new Map([[DiceType.Cryo, 3]]),
      [8, 4, 4, 3, 3, 1, 2],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([]);
  // 3杂 不足
  expect(
    chooseDiceValue(
      new Map([[DiceType.Void, 3]]),
      [8, 5],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set(),
    ),
  ).toEqual([]);
  // 调和 不足
  expect(
    chooseDiceValue(
      new Map([[DiceType.Void, 1]]),
      [8, 8, 4, 4],
      new Set([4, 7, 3]),
      new Set([4]),
      new Set([8, 4]),
    ),
  ).toEqual([]);
});
