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
  setup,
  Character,
  State,
  Equipment,
  Support,
  Card,
  Status,
  DiceCount,
  $,
} from "#test";
import { OperaEpiclese } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Klee,
  Kaboom,
  ExplosiveSpark,
} from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import {
  BlizzardStrayer,
  GamblersEarrings,
  TenacityOfTheMillelith,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { SkywardHarp } from "@gi-tcg/data/internal/cards/equipment/weapon/bow.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("opera epiclese: only counts equipment on characters", async () => {
  // 我方角色装备费用 2 >= 对方角色装备费用 1，应触发；
  // 对方手牌、牌库中的装备牌（3+3）若被计入则不会触发
  const c1 = setup(
    <State>
      <Character my active>
        <Equipment def={BlizzardStrayer} />
      </Character>
      <Character opp active>
        <Equipment def={GamblersEarrings} />
      </Character>
      <Support my def={OperaEpiclese} />
      <Card my def={GamblersEarrings} />
      <Card my pile def={BlizzardStrayer} />
      <Card opp def={TenacityOfTheMillelith} />
      <Card opp pile def={SkywardHarp} />
    </State>,
  );
  await c1.stepToNextAction();
  expect(c1.state.players[0].dice).toBeArrayOfSize(9);
  expect(
    c1.state.players[0].dice.filter((d) => d === DiceType.Pyro),
  ).toBeArrayOfSize(1);

  // 我方角色装备费用 1 < 对方角色装备费用 2，不应触发；
  // 我方手牌、牌库中的装备牌（3+3）若被计入则会错误触发
  const c2 = setup(
    <State>
      <Character my active>
        <Equipment def={GamblersEarrings} />
      </Character>
      <Character opp active>
        <Equipment def={BlizzardStrayer} />
      </Character>
      <Support my def={OperaEpiclese} />
      <Card my def={TenacityOfTheMillelith} />
      <Card my pile def={SkywardHarp} />
      <Card opp def={GamblersEarrings} />
      <Card opp pile def={BlizzardStrayer} />
    </State>,
  );
  await c2.stepToNextAction();
  expect(c2.state.players[0].dice).toBeArrayOfSize(8);
});

test("opera epiclese: canCharged is set after onBeforeAction", async () => {
  // 我方可莉附属爆裂火花，我方支援区存在欧庇克莱歌剧院（存在可用次数、双方均无其他装备），
  // 初始元素骰为奇数。经过 onBeforeAction 事件后，欧庇克莱歌剧院生成 1 个元素骰，
  // 元素骰总数变为偶数，可莉使用普通攻击，应当视为重击。
  const c = setup(
    <State>
      <Character my active def={Klee}>
        <Status def={ExplosiveSpark} />
      </Character>
      <Character opp active />
      <Support my def={OperaEpiclese} />
      <DiceCount my count={7} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  expect(c.state.players[0].canCharged).toBe(true);

  await c.me.skill(Kaboom);
  // 视为重击：爆裂火花使重击少花费 1 个火元素，故本次普通攻击只消耗 2 个元素骰
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  // 视为重击：爆裂火花使重击伤害 +1，伤害为 1 + 1 = 2
  c.expect($.opp.active).toHaveVariable({ health: 8 });
});
