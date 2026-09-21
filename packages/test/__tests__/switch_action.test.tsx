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
  DeclaredEnd,
  Equipment,
  ref,
  setup,
  State,
  Status,
  Support,
} from "#test";
import {
  Qucusaurus,
  Target,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  ChangingShifts,
  LeaveItToMe,
  Strategize,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { DawnWinery } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  AstableAnemohypostasisCreation6308,
  Sucrose,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  CryoElementalInfusion,
  KamisatoAyaka,
} from "@gi-tcg/data/internal/characters/cryo/kamisato_ayaka.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import { expect, test } from "vitest";

// 「换班时间（生效中）」「交给我吧！（生效中）」为 private 句柄，按定义 id 查询
const CHANGING_SHIFTS_IN_EFFECT = 303202;
const LEAVE_IT_TO_ME_IN_EFFECT = 303206;

// 规则集：切换角色时 元素骰减免：换班时间
// 断言：换班时间使切换少花费 1 骰（8 骰不变），仅减费、仍为战斗行动（轮次交换）
test("switch action: ChangingShifts deducts 1 die, switch remains a combat action", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my ref={target} />
      <Card my def={ChangingShifts} />
    </State>,
  );
  await c.me.card(ChangingShifts);
  c.expect($.my.combatStatus.def(CHANGING_SHIFTS_IN_EFFECT)).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);

  await c.me.switch(target);
  c.expect($.my.active).toBe(target);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.combatStatus.def(CHANGING_SHIFTS_IN_EFFECT)).toNotExist();
  expect(c.state.currentTurn).toBe(1);
});

// 规则集：切换角色时 元素骰减免：晨曦酒庄
// 断言：晨曦酒庄每回合减免 2 次切换费用，第 3 次切换正常花费 1 骰
test("switch action: DawnWinery deducts 1 die, twice per round", async () => {
  const first = ref();
  const second = ref();
  const third = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active ref={first} />
      <Character my ref={second} />
      <Character my ref={third} />
      <Support my def={DawnWinery} />
    </State>,
  );
  await c.me.switch(second);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.support.def(DawnWinery)).toHaveVariable({ usagePerRound: 1 });

  await c.me.switch(third);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.support.def(DawnWinery)).toHaveVariable({ usagePerRound: 0 });

  await c.me.switch(first);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect($.my.support.def(DawnWinery)).toHaveVariable({ usagePerRound: 0 });
});

// 规则集：切换角色时 确定是否为快速行动：虚实流动
// 断言：判定在切换之前进行（此时莫娜仍是出战角色），本次切换为快速行动（轮次不交换）；
// 快速行动判定不参与元素骰减免，仍花费 1 骰
test("switch action: IllusoryTorrent (Mona) makes the switch a fast action, dice still paid", async () => {
  const mona = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active ref={mona} def={Mona} />
      <Character my ref={target} />
    </State>,
  );
  await c.me.switch(target);
  c.expect($.my.active).toBe(target);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect(mona).toHaveVariable({ usagePerRound1: 0 });
  expect(c.state.currentTurn).toBe(0);

  // 快速行动后我方可继续行动；虚实流动每回合 1 次已用尽，再次切换恢复为战斗行动且照常花费 1 骰
  await c.me.switch(mona);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(c.state.currentTurn).toBe(1);
});

// 规则集：切换角色时 确定是否为快速行动：交给我吧
// 断言：交给我吧使下次切换为快速行动（轮次不交换），骰子照常花费 1
test("switch action: LeaveItToMe makes the switch a fast action, dice still paid", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my ref={target} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  c.expect($.my.combatStatus.def(LEAVE_IT_TO_ME_IN_EFFECT)).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);

  await c.me.switch(target);
  c.expect($.my.active).toBe(target);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect($.my.combatStatus.def(LEAVE_IT_TO_ME_IN_EFFECT)).toNotExist();
  expect(c.state.currentTurn).toBe(0);
});

// 规则集：切换角色时 元素骰减免：换班时间；确定是否为快速行动：交给我吧
// 断言：两个阶段作用于同一次切换：减免使骰子不变，快速行动判定使轮次不交换，两者均被消耗
// （两阶段的先后顺序由下一个绒翼龙用例验证）
test("switch action: dice deduction and fast-action determination both apply to one switch", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my ref={target} />
      <Card my def={ChangingShifts} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await c.me.card(ChangingShifts);
  await c.me.card(LeaveItToMe);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);

  await c.me.switch(target);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.combatStatus.def(CHANGING_SHIFTS_IN_EFFECT)).toNotExist();
  c.expect($.my.combatStatus.def(LEAVE_IT_TO_ME_IN_EFFECT)).toNotExist();
  expect(c.state.currentTurn).toBe(0);
});

// 规则集：切换角色时 先「元素骰减免：绒翼龙」再「确定是否为快速行动」
// 断言：v6.5.0 绒翼龙的快速行动以减费已触发为前提；同一次切换既减费（弃牌、移除目标、8 骰不变）又为快速行动，
// 说明减费时机在快速行动判定之前结算
test("switch action: dice deduction is resolved before fast-action determination (Qucusaurus v6.5.0)", async () => {
  const target = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Character my active />
      <Character my ref={target}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.switch(target);
  c.expect($.my.active).toBe(target);
  // 减费阶段已触发：弃 1 张手牌、移除对方目标、少花费 1 骰
  c.expect($.my.hand).toNotExist();
  c.expect($.opp.typeStatus.def(Target)).toNotExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  // 随后的快速行动判定读到减费已触发：本次切换为快速行动
  expect(c.state.currentTurn).toBe(0);
});

// 规则集：行动：切换角色 - 切换角色时 元素骰减免：……晨曦酒庄
// 断言：元素骰减免属于「切换角色」行动的结算步骤；砂糖战技造成的强制切换不是该行动，
// 对方晨曦酒庄的每回合可用次数不被消耗
test("switch action: a forced switch is not a switch action, no dice deduction step", async () => {
  const oppThird = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp />
      <Character opp ref={oppThird} />
      <Character my active def={Sucrose} />
      <Support opp def={DawnWinery} />
    </State>,
  );
  c.expect($.opp.support.def(DawnWinery)).toHaveVariable({ usagePerRound: 2 });

  await c.me.skill(AstableAnemohypostasisCreation6308);
  c.expect($.opp.active).toBe(oppThird);
  c.expect($.opp.support.def(DawnWinery)).toHaveVariable({ usagePerRound: 2 });
  expect(c.state.players[1].dice).toBeArrayOfSize(8);
});

// 规则集：切换至目标角色（生成【切换角色后】）
// 断言：切换行动后目标角色成为出战角色，并触发【切换角色后】（绫华被动附属冰元素附魔）
test("switch action: switches to the target and triggers onSwitchActive", async () => {
  const ayaka = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my ref={ayaka} def={KamisatoAyaka} />
    </State>,
  );
  c.expect($.my.typeStatus.def(CryoElementalInfusion)).toNotExist();

  await c.me.switch(ayaka);
  c.expect($.my.active).toBe(ayaka);
  c.expect($.my.active.has($.typeStatus.def(CryoElementalInfusion))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  expect(c.state.currentTurn).toBe(1);
});
