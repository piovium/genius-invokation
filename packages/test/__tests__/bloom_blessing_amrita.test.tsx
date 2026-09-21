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

import { Card, Character, ref, setup, State, Support } from "#test";
import {
  ElementalResonanceWovenIce,
  ElementalResonanceWovenThunder,
  ElementalResonanceWovenWaters,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { BloomBlessingAmrita } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("bloom blessing amrita: fixes 2 hydro and 2 dendro dice on roll phase", async () => {
  // 规则集：绽放祝佑·甘露 投掷阶段：将2个骰子设为水元素，将2个骰子设为草元素
  const c = setup(
    <State>
      <Support my def={BloomBlessingAmrita} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  const dice = c.state.players[0].dice;
  expect(dice.filter((d) => d === DiceType.Hydro)).toBeArrayOfSize(2);
  expect(dice.filter((d) => d === DiceType.Dendro)).toBeArrayOfSize(2);
});

test("bloom blessing amrita: the 2nd card play grants 2 max health to the most injured", async () => {
  // 规则集：我方使用不为【绽放祝佑·甘露】的卡牌后：获得1层【祝】，然后若【祝】层数为2，我方受伤最多的角色获得2点最大生命值
  const kaeya = ref();
  const c = setup(
    <State>
      <Support my def={BloomBlessingAmrita} />
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya} health={3} />
      <Character my def={Sucrose} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={ElementalResonanceWovenIce} />
    </State>,
  );
  // 第 1 张：【祝】1 层，不触发
  await c.me.card(ElementalResonanceWovenThunder);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  // 第 2 张：【祝】2 层，受伤最多的凯亚 +2 最大生命值
  await c.me.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
});

test("bloom blessing amrita: stacks are cleared at end phase", async () => {
  // 规则集：结束阶段：【祝】层数置为0
  const kaeya = ref();
  const c = setup(
    <State>
      <Support my def={BloomBlessingAmrita} />
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya} health={3} />
      <Character my def={Sucrose} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={ElementalResonanceWovenIce} />
      <Card my def={ElementalResonanceWovenWaters} />
    </State>,
  );
  // 本回合打出 1 张
  await c.me.card(ElementalResonanceWovenThunder);
  await c.me.end();
  await c.opp.end();
  // 层数已清零，下回合第 1 张牌不触发
  await c.me.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  // 下回合第 2 张牌才触发
  await c.me.card(ElementalResonanceWovenWaters);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
});

test("bloom blessing amrita: a second amrita does not count for the first one", async () => {
  // 规则集：注：使用第二张【绽放祝佑·甘露】不能为第一张计数
  const kaeya = ref();
  const c = setup(
    <State>
      <Support my def={BloomBlessingAmrita} />
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya} health={3} />
      <Character my def={Sucrose} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={BloomBlessingAmrita} />
      <Card my def={ElementalResonanceWovenIce} />
    </State>,
  );
  // 第 1 张（交织之雷）：【祝】1 层
  await c.me.card(ElementalResonanceWovenThunder);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  // 第二张【甘露】不为第一张计数：层数仍为 1，不触发
  await c.me.card(BloomBlessingAmrita);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  // 再打一张普通牌才凑满 2 层并触发，说明【甘露】那一张确实被跳过而非效果失效
  await c.me.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
});

test("bloom blessing amrita: opponent card plays do not count", async () => {
  // 规则集：我方使用不为【绽放祝佑·甘露】的卡牌后：获得1层【祝】……
  const kaeya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Support my def={BloomBlessingAmrita} />
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya} health={3} />
      <Character my def={Sucrose} />
      <Card opp def={ElementalResonanceWovenThunder} />
      <Card opp def={ElementalResonanceWovenIce} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={ElementalResonanceWovenIce} />
    </State>,
  );
  // 对方打出 2 张牌，不为我方【祝】计数
  await c.opp.card(ElementalResonanceWovenThunder);
  await c.opp.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  await c.opp.end();
  // 我方自己打出的第 1 张仍只是 1 层；第 2 张才触发
  await c.me.card(ElementalResonanceWovenThunder);
  c.expect(kaeya).toHaveVariable({ maxHealth: 10 });
  await c.me.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
});

test("bloom blessing amrita: only the 2nd card triggers, not the 3rd", async () => {
  // 规则集：……获得1层【祝】，然后若【祝】层数为2，我方受伤最多的角色获得2点最大生命值
  // 「层数为2」是精确条件：同一回合内第 3 张牌不再触发
  const kaeya = ref();
  const c = setup(
    <State>
      <Support my def={BloomBlessingAmrita} />
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya} health={3} />
      <Character my def={Sucrose} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={ElementalResonanceWovenIce} />
      <Card my def={ElementalResonanceWovenWaters} />
    </State>,
  );
  await c.me.card(ElementalResonanceWovenThunder);
  await c.me.card(ElementalResonanceWovenIce);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
  await c.me.card(ElementalResonanceWovenWaters);
  c.expect(kaeya).toHaveVariable({ maxHealth: 12 });
});
