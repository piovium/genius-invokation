// Copyright (C) 2025 Guyutongxue
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

import { ref, setup, Character, CombatStatus, State, Card, $ } from "#test";
import { test } from "vitest";
import {
  CoolingTreatment,
  Mualani,
  SurfsharkWavebreaker,
} from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import {
  AbundantPhlogiston,
  AbundantPhlogistonInEffect,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  GoGoTurboTwirly,
  Kachina,
} from "@gi-tcg/data/internal/characters/geo/kachina.gts";
import { expect } from "vitest";

test("abundant phlogiston: mualani", async () => {
  const firstOpp = ref();
  const secondOpp = ref();
  const c = setup(
    <State>
      <Character my def={Mualani} />
      <Card my def={AbundantPhlogiston} />
      <Character opp active ref={firstOpp} />
      <Character opp ref={secondOpp} />
    </State>,
  );
  await c.me.skill(SurfsharkWavebreaker);
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.card(AbundantPhlogiston);
  await c.me.skill(CoolingTreatment);
  await c.opp.switch(firstOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.end();
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toNotExist();
});

test("abundant phlogiston: the in-effect status only lasts for the round it is played", async () => {
  // 规则集：燃素充盈 生成【燃素充盈】；燃素充盈（出战状态）本回合我方角色消耗夜魂后：
  // 若消耗值至少为1->该角色获得1点夜魂值
  // 断言：打出后生成该出战状态；本回合结束即被弃置，下回合的夜魂消耗不再返还
  const secondOpp = ref();
  const c = setup(
    <State>
      <Character my active def={Mualani} />
      <Card my def={AbundantPhlogiston} />
      <Character opp active />
      <Character opp ref={secondOpp} />
    </State>,
  );
  await c.me.skill(SurfsharkWavebreaker);
  await c.opp.end();
  await c.me.card(AbundantPhlogiston);
  c.expect($.my.combatStatus.def(AbundantPhlogistonInEffect)).toBeExist();
  await c.me.end();
  c.expect($.my.combatStatus.def(AbundantPhlogistonInEffect)).toNotExist();
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
});

test("abundant phlogiston: usage 1, only the first nightsoul consumption is refunded", async () => {
  // 规则集：燃素充盈 出战状态 本回合我方角色消耗夜魂后：若消耗值至少为1->该角色获得1点夜魂值 可用次数：1
  // 断言：同一回合内第一次消耗被返还（夜魂值不变），第二次消耗不再返还
  const firstOpp = ref();
  const secondOpp = ref();
  const c = setup(
    <State>
      <Character my active def={Mualani} />
      <CombatStatus my def={AbundantPhlogistonInEffect} />
      <Character opp active ref={firstOpp} />
      <Character opp ref={secondOpp} />
    </State>,
  );
  await c.me.skill(SurfsharkWavebreaker);
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 2,
  });
  c.expect($.my.combatStatus.def(AbundantPhlogistonInEffect)).toNotExist();
  await c.me.end();
  await c.opp.switch(firstOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
});

test("abundant phlogiston: the refunded nightsoul goes to the character that consumed it", async () => {
  // 规则集：燃素充盈（出战状态）本回合我方角色消耗夜魂后：
  // 若消耗值至少为1->该角色获得1点夜魂值
  // 断言：卡齐娜切换至后台时消耗 1 点夜魂值，返还的 1 点归消耗者（此时已是后台角色）
  const kachina = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character my active def={Kachina} ref={kachina} />
      <Character my ref={other} />
      <CombatStatus my def={AbundantPhlogistonInEffect} />
      <Character opp active />
    </State>,
  );
  await c.me.skill(GoGoTurboTwirly);
  await c.opp.end();
  await c.me.switch(other);
  c.expect($.my.active).toBe(other);
  // 出战状态已被消耗，证明切换确实触发了夜魂消耗与返还
  c.expect($.my.combatStatus.def(AbundantPhlogistonInEffect)).toNotExist();
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kachina.id)),
  ).toHaveVariable({ nightsoul: 2 });
});
