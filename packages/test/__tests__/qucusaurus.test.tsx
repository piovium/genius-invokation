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
  $,
  Equipment,
  Card,
  Support,
  Summon,
  CombatStatus,
  DiceCount,
} from "#test";
import { Qucusaurus, Target, SwiftGlide, Waverider } from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import { Katheryne, Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Chasca, ShadowhuntShell } from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import { MirrorMaiden, Refraction } from "@gi-tcg/data/internal/characters/hydro/mirror_maiden.gts";
import { Baizhu, SeamlessShield } from "@gi-tcg/data/internal/characters/dendro/baizhu.gts";
import { OdeOfResurrection, ChangingShifts, LeaveItToMe, Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { test, expect, vi } from "vitest";
import { GiTcgCoreConflictError } from "@gi-tcg/core";
import { FlowerfeatherClan, FlowerfeatherClanInEffect } from "@gi-tcg/data/internal/cards/support/place.gts";
import { LightningTouch, Lisa } from "@gi-tcg/data/internal/characters/electro/lisa.gts";
import { Aura } from "@gi-tcg/typings";

test("qucusaurus delayed one fast action to next switch", async () => {
  const switch1Target = ref();
  const mona = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character opp active health={10}>
        <Status def={Target} />
      </Character>
      <Support my def={Katheryne} />
      <Character my active ref={mona} def={Mona} />
      <Character my ref={switch1Target} def={Chasca}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={ShadowhuntShell} />
    </State>,
  );
  // 第一次快速行动（绒翼龙减费，莫娜设置快速，绒翼龙快速存到下一次）
  await c.me.switch(switch1Target);
  c.expect(mona).toHaveVariable({ usagePerRound1: 0 });
  c.expect($.my.hand).toNotExist();
  // 弹头1伤
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  // 依然是快速行动（绒翼龙）
  await c.me.switch(mona);
  await c.me.end();
});

test("qucusaurus: defeated switch during precalculation does not block action modifiers", async () => {
  const oppNext = ref();
  const switchTarget = ref();
  const c = setup(
    <State dataVersion="v6.0.0">
      <Character opp active health={1}>
        <Status def={Target} />
      </Character>
      <Character opp ref={oppNext} />
      <Character my active />
      <Character my ref={switchTarget}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={ShadowhuntShell} />
      <DiceCount my count={1} />
    </State>,
  );

  await c.me.switch(switchTarget);
  await c.opp.chooseActive(oppNext);

  expect(c.state.players[0].dice).toHaveLength(1);
  await c.me.end();
});

test.each(["throw", "skipConsume", "skipAction", void 0] as const)(
  "qucusaurus: insufficient dice behavior",
  async (unexpectedInsufficientDice) => {
    const myActive = ref();
    const myNext = ref();
    const c = setup(
      <State dataVersion="v6.5.0" config={{ unexpectedInsufficientDice }}>
        <Character opp active def={Baizhu}>
          <Status def={Target} />
        </Character>
        <Character opp def={MirrorMaiden} />
        <CombatStatus opp def={SeamlessShield} />
        <DiceCount my count={1} />
        <Character my active ref={myActive} health={1}>
          <Status def={Refraction} />
          <Status def={OdeOfResurrection} />
        </Character>
        <Character my ref={myNext} def={Chasca}>
          <Equipment def={Qucusaurus} />
        </Character>
        <Card my def={ShadowhuntShell} />
      </State>,
    );
    if (unexpectedInsufficientDice === "throw") {
      await expect(c.me.switch(myNext)).rejects.toThrow(GiTcgCoreConflictError);
      return;
    }
    using warn = vi.spyOn(console!, "warn").mockImplementation(() => {});
    await c.me.switch(myNext);
    if (
      !unexpectedInsufficientDice ||
      unexpectedInsufficientDice === "skipConsume"
    ) {
      expect(c.state.players[0].activeCharacterId).toBe(myNext.id);
      expect(c.state.players[0].dice).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unexpectedInsufficientDice: skipConsume"),
      );
    } else if (unexpectedInsufficientDice === "skipAction") {
      expect(c.state.players[0].activeCharacterId).toBe(myActive.id);
      expect(c.state.players[0].dice).toHaveLength(0);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unexpectedInsufficientDice: skipAction"),
      );
    }
  },
);

// 规则集描述的是 v6.5.0 及之前的绒翼龙（切换到附属角色时弃牌速切），
// 全部场景使用 dataVersion="v6.5.0"。

test("qucusaurus: on staged, opponent's active character gets Target", async () => {
  // 规则集：①入场时：对方出战角色附属【目标】
  // 断言：装备后只有对方出战角色附属目标，后台角色没有
  const a = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a} />
      <Character opp active />
      <Card my def={Qucusaurus} />
    </State>,
  );
  await c.me.card(Qucusaurus, a);
  c.expect($.opp.active.has($.typeStatus.def(Target))).toBeExist();
  c.expect($.opp.standby.has($.typeStatus.def(Target))).toNotExist();
  c.expect($.opp.typeStatus.def(Target)).toBeUnique();
});

test("qucusaurus: switching to equipped character discards max-cost hand, costs 1 less, disposes all Targets, fast action", async () => {
  // 规则集：②确定消耗时：若对方出战角色附属【目标】，随机舍弃当前元素骰费用最高的一张手牌->
  //   少花费1个元素骰->此牌附属【快切·绒】，弃置对方所有【目标】；③消耗【快切·绒】->视为快速行动
  // 断言：只舍弃费用最高的派蒙，切换 0 费（骰子仍为 8），对方所有目标（含后台）被弃置，回合仍在我方
  const a = ref();
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a} />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Character opp>
        <Status def={Target} />
      </Character>
      <Card my def={Paimon} />
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand.def(Paimon)).toNotExist();
  c.expect($.my.hand.def(Strategize)).toBeUnique();
  c.expect($.my.hand).toBeCount(1);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.opp.typeStatus.def(Target)).toNotExist();
  expect(c.state.currentTurn).toBe(0);
});

test("qucusaurus: 快切·绒 is consumed by the fast switch; next switch to the character is a combat action", async () => {
  // 规则集：③确定行动类型时：消耗【快切·绒】->此行动视为快速行动
  // 断言：快切·绒被消耗后，再次切换到绒翼龙角色（无目标、无手牌）为战斗行动，回合交给对方
  const a = ref();
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a} />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active def={Lisa}>
        <Status def={Target} />
      </Character>
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.switch(b);
  expect(c.state.currentTurn).toBe(0);
  c.expect($.my.hand).toNotExist();
  await c.me.switch(a);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(LightningTouch);
  expect(c.state.currentTurn).toBe(0);
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  expect(c.state.currentTurn).toBe(1);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
});

test("qucusaurus: no hand cards -> no discard, no cost reduction, Target kept, combat action", async () => {
  // 规则集：对方绒翼龙未触发（对方没手牌时……）切换至前台，也不会弃置目标
  // 断言：无手牌时切换正常花费 1 骰，对方目标保留，行动为战斗行动
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
    </State>,
  );
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  c.expect($.opp.active.has($.typeStatus.def(Target))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  expect(c.state.currentTurn).toBe(1);
});

test("qucusaurus: Target only on opponent's standby -> no trigger, Target kept", async () => {
  // 规则集：对方绒翼龙未触发（……或己方前台没有【目标】）切换至前台，也不会弃置目标
  // 断言：目标只在对方后台时切换不弃牌、不减费、后台目标保留、战斗行动
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active />
      <Character opp>
        <Status def={Target} />
      </Character>
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.switch(b);
  c.expect($.my.hand.def(Paimon)).toBeUnique();
  c.expect($.opp.standby.has($.typeStatus.def(Target))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  expect(c.state.currentTurn).toBe(1);
});

test("qucusaurus: switch forced by Overloaded does not trigger ②", async () => {
  // 规则集：不因【切换角色】行动而切换至装备绒翼龙角色的场合（如超载或特技），不会触发②
  // 断言：超载把绒翼龙角色顶上前台后，手牌未舍弃、对方目标保留、骰子未变
  const a = ref();
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0" currentTurn="opp">
      <Character my active ref={a} aura={Aura.Pyro} />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active def={Lisa}>
        <Status def={Target} />
      </Character>
      <Card my def={Paimon} />
    </State>,
  );
  await c.opp.skill(LightningTouch);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand.def(Paimon)).toBeUnique();
  c.expect($.opp.active.has($.typeStatus.def(Target))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
});

test("qucusaurus: switch caused by a technique (Swift Glide) does not trigger ②", async () => {
  // 规则集：不因【切换角色】行动而切换至装备绒翼龙角色的场合（如超载或特技），不会触发②
  // 断言：前台角色用迅疾滑翔切到装备绒翼龙的下一角色，不弃牌、目标保留、只花特技的 1 骰
  //   （迅疾滑翔会给对方出战角色重新附属目标，故以对方后台的目标是否保留来判断②未触发）
  const a = ref();
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Character opp>
        <Status def={Target} />
      </Character>
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.skill(SwiftGlide);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand.def(Paimon)).toBeUnique();
  c.expect($.opp.standby.has($.typeStatus.def(Target))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
});

test("qucusaurus: re-attaching Target does not create a second Target", async () => {
  // 规则集：目标不能叠加
  // 断言：已附属目标的角色再次被附属目标后，仍只有 1 个目标实体
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
    </State>,
  );
  await c.me.skill(SwiftGlide);
  c.expect($.opp.typeStatus.def(Target)).toBeUnique();
});

test.fails("qucusaurus: Target's number stays 1 when re-attached", async () => {
  // 规则集：目标不能叠加（状态的数字1没有任何意义）；当前引擎：目标的 effect 变量声明为 append，重复附属后变为 2
  // 断言：已附属目标的角色再次被附属目标后，数值仍为 1（目标无任何效果，此偏差仅影响显示的层数）
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
    </State>,
  );
  await c.me.skill(SwiftGlide);
  c.expect($.opp.typeStatus.def(Target)).toHaveVariable({ effect: 1 });
});

test("qucusaurus: cost already reduced to 0 by Changing Shifts -> ② does not trigger", async () => {
  // 规则集：因其他方式先将切换费用减至0的场合，不会触发②（没有速切，不会弃牌或弃置目标)
  // 断言：换班时间先减费到 0 后切换：不弃牌、目标保留、骰子 8、战斗行动
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Card my def={ChangingShifts} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.card(ChangingShifts);
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand.def(Paimon)).toBeUnique();
  c.expect($.opp.active.has($.typeStatus.def(Target))).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  expect(c.state.currentTurn).toBe(1);
});

test("qucusaurus: fast-switch effect triggered first -> ② still fires", async () => {
  // 规则集：如果先触发了快速行动效果，绒翼龙②也能发动
  // 断言：交给我吧先生效时仍弃牌、减费、弃置全部目标，交给我吧被消耗，本次为快速行动
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Card my def={LeaveItToMe} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand).toNotExist();
  c.expect($.opp.typeStatus.def(Target)).toNotExist();
  c.expect($.my.combatStatus).toNotExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  expect(c.state.currentTurn).toBe(0);
});

test.fails("qucusaurus: fast-switch effect triggered first -> ③ deferred to the next switch to the character", async () => {
  // 规则集：而如果先触发了快速行动效果，绒翼龙②也能发动，但③不会发动，改在在下一次切换至该角色生效；
  // 当前引擎：beforeFastSwitch 未检查切换目标是否为附属角色，留存的快切·绒在下一次任意切换角色行动（包括从该角色切走）时就生效
  // 断言：交给我吧先生效后，从绒翼龙角色切走仍是战斗行动；之后再切回该角色才是快速行动
  const a = ref();
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a} />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character opp active def={Lisa}>
        <Status def={Target} />
      </Character>
      <Card my def={LeaveItToMe} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  await c.me.switch(b);
  expect(c.state.currentTurn).toBe(0);
  await c.me.switch(a);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(LightningTouch);
  expect(c.state.currentTurn).toBe(0);
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(c.state.currentTurn).toBe(0);
});

test("qucusaurus: deferred ③ is lost when the equipment leaves", async () => {
  // 规则集：③需要装备在场的场合才能生效
  // 断言：已留存快切·绒的绒翼龙被浪船替换后，切换到该角色为战斗行动
  const b = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} v={{ deductDiceTriggered: 1 }} />
      </Character>
      <Character opp active />
      <Card my def={Waverider} />
    </State>,
  );
  await c.me.card(Waverider, b);
  c.expect($.my.typeEquipment.def(Qucusaurus)).toNotExist();
  expect(c.state.currentTurn).toBe(0);
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  expect(c.state.players[0].dice).toBeArrayOfSize(2);
  expect(c.state.currentTurn).toBe(1);
});

test("qucusaurus: discard effect resolves immediately, before the switch", async () => {
  // 规则集：舍弃牌效果不会延迟而是立刻结算
  // 断言：舍弃触发花羽会时切换尚未发生，「下一个后台角色」按旧出战角色计算，状态落在绒翼龙角色上，
  //   随后本次切换到该角色就消耗此状态回复 1 骰（0 费切换后 8+1=9）；若延迟结算则状态会落在第三名角色上且骰子为 8
  const a = ref();
  const b = ref();
  const third = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active ref={a} />
      <Character my ref={b}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Character my ref={third} />
      <Character opp active>
        <Status def={Target} />
      </Character>
      <Support my def={FlowerfeatherClan} v={{ disposedCardCount: 1 }} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.switch(b);
  c.expect($.my.active).toBe(b);
  c.expect($.my.hand).toNotExist();
  c.expect($.my.support.def(FlowerfeatherClan)).toHaveVariable({
    disposedCardCount: 0,
  });
  c.expect($.my.typeStatus.def(FlowerfeatherClanInEffect)).toNotExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
});
