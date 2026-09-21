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

import { $, Card, Character, ref, setup, State, Status, Support } from "#test";
import {
  FlamesOfWar,
  FlamesOfWarInEffect,
  PilgrimageOfTheReturnOfTheSacredFlame,
} from "@gi-tcg/data/internal/cards/event/legend.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { expect, test } from "vitest";

test("pilgrimage: creates flames of war support on both sides, mine gets 1 spirit", async () => {
  // 规则集：在双方场上生成【斗争之火】（支援牌），我方【斗争之火】获得1层【斗志】
  // 断言：双方各 1 张斗争之火支援牌，我方 spirit 1，对方 spirit 0
  const c = setup(
    <State>
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  c.expect($.my.support.def(FlamesOfWar)).toBeCount(1);
  c.expect($.opp.support.def(FlamesOfWar)).toBeCount(1);
  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 1 });
  c.expect($.opp.support.def(FlamesOfWar)).toHaveVariable({ spirit: 0 });
});

test("flames of war: unique, generating a second one on the same side is prevented", async () => {
  // 规则集：唯一：一方场上只能存在一张此支援牌，当尝试生成新的支援牌时，阻止此操作
  // 断言：双方已各有斗争之火时打出归火圣夜巡礼，双方仍各只有原来那张（未被替换），我方原有那张获得 1 层斗志
  const mine = ref();
  const theirs = ref();
  const c = setup(
    <State>
      <Support my def={FlamesOfWar} ref={mine} />
      <Support opp def={FlamesOfWar} ref={theirs} />
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  c.expect($.my.support.def(FlamesOfWar)).toBe(mine);
  c.expect($.opp.support.def(FlamesOfWar)).toBe(theirs);
  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 1 });
  c.expect($.opp.support.def(FlamesOfWar)).toHaveVariable({ spirit: 0 });
});

test("flames of war: after dealing damage, adds spirit equal to final damage value", async () => {
  // 规则集：我方对对方造成伤害后：叠加等同伤害值层数的【斗志】；注：伤害值取增减伤计算后的最终伤害
  // 断言：出战角色带 +1 伤状态，普攻 2 点变 3 点，我方斗争之火 spirit 由 1 变为 4
  const c = setup(
    <State>
      <Character my active def={Kaeya}>
        <Status def={FlamesOfWarInEffect} v={{ increasedDamage: 1 }} />
      </Character>
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  await c.me.skill(CeremonialBladework);
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 4 });
  c.expect($.opp.support.def(FlamesOfWar)).toHaveVariable({ spirit: 0 });
});

test("flames of war status: character deals +1 damage", async () => {
  // 规则集：斗争之火 角色状态：角色造成伤害+1
  // 断言：附属此状态的凯亚普攻造成 3 点伤害
  const c = setup(
    <State>
      <Character my active def={Kaeya}>
        <Status def={FlamesOfWarInEffect} />
      </Character>
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});

test("flames of war: at action phase start, higher spirit side gets status, spirit cleared, opp side does not trigger", async () => {
  // 规则集：行动阶段开始时：若对方不存在【斗志】高于我方的斗争之火->我方出战角色获得【斗争之火】（角色状态），【斗志】清零，对方【斗争之火】本回合不能触发
  // 断言：我方 spirit 1 > 对方 0，下回合我方出战角色获得状态、spirit 清零；对方出战角色不获得状态
  const c = setup(
    <State>
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.active.has($.typeStatus.def(FlamesOfWarInEffect))).toBeExist();
  c.expect($.opp.active.has($.typeStatus.def(FlamesOfWarInEffect))).toNotExist();
  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 0 });
});

test.fails("flames of war: on equal spirit, the first-resolving side gets the status and blocks the other", async () => {
  // 规则集：若对方不存在【斗志】高于我方的斗争之火（支援牌）->我方出战角色获得【斗争之火】（角色状态），
  // 【斗志】清零，对方【斗争之火】本回合不能触发；斗志相等时「不存在高于我方的」同样成立，
  // 先结算的一方（本回合先手，即先宣布结束者）获得状态并使对方本回合不能触发。
  // 当前引擎：#1065 修复后要求 mySpirit > oppSpirit（严格高于），斗志相等时双方都不获得状态。
  const c = setup(
    <State>
      <Support my def={FlamesOfWar} />
      <Support opp def={FlamesOfWar} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.active.has($.typeStatus.def(FlamesOfWarInEffect))).toBeExist();
  c.expect($.opp.active.has($.typeStatus.def(FlamesOfWarInEffect))).toNotExist();
});

test("flames of war: when opp spirit is higher, only opp gets the status and my spirit is not cleared", async () => {
  // 规则集：行动阶段开始时：若对方不存在【斗志】高于我方的斗争之火（支援牌）->我方出战角色获得【斗争之火】（角色状态），【斗志】清零
  // 断言：我方 spirit 1，对方普攻 2 点后 spirit 2；下回合仅对方出战角色获得状态、对方 spirit 清零，我方不获得状态且 spirit 保持 1
  const c = setup(
    <State>
      <Character opp active def={Kaeya} />
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  await c.me.end();
  await c.opp.skill(CeremonialBladework);
  c.expect($.opp.support.def(FlamesOfWar)).toHaveVariable({ spirit: 2 });
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.opp.active.has($.typeStatus.def(FlamesOfWarInEffect))).toBeExist();
  c.expect($.my.active.has($.typeStatus.def(FlamesOfWarInEffect))).toNotExist();
  c.expect($.opp.support.def(FlamesOfWar)).toHaveVariable({ spirit: 0 });
  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 1 });
});
