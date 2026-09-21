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
  ref,
  setup,
  Character,
  State,
  Status,
  Equipment,
  Card,
  $,
} from "#test";
import {
  DeathsCrossing,
  FarToFall,
  HavocExtinction,
  HavocRuin,
  HavocSunder,
  HavocWarp,
  MutualWeaponsMentorship,
  SevenphaseFlash,
  Skirk,
  Skirk01,
  VoidRift,
} from "@gi-tcg/data/internal/characters/cryo/skirk.gts";
import { Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import {
  StoneAndContracts,
  TheBestestTravelCompanion,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// ===== 《夜鹰规则集》丝柯克分组 =====

test("skirk: serpent's subtlety is not energy, her energy stays 0/0", async () => {
  // 规则集：丝柯克（充能上限0）蛇之狡谋；注：与玛薇卡不同，蛇谋不是充能，丝柯克的充能始终为0/0
  // 断言：普攻（通常获得1点充能）与获得蛇之狡谋均不改变 energy/maxEnergy
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
    </State>,
  );
  await c.me.skill(HavocSunder);
  c.expect(skirk).toHaveVariable({ energy: 0, maxEnergy: 0 });
  await c.opp.end();
  await c.me.skill(HavocWarp);
  c.expect(skirk).toHaveVariable({
    serpentsSubtlety: 2,
    energy: 0,
    maxEnergy: 0,
  });
});

test("void rift: discards a 3-cost hand card and grants Skirk 2 serpent's subtlety", async () => {
  // 规则集：虚境裂隙 随机舍弃1张元素骰费用为3的手牌->我方丝柯克获得2点蛇之狡谋
  // 断言：只有 3 费的岩与契约被舍弃，2 费的最好的伙伴！留在手牌，丝柯克蛇之狡谋 0→2
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
      <Card my def={VoidRift} />
      <Card my def={StoneAndContracts} />
      <Card my def={TheBestestTravelCompanion} />
    </State>,
  );
  await c.me.card(VoidRift);
  c.expect($.my.hand.def(StoneAndContracts)).toNotExist();
  c.expect($.my.hand.def(TheBestestTravelCompanion)).toBeExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 2 });
});

test.fails("void rift: playable without any 3-cost hand card, with no effect but triggering the talent", async () => {
  // 规则集：注：没有费用3的手牌也能使用。无效果（可以触发天赋）
  // 当前引擎：虚境裂隙带有 filter :( :query($.my.hand.cost(3)) )，无 3 费手牌时它不是合法行动，天赋也无从触发
  // 断言：手牌无 3 费牌时仍可打出虚境裂隙，蛇之狡谋不变，但天赋「湮远」造成 1 点冰伤
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk}>
        <Equipment def={FarToFall} />
      </Character>
      <Card my def={VoidRift} />
    </State>,
  );
  await c.me.card(VoidRift);
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 0 });
  c.expect($.opp.active).toHaveVariable({ health: 9 });
});

test("mutual weapons mentorship: attaches Sevenphase Flash to Skirk", async () => {
  // 规则集：诸武相授 我方丝柯克附属【七相一闪】
  // 断言：打出诸武相授后七相一闪附属在丝柯克身上
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.card(MutualWeaponsMentorship, skirk);
  c.expect($.my.character.has($.typeStatus.def(SevenphaseFlash))).toBe(skirk);
});

test("mutual weapons mentorship: in hand, discarded at the start of the action phase for 1 subtlety", async () => {
  // 规则集：（手牌生效）行动阶段开始时/我方切换角色后：舍弃此牌->我方丝柯克获得1层蛇之狡谋
  // 断言：手牌中的诸武相授在第 2 回合行动阶段开始时被舍弃，丝柯克蛇之狡谋 0→1
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.hand.def(MutualWeaponsMentorship)).toNotExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 1 });
});

test("mutual weapons mentorship: in hand, discarded after my switch for 1 subtlety", async () => {
  // 规则集：（手牌生效）行动阶段开始时/我方切换角色后：舍弃此牌->我方丝柯克获得1层蛇之狡谋
  // 断言：切换角色行动后手牌中的诸武相授被舍弃，丝柯克蛇之狡谋 0→1
  const skirk = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
      <Character my ref={other} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.switch(other);
  c.expect($.my.hand.def(MutualWeaponsMentorship)).toNotExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 1 });
});

test("mutual weapons mentorship: in hand, not discarded when the opponent switches", async () => {
  // 规则集：（手牌生效）行动阶段开始时/我方切换角色后：舍弃此牌->我方丝柯克获得1层蛇之狡谋
  // 断言：「我方切换角色后」限我方；对方切换角色时此牌留在手牌，丝柯克不获得蛇之狡谋
  const skirk = ref();
  const oppOther = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active />
      <Character opp ref={oppOther} />
      <Character my active def={Skirk} ref={skirk} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.opp.switch(oppOther);
  c.expect($.my.hand.def(MutualWeaponsMentorship)).toBeExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 0 });
});

test("mutual weapons mentorship: also discarded when the switch is not a switch action", async () => {
  // 规则集：注：1. 不因切换行动切换角色也会舍弃。
  // 断言：对方超载强制我方切换出战角色，手牌中的诸武相授同样被舍弃，丝柯克蛇之狡谋 0→1
  const skirk = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Klee} />
      <Character my active def={Skirk} ref={skirk} aura={Aura.Electro} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.opp.skill(Kaboom);
  expect(c.state.players[0].activeCharacterId).not.toBe(skirk.id);
  c.expect($.my.hand.def(MutualWeaponsMentorship)).toNotExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 1 });
});

test("mutual weapons mentorship: does not trigger while in the pile", async () => {
  // 规则集：在牌库不会发动
  // 断言：牌库中的诸武相授在我方切换角色后不被舍弃，丝柯克也不获得蛇之狡谋
  const skirk = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} />
      <Character my ref={other} />
      <Card my pile def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.switch(other);
  c.expect($.my.pile.def(MutualWeaponsMentorship)).toBeExist();
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 0 });
});

test("death's crossing: increases the character's damage by 1, once", async () => {
  // 规则集：死河渡断 角色造成的伤害+1 可用次数：1
  // 断言：首次普攻 2+1=3 点伤害后状态耗尽消失，第二次普攻恢复为 2 点
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk}>
        <Status def={DeathsCrossing} />
      </Character>
    </State>,
  );
  await c.me.skill(HavocSunder);
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(DeathsCrossing)).toNotExist();
  await c.opp.end();
  await c.me.skill(HavocSunder);
  c.expect($.opp.active).toHaveVariable({ health: 5 });
});

test("sevenphase flash: the normal attack's physical damage becomes cryo damage", async () => {
  // 规则集：七相一闪 ①角色普通攻击造成的物理伤害改为冰元素伤害
  // 断言：普攻造成 2 点冰元素伤害并附着冰元素
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk}>
        <Status def={SevenphaseFlash} />
      </Character>
    </State>,
  );
  await c.me.skill(HavocSunder);
  c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.Cryo });
});

test("sevenphase flash: a normal attack consumes 2 subtlety to deduct 2 void dice", async () => {
  // 规则集：②角色普通攻击时：消耗1点蛇之狡谋->少花费1个无色元素。（可发动2次）
  // 断言：蛇之狡谋 3 时普攻（1冰+2无色）只花费 1 个骰，蛇之狡谋 3→1
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} v={{ serpentsSubtlety: 3 }}>
        <Status def={SevenphaseFlash} />
      </Character>
    </State>,
  );
  await c.me.skill(HavocSunder);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 1 });
});

test("sevenphase flash: with only 1 subtlety, only 1 void die is deducted", async () => {
  // 规则集：②角色普通攻击时：消耗1点蛇之狡谋->少花费1个无色元素。（可发动2次）
  // 断言：蛇之狡谋 1 时普攻只少花费 1 个无色，共花费 2 个骰，蛇之狡谋 1→0
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} v={{ serpentsSubtlety: 1 }}>
        <Status def={SevenphaseFlash} />
      </Character>
    </State>,
  );
  await c.me.skill(HavocSunder);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect(skirk).toHaveVariable({ serpentsSubtlety: 0 });
});

test("sevenphase flash: on enter, the burst becomes Havoc Extinction", async () => {
  // 规则集：③入场时：元素爆发转换为【极恶技·尽】
  // 断言：蛇之狡谋 2（本可使用极恶技·灭）时附属七相一闪，极恶技·灭被替换掉，只能使用极恶技·尽
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} v={{ serpentsSubtlety: 2 }} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.card(MutualWeaponsMentorship, skirk);
  c.expect(skirk).toBeDefinition(Skirk01);
  await expect(c.me.skill(HavocRuin)).rejects.toThrow();
  await c.me.skill(HavocExtinction);
});

test("sevenphase flash: lasts 1 round, and on leave the burst becomes Havoc Ruin again", async () => {
  // 规则集：④离场时：元素爆发转换为【极恶技·灭】 持续回合：1
  // 断言：七相一闪在第 1 回合结束时消失，丝柯克变回原形态，元素爆发换回极恶技·灭
  //       （蛇之狡谋 2 → 造成 2 点冰元素伤害）
  const skirk = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Skirk} ref={skirk} v={{ serpentsSubtlety: 2 }} />
      <Card my def={MutualWeaponsMentorship} />
    </State>,
  );
  await c.me.card(MutualWeaponsMentorship, skirk);
  c.expect(skirk).toBeDefinition(Skirk01);
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.typeStatus.def(SevenphaseFlash)).toNotExist();
  c.expect(skirk).toBeDefinition(Skirk);
  await expect(c.me.skill(HavocExtinction)).rejects.toThrow();
  await c.me.skill(HavocRuin);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
});
