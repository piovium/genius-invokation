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

import { ref, setup, Character, State, Status, CombatStatus, Equipment, Card, Support, DeclaredEnd, DiceCount, $ } from "#test";
import { FlowingPurity } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import { FreshWindOfFreedomInEffect } from "@gi-tcg/data/internal/cards/event/legend.gts";
import { ChangingShifts, LeaveItToMe, Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Lynette, OverawingAssault } from "@gi-tcg/data/internal/characters/anemo/lynette.gts";
import {
  HeartstopperStrike,
  PreexistingGuilt,
  ShikanoinHeizou,
  WindmusterIrisCryo,
} from "@gi-tcg/data/internal/characters/anemo/shikanoin_heizou.gts";
import { ChonghuaFrostField } from "@gi-tcg/data/internal/characters/cryo/chongyun.gts";
import { Kaeya, CeremonialBladework, Icicle } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Beidou, LightningStorm } from "@gi-tcg/data/internal/characters/electro/beidou.gts";
import { ExplosiveSpark, Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import { BlazingTrail, FlamestriderBlazingTrail, Mavuika } from "@gi-tcg/data/internal/characters/pyro/mavuika.gts";
import { expect, test } from "vitest";

test("action phase: players alternate after combat actions until both declared end", async () => {
  // 规则集：双方会交替执行行动阶段，直到双方均已宣布结束
  const c = setup(
    <State>
      <Character opp active def={Kaeya} />
      <Character my active def={Kaeya} />
    </State>,
  );
  expect(c.state.currentTurn).toBe(0);
  // 使用技能（战斗行动）后，对方获得行动权
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(0);
  // 一方宣布结束后仍在本回合行动阶段，对方继续行动
  await c.me.end();
  expect(c.state.currentTurn).toBe(1);
  expect(c.state.roundNumber).toBe(1);
  expect(c.state.phase).toBe("action");
  // 双方均已宣布结束 → 结束阶段 → 投掷阶段 → 下一回合行动阶段
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.phase).toBe("action");
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  expect(c.state.players[1].dice).toBeArrayOfSize(8);
});

test("action phase start: triggers once per round, not again when the action phase re-runs after a fast action", async () => {
  // 规则集：投掷阶段 → 行动阶段开始时 → 行动阶段；快速行动后重新执行的是「行动阶段」，不含「行动阶段开始时」
  const paimon = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Support my def={Paimon} ref={paimon} />
      <Card my def={ChangingShifts} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  // 第 2 回合行动阶段开始时：派蒙生成 2 个万能骰
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.players[0].dice).toBeArrayOfSize(10);
  c.expect(paimon).toHaveVariable({ usage: 1 });
  // 快速行动（0 费换班时间）后重新执行行动阶段，「行动阶段开始时」不再触发
  await c.me.card(ChangingShifts);
  expect(c.state.currentTurn).toBe(0);
  expect(c.state.players[0].dice).toBeArrayOfSize(10);
  c.expect(paimon).toHaveVariable({ usage: 1 });
});

test("before action: effects trigger for the acting side right before it chooses an action", async () => {
  // 规则集：当前轮次玩家执行以下流程 - 选择行动前
  // 聚风真眼「所在阵营选择行动前」只在其阵营行动前触发，我方行动前不触发
  const oppActive = ref();
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive}>
        <Status def={WindmusterIrisCryo} />
      </Character>
      <Character my active def={Kaeya} />
      <Character my ref={myNext} />
    </State>,
  );
  // 我方选择行动前：对方的聚风真眼未触发
  await c.stepToNextAction();
  c.expect(oppActive).toHaveVariable({ health: 10 });
  c.expect($.opp.typeStatus.def(WindmusterIrisCryo)).toBeExist();
  await c.me.switch(myNext);
  // 轮到对方，对方选择行动前：聚风真眼触发
  expect(c.state.currentTurn).toBe(1);
  c.expect(oppActive).toHaveVariable({ health: 9 });
  c.expect($.opp.typeStatus.def(WindmusterIrisCryo)).toNotExist();
});

test.each([
  { dice: 7, health: 7, desc: "7+1=8 dice, charged" },
  { dice: 8, health: 8, desc: "8+1=9 dice, not charged" },
])("charged attack judgement happens after before-action effects ($desc)", async ({ dice, health }) => {
  // 规则集：选择行动前 → 选择行动前2：重击判定
  // 纯水流华在「选择行动前」生成 1 个骰子，重击判定按生成后的骰子数进行
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Klee}>
        <Equipment def={FlowingPurity} />
        <Status def={ExplosiveSpark} />
      </Character>
      <DiceCount my count={dice} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].dice).toBeArrayOfSize(dice + 1);
  await c.me.skill(Kaboom);
  // 砰砰 1 + 纯水流华 1 + （重击时）爆裂火花 1
  c.expect($.opp.active).toHaveVariable({ health });
});

test("prepared skill is used directly when choosing action and counts as a combat action", async () => {
  // 规则集：选择行动时：准备状态
  // 附属「在罪之先」的角色在选择行动时直接使用勠心拳·蓄力，不能选择其它行动，随后行动权交给对方
  const c = setup(
    <State>
      <Character opp active def={Kaeya} />
      <Character my active def={ShikanoinHeizou} />
    </State>,
  );
  await c.me.skill(HeartstopperStrike);
  c.expect($.my.typeStatus.def(PreexistingGuilt)).toBeExist();
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(CeremonialBladework);
  // 我方选择行动时直接使用了勠心拳·蓄力（4 点风伤），随后行动权回到对方
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.typeStatus.def(PreexistingGuilt)).toNotExist();
  expect(c.state.currentTurn).toBe(1);
});

test("before-action effects still trigger when the player will use a prepared skill", async () => {
  // 规则集：选择行动前 → 选择行动前2：重击判定 → 选择行动时：准备状态
  // 附属准备技能状态时仍先结算「选择行动前」：聚风真眼先造成 1 点冰伤，之后才直接使用勠心拳·蓄力
  const c = setup(
    <State>
      <Character opp active def={Kaeya} />
      <Character my active def={ShikanoinHeizou}>
        <Status def={PreexistingGuilt} />
        <Status def={WindmusterIrisCryo} />
      </Character>
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.active).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(WindmusterIrisCryo)).toNotExist();
  // 随后「选择行动时」直接使用准备技能（4 点风伤），行动权交给对方
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.typeStatus.def(PreexistingGuilt)).toNotExist();
  expect(c.state.currentTurn).toBe(1);
});

test("fast action: elemental tuning lets the same player act again", async () => {
  // 规则集：快速行动：若行动为快速行动，重新执行行动阶段
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Card my def={ChangingShifts} />
    </State>,
  );
  await c.me.tune(ChangingShifts);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("fast action: playing a non-combat-action card lets the same player act again", async () => {
  // 规则集：快速行动：若行动为快速行动，重新执行行动阶段
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Card my def={ChangingShifts} />
    </State>,
  );
  await c.me.card(ChangingShifts);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("fast action: switch treated as fast action lets the same player act again", async () => {
  // 规则集：快速行动：若行动为快速行动，重新执行行动阶段
  // 交给我吧！将下次切换角色视为快速行动
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Character my ref={myNext} def={Kaeya} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  await c.me.switch(myNext);
  c.expect($.my.active).toBe(myNext);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("combat action card: playing a combat-action card passes the turn", async () => {
  // 规则集：选择一个行动 - 使用手牌；（非快速行动时）对方获得行动权
  const beidou = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Beidou} ref={beidou} />
      <Card my def={LightningStorm} />
    </State>,
  );
  await c.me.card(LightningStorm, beidou);
  expect(c.state.currentTurn).toBe(1);
});

test("fast action re-runs the action phase: charged attack is judged again", async () => {
  // 规则集：快速行动：若行动为快速行动，重新执行行动阶段（含「选择行动前2：重击判定」）
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Klee}>
        <Status def={ExplosiveSpark} />
      </Character>
      <Card my def={Strategize} />
    </State>,
  );
  // 8 骰：重击判定为可重击
  await c.stepToNextAction();
  expect(c.state.players[0].canCharged).toBe(true);
  // 快速行动花费 1 骰后剩 7 骰，重新执行行动阶段时重击判定为不可重击
  await c.me.card(Strategize);
  expect(c.state.currentTurn).toBe(0);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  expect(c.state.players[0].canCharged).toBe(false);
  await c.me.skill(Kaboom);
  // 非重击：砰砰 1 点伤害，爆裂火花不生效
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(ExplosiveSpark)).toHaveVariable({ usage: 1 });
});

test("extra action: current player acts once more, then the extra action is consumed", async () => {
  // 规则集：额外行动：若当前轮次玩家具有额外行动，消耗额外行动，重新执行行动阶段
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={2} />
      <Character opp ref={oppNext} />
      <Character my active def={Kaeya} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 我方行动期间击倒对方角色，获得额外行动
  await c.me.skill(CeremonialBladework);
  await c.opp.chooseActive(oppNext);
  expect(c.state.currentTurn).toBe(0);
  // 消耗额外行动后，行动权交给对方
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("extra actions do not stack", async () => {
  // 规则集：额外行动不可叠加
  // 涉渡（使用后可继续行动）切换到凯亚触发寒冰之棱击倒对方，自由的新风也给予额外行动；两者只算一次
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={2} />
      <Character opp ref={oppNext} />
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Kaeya} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  await c.opp.chooseActive(oppNext);
  c.expect($.my.active).toBeDefinition(Kaeya);
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toNotExist();
  // 第一次额外行动
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  // 不再有第二次额外行动
  expect(c.state.currentTurn).toBe(1);
});

test("fast action does not consume the extra action", async () => {
  // 规则集：快速行动：若行动为快速行动，重新执行行动阶段；（其后）额外行动：若当前轮次玩家具有额外行动，消耗额外行动，重新执行行动阶段
  // 快速行动排在额外行动之前：在快速行动中获得的额外行动会保留到之后的战斗行动才消耗
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={2} />
      <Character opp ref={oppNext} />
      <Character my active def={Kaeya} />
      <Character my ref={myNext} def={Kaeya} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  // 被视为快速行动的切换角色触发寒冰之棱，击倒对方角色获得额外行动
  await c.me.switch(myNext);
  await c.opp.chooseActive(oppNext);
  expect(c.state.currentTurn).toBe(0);
  // 快速行动未消耗额外行动
  expect(c.state.players[1].skipNextTurn).toBe(true);
  // 战斗行动后才消耗额外行动，因此仍由我方行动
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(0);
  expect(c.state.players[1].skipNextTurn).toBe(false);
  // 额外行动已消耗，行动权交给对方
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("opponent declared end: current player keeps acting after combat actions", async () => {
  // 规则集：若对方已宣布结束且当前轮次玩家未宣布结束，重新执行行动阶段
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Kaeya} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(0);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  expect(c.state.roundNumber).toBe(1);
});

test("first to declare end acts first next round (me first)", async () => {
  // 规则集：回合流程 —— 先宣布结束者下回合先手
  const c = setup(
    <State>
      <Character opp active def={Kaeya} />
      <Character my active def={Kaeya} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(1);
});

test("first to declare end acts first next round (opp first)", async () => {
  // 规则集：回合流程 —— 先宣布结束者下回合先手
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={Kaeya} />
      <Character my active def={Kaeya} />
    </State>,
  );
  await c.me.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(CeremonialBladework);
  expect(c.state.currentTurn).toBe(0);
});

test("end phase: both players draw cards", async () => {
  // 规则集：结束阶段 - 抽牌
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my pile def={ChangingShifts} />
      <Card my pile def={ChangingShifts} />
      <Card my pile def={ChangingShifts} />
      <Card opp pile def={ChangingShifts} />
      <Card opp pile def={ChangingShifts} />
      <Card opp pile def={ChangingShifts} />
    </State>,
  );
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
  expect(c.state.players[1].hands).toBeArrayOfSize(0);
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  // 结束阶段双方各抽 2 张
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  expect(c.state.players[0].pile).toBeArrayOfSize(1);
  expect(c.state.players[1].hands).toBeArrayOfSize(2);
  expect(c.state.players[1].pile).toBeArrayOfSize(1);
});

test("round end: duration decreases by 1 and status is disposed at 0", async () => {
  // 规则集：回合结束时 - 所有持续回合-1，弃置持续回合为0的状态
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <CombatStatus my def={ChonghuaFrostField} duration={2} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.combatStatus.def(ChonghuaFrostField)).toHaveVariable({ duration: 1 });
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(3);
  c.expect($.my.combatStatus.def(ChonghuaFrostField)).toNotExist();
});

test("round end: status with duration 1 still triggers its end phase effect before disposal", async () => {
  // 规则集：结束阶段 → 抽牌 → 回合结束时：所有持续回合-1，弃置持续回合为0的状态
  // 攻袭余威（持续回合 1）在结束阶段先造成 2 点穿透伤害，之后才在回合结束时弃置
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} health={10}>
        <Status def={OverawingAssault} duration={1} />
      </Character>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.active).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(OverawingAssault)).toNotExist();
});
