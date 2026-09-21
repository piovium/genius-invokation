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

import {
  $,
  Card,
  Character,
  CombatStatus,
  DiceCount,
  setup,
  State,
  Support,
} from "#test";
import { ElementalTransfigurationSuperconductBlessing as SuperconductBlessing } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { FlowerfeatherClan } from "@gi-tcg/data/internal/cards/support/place.gts";
import { PassingOfJudgmentInEffect } from "@gi-tcg/data/internal/cards/event/legend.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Chongyun } from "@gi-tcg/data/internal/characters/cryo/chongyun.gts";
import { Diona } from "@gi-tcg/data/internal/characters/cryo/diona.gts";
import { Fischl } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 元素幻变：超导祝佑（冰、雷）。队伍 凯亚+重云+菲谢尔 恰好只含冰、雷。
// phase="action" + prevPhase="roll" 使引擎在 start 时直接触发「行动阶段开始时」。

const D = DiceType;
const count = (dice: readonly DiceType[], type: DiceType) =>
  dice.filter((d) => d === type).length;
const fill = (type: DiceType, n: number): DiceType[] =>
  Array.from({ length: n }, () => type);

test("elemental transmutation: from pile at action phase start, draw, discard, copy to support, convert 2+2 dice", async () => {
  // 规则集：（牌库，手牌生效）行动阶段开始时：若队伍包含且仅包含元素幻变指定的所有元素->从牌库抓取此牌；舍弃手牌所有同名牌->在支援区生成复制，依次对每个指定元素执行：将2个骰子转化为该元素
  // 断言：牌库、手牌均无此牌，支援区出现 1 张复制，8 火 -> 4 火 2 冰 2 雷
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my pile def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[0].pile).toBeArrayOfSize(0);
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(1);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(4);
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
});

test("elemental transmutation: also activates from hand", async () => {
  // 规则集：（牌库，手牌生效）行动阶段开始时……舍弃手牌所有同名牌->在支援区生成复制
  // 断言：手牌中的幻变同样发动
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(1);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(4);
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
});

test("elemental transmutation: not activated when team contains an extra element", async () => {
  // 规则集：若队伍包含且仅包含元素幻变指定的所有元素
  // 断言：冰+雷+火 队伍不发动，牌留在手牌、无支援、骰子不变
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Fischl} />
      <Character my def={Diluc} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.support.def(SuperconductBlessing)).toNotExist();
  expect(count(c.state.players[0].dice, D.Pyro)).toBe(8);
});

test("elemental transmutation: not activated when team lacks one specified element", async () => {
  // 规则集：若队伍包含且仅包含元素幻变指定的所有元素
  // 断言：纯冰队伍缺少雷，不发动
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Diona} />
      <Card my pile def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[0].pile).toBeArrayOfSize(1);
  c.expect($.my.support.def(SuperconductBlessing)).toNotExist();
  expect(count(c.state.players[0].dice, D.Pyro)).toBe(8);
});

test("elemental transmutation: from pile, enters hand first so the discard is a hand discard", async () => {
  // 规则集：从牌库发动的场合，先进手牌区再进支援区
  // 断言：裁定之时（敌方舍弃手牌后：将其 2 张费用最高手牌置入牌库底）被触发，说明舍弃发生在手牌区
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <CombatStatus my def={PassingOfJudgmentInEffect} />
      <Card my pile def={SuperconductBlessing} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(1);
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[0].pile).toBeArrayOfSize(2);
});

test("elemental transmutation: with full hand, drawn card is disposed and nothing else resolves", async () => {
  // 规则集：如果满手牌时发动，则抽取后会弃置，后续效果不结算。
  // 断言：手牌仍 10 张、牌库空、无支援复制、骰子不转化；后续的舍弃也不结算（花羽会计数不增加）
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Support my def={FlowerfeatherClan} v={{ disposedCardCount: 0 }} />
      <Card my pile def={SuperconductBlessing} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(10);
  expect(c.state.players[0].pile).toBeArrayOfSize(0);
  c.expect($.my.support.def(SuperconductBlessing)).toNotExist();
  c.expect($.my.support.def(FlowerfeatherClan)).toHaveVariable({
    disposedCardCount: 0,
  });
  expect(count(c.state.players[0].dice, D.Pyro)).toBe(8);
});

test("elemental transmutation: with full support zone, dice are still converted", async () => {
  // 规则集：支援区已满的场合，也能执行转化效果
  // 断言：支援区仍为 4 张派蒙、无复制，但 8 火 -> 4 火 2 冰 2 雷
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  c.expect($.my.support.def(SuperconductBlessing)).toNotExist();
  expect(c.state.players[0].supports).toBeArrayOfSize(4);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(4);
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
});

test("elemental transmutation: multiple copies in hand are all discarded", async () => {
  // 规则集：多张元素幻变的场合，1次发动会弃置所有幻变
  // 断言：手牌 2 张同名幻变全部离开手牌
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
});

test.fails("elemental transmutation: multiple copies in hand resolve as a single activation", async () => {
  // 规则集：多张元素幻变的场合，1次发动会弃置所有幻变（舍弃手牌所有同名牌->在支援区生成复制）；
  // 当前引擎：每张同名幻变各自发动一次，只舍弃自身，生成 2 张复制并转化两次（8 火 -> 4 冰 4 雷）
  // 断言：仅生成 1 张复制、仅转化一次（8 火 -> 4 火 2 冰 2 雷）
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(1);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(4);
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
});

test("elemental transmutation: multiple copies in pile activate one after another", async () => {
  // 规则集：多张元素幻变在牌库也能依次发动
  // 断言：牌库 2 张依次抓取并发动，生成 2 张复制，转化两次（8 火 -> 4 冰 4 雷）
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my pile def={SuperconductBlessing} />
      <Card my pile def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[0].pile).toBeArrayOfSize(0);
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(2);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(0);
  expect(count(dice, D.Cryo)).toBe(4);
  expect(count(dice, D.Electro)).toBe(4);
});

test("elemental transmutation: 6 Electro + 2 Geo -> 8 Electro (Cryo converted first, then Electro)", async () => {
  // 规则集：例如：6雷2岩的场合，先将两岩转化为冰，再将2冰转化为雷，最终8雷
  // 断言：最终 8 雷（若先雷后冰则会得到 6 雷 2 冰）
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my dice={[...fill(D.Electro, 6), ...fill(D.Geo, 2)]} />
    </State>,
  );
  await c.stepToNextAction();
  expect(count(c.state.players[0].dice, D.Electro)).toBe(8);
});

test("elemental transmutation: conversion picks non-effective dice first, then the color with fewer dice", async () => {
  // 规则集：具体规则同礼帽（见转化规则）：非有效骰优先于有效骰；同色数量少优先于同色数量多
  // 断言：2 冰 2 岩 4 火：冰步转 2 岩（非有效且更少），雷步转 2 火（非有效） -> 4 冰 2 火 2 雷
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <DiceCount
        my
        dice={[...fill(D.Cryo, 2), ...fill(D.Geo, 2), ...fill(D.Pyro, 4)]}
      />
    </State>,
  );
  await c.stepToNextAction();
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Cryo)).toBe(4);
  expect(count(dice, D.Pyro)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
  expect(count(dice, D.Geo)).toBe(0);
});

test.fails("elemental transmutation: equal-count tie-break follows Cryo/Hydro/Pyro/Electro/Geo/Dendro/Anemo order", async () => {
  // 规则集：按冰水火雷岩草风的顺序……具体规则同礼帽（转化序：冰水火雷岩草风）；
  // 当前引擎：同数量时按 DiceType 枚举值（冰水火雷风岩草）选择，风先于岩、草 -> 2 冰 2 草 4 雷
  // 断言：2 岩 2 草 2 风 2 雷：冰步转岩，雷步转草 -> 2 冰 2 风 4 雷
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <DiceCount
        my
        dice={[
          ...fill(D.Geo, 2),
          ...fill(D.Dendro, 2),
          ...fill(D.Anemo, 2),
          ...fill(D.Electro, 2),
        ]}
      />
    </State>,
  );
  await c.stepToNextAction();
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(4);
  expect(count(dice, D.Anemo)).toBe(2);
  expect(count(dice, D.Geo)).toBe(0);
  expect(count(dice, D.Dendro)).toBe(0);
});

test("elemental transmutation: omni dice are never converted", async () => {
  // 规则集：万能骰不能转化为非万能骰
  // 断言：2 万能 6 雷：冰步只能转雷为冰，雷步再把冰转回雷，万能数量不变
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my dice={[...fill(D.Omni, 2), ...fill(D.Electro, 6)]} />
    </State>,
  );
  await c.stepToNextAction();
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Omni)).toBe(2);
  expect(count(dice, D.Electro)).toBe(6);
  expect(count(dice, D.Cryo)).toBe(0);
});

test("elemental transmutation: activation counts as a discard effect", async () => {
  // 规则集：是【舍弃】效果
  // 断言：花羽会「我方舍弃卡牌」计数 +1
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Support my def={FlowerfeatherClan} v={{ disposedCardCount: 0 }} />
      <Card my def={SuperconductBlessing} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.support.def(FlowerfeatherClan)).toHaveVariable({
    disposedCardCount: 1,
  });
});
