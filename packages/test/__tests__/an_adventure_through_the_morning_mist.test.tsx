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
  Attachment,
  Card,
  Character,
  Equipment,
  ref,
  setup,
  State,
  Support,
} from "#test";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import {
  AnAdventureThroughTheMorningMist,
  IHaventLostYet,
  LeaveItToMe,
  Starsigns,
  Strategize,
  TheBestestTravelCompanion,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { ChenyuVale } from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { CostIncrease } from "@gi-tcg/data/internal/commons.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { expect, test } from "vitest";

test("morning mist: puts the 2 cheapest hand cards to pile bottom and draws as many", async () => {
  // 规则集：将至多2张当前元素骰费用最低|入手时间最早的牌置于牌库底，抓等量的牌
  // 手牌费用 1 / 2 / 3，最低的两张（运筹帷幄、星天之兆）置入牌库底，然后抓 2 张
  const c = setup(
    <State>
      <Card my def={AnAdventureThroughTheMorningMist} />
      <Card my def={Strategize} />
      <Card my def={Starsigns} />
      <Card my def={Paimon} />
      <Card my pile def={LeaveItToMe} />
      <Card my pile def={IHaventLostYet} />
      <Card my pile def={TheBestestTravelCompanion} />
    </State>,
  );
  await c.me.card(AnAdventureThroughTheMorningMist);
  // 抓等量的牌：牌库顶两张进入手牌
  c.expect($.my.hand).toBeCount(3);
  c.expect($.my.hand.def(Paimon)).toBeExist();
  c.expect($.my.hand.def(LeaveItToMe)).toBeExist();
  c.expect($.my.hand.def(IHaventLostYet)).toBeExist();
  c.expect($.my.hand.def(Strategize)).toNotExist();
  c.expect($.my.hand.def(Starsigns)).toNotExist();
  // 置于牌库底：两张牌在牌库最后两位（先后顺序见 skipped）
  const pileIds = c.state.players[0].pile.map((card) => card.definition.id);
  expect(pileIds).toBeArrayOfSize(3);
  expect(pileIds[0]).toBe(TheBestestTravelCompanion);
  expect(pileIds.slice(1).toSorted((a, b) => a - b)).toEqual(
    [Strategize, Starsigns].toSorted((a, b) => a - b),
  );
});

test("morning mist: uses the current dice cost, not the original one", async () => {
  // 规则集：将至多2张当前元素骰费用最低……的牌置于牌库底
  // 运筹帷幄原费用 1，被加费 3 后当前费用 4，于是最低的两张变成星天之兆(2)与派蒙(3)
  const c = setup(
    <State>
      <Card my def={AnAdventureThroughTheMorningMist} />
      <Card my def={Strategize}>
        <Attachment def={CostIncrease} layer={3} />
      </Card>
      <Card my def={Starsigns} />
      <Card my def={Paimon} />
      <Card my pile def={LeaveItToMe} />
      <Card my pile def={IHaventLostYet} />
    </State>,
  );
  await c.me.card(AnAdventureThroughTheMorningMist);
  c.expect($.my.hand).toBeCount(3);
  c.expect($.my.hand.def(Strategize)).toBeExist();
  c.expect($.my.hand.def(Starsigns)).toNotExist();
  c.expect($.my.hand.def(Paimon)).toNotExist();
});

test("morning mist: ties are broken by the earliest card in hand", async () => {
  // 规则集：将至多2张当前元素骰费用最低|入手时间最早的牌置于牌库底
  // 三张同费用手牌，取入手时间最早的两张
  const first = ref();
  const second = ref();
  const third = ref();
  const c = setup(
    <State>
      <Card my def={AnAdventureThroughTheMorningMist} />
      <Card my def={Strategize} ref={first} />
      <Card my def={Strategize} ref={second} />
      <Card my def={Strategize} ref={third} />
      <Card my pile def={LeaveItToMe} />
      <Card my pile def={IHaventLostYet} />
    </State>,
  );
  await c.me.card(AnAdventureThroughTheMorningMist);
  const handIds = c.state.players[0].hands.map((card) => card.id);
  expect(handIds).toContain(third.id);
  expect(handIds).not.toContain(first.id);
  expect(handIds).not.toContain(second.id);
});

test("morning mist: at most 2 cards, and draws exactly as many as undrawn", async () => {
  // 规则集：将至多2张……的牌置于牌库底，抓等量的牌
  // 手牌只剩 1 张时只置入 1 张，也只抓 1 张
  const c = setup(
    <State>
      <Card my def={AnAdventureThroughTheMorningMist} />
      <Card my def={Strategize} />
      <Card my pile def={LeaveItToMe} />
      <Card my pile def={IHaventLostYet} />
    </State>,
  );
  await c.me.card(AnAdventureThroughTheMorningMist);
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.hand.def(LeaveItToMe)).toBeExist();
  const pileIds = c.state.players[0].pile.map((card) => card.definition.id);
  expect(pileIds).toEqual([IHaventLostYet, Strategize]);
});

test("morning mist: adventures once after being discarded", async () => {
  // 规则集：此牌被舍弃后：冒险
  // 便携动力锯受伤时舍弃手牌，触发此牌的冒险，使冒险地点经历 +1
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active def={Xinyan}>
        <Equipment def={PortablePowerSaw} />
      </Character>
      <Support my def={ChenyuVale} />
      <Card my def={AnAdventureThroughTheMorningMist} />
    </State>,
  );
  await c.opp.skill(CeremonialBladework);
  // 此牌被舍弃
  c.expect($.my.hand.def(AnAdventureThroughTheMorningMist)).toNotExist();
  // 冒险 1 次：冒险地点的冒险经历从 1 增加到 2
  c.expect($.my.support.def(ChenyuVale)).toHaveVariable({ exp: 2 });
});
