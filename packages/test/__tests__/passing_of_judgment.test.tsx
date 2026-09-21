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

import { $, Card, Character, CombatStatus, ref, setup, State } from "#test";
import {
  PassingOfJudgment,
  PassingOfJudgmentInEffect,
} from "@gi-tcg/data/internal/cards/event/legend.gts";
import {
  BonecrunchersEnergyBlock,
  LeaveItToMe,
  Strategize,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  SacrificialSword,
  TravelersHandySword,
} from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import { GamblersEarrings } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { IneffectiveWhenPlayed } from "@gi-tcg/data/internal/commons.gts";
import {
  ConsecratedFlyingSerpent,
  SwirlingSquall,
} from "@gi-tcg/data/internal/characters/anemo/consecrated_flying_serpent.gts";
import { expect, test } from "vitest";

test("passing of judgment: creates in-effect status on opp side, lasts 1 round", async () => {
  // 规则集：在对方场上生成【裁定之时（生效中）】；持续回合：1
  // 断言：打出后对方出战状态存在且 duration 为 1，下一回合消失
  const c = setup(
    <State>
      <Card my def={PassingOfJudgment} />
    </State>,
  );
  await c.me.card(PassingOfJudgment);
  c.expect($.opp.combatStatus.def(PassingOfJudgmentInEffect)).toBeExist();
  c.expect($.opp.combatStatus.def(PassingOfJudgmentInEffect)).toHaveVariable({
    duration: 1,
  });
  c.expect($.my.combatStatus.def(PassingOfJudgmentInEffect)).toNotExist();
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.opp.combatStatus.def(PassingOfJudgmentInEffect)).toNotExist();
});

test("passing of judgment in effect: after playing an event card, all event cards in hand become ineffective", async () => {
  // 规则集：①我方打出事件牌后：赋予我方手牌中所有事件牌【无效化】
  // 断言：对方打出事件牌后，其手牌中剩余事件牌均附着「无效化」，非事件牌不附着
  const ev = ref();
  const eq = ref();
  const c = setup(
    <State currentTurn="opp">
      <CombatStatus opp def={PassingOfJudgmentInEffect} />
      <Card opp def={LeaveItToMe} />
      <Card opp def={Strategize} ref={ev} />
      <Card opp def={GamblersEarrings} ref={eq} />
    </State>,
  );
  await c.opp.card(LeaveItToMe);
  c.expect($.opp.hand.with($.attachment.def(IneffectiveWhenPlayed))).toBeCount(1);
  c.expect($.opp.hand.with($.attachment.def(IneffectiveWhenPlayed))).toBe(ev);
  expect(c.state.players[1].hands.find((h) => h.id === eq.id)!.attachments).toBeArrayOfSize(0);
});

test("passing of judgment in effect: effect (1) has no usage limit and triggers on every event card play", async () => {
  // 规则集：注：①效果并没有一次的限制，能多次发动
  // 断言：第一次打出事件牌后，之后新入手的事件牌未被无效化；再次打出事件牌后它也被无效化
  const b = ref();
  const cc = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={ConsecratedFlyingSerpent} />
      <CombatStatus opp def={PassingOfJudgmentInEffect} />
      <Card opp def={LeaveItToMe} />
      <Card opp def={Strategize} ref={b} />
      <Card opp pile def={Strategize} ref={cc} />
    </State>,
  );
  await c.opp.card(LeaveItToMe);
  c.expect($.opp.hand.with($.attachment.def(IneffectiveWhenPlayed))).toBe(b);
  // 用技能抓 1 张牌（cc 入手），此时 cc 不应被无效化
  await c.opp.skill(SwirlingSquall);
  expect(c.state.players[1].hands.map((h) => h.id)).toContain(cc.id);
  c.expect($.opp.hand.with($.attachment.def(IneffectiveWhenPlayed))).toBeCount(1);
  await c.me.end();
  // 第二次打出事件牌（b 已无效化，但仍算打出事件牌）
  await c.opp.card(b);
  c.expect($.opp.hand.with($.attachment.def(IneffectiveWhenPlayed))).toBe(cc);
});

test("passing of judgment in effect: after discarding, 2 highest-cost hand cards go to the bottom of the pile", async () => {
  // 规则集：②我方舍弃手牌后：将我方手牌中2张当前元素骰费用最高|入手最早的卡牌置入牌库底
  // 断言：对方舍弃 1 张（费用 3）后，剩余手牌中费用最高的 2 张（2、1）置入牌库底，费用 0 的牌留在手中
  const high = ref();
  const mid = ref();
  const low = ref();
  const zero = ref();
  const top = ref();
  const c = setup(
    <State currentTurn="opp">
      <CombatStatus opp def={PassingOfJudgmentInEffect} />
      <Card opp def={BonecrunchersEnergyBlock} />
      <Card opp def={SacrificialSword} ref={high} />
      <Card opp def={GamblersEarrings} ref={low} />
      <Card opp def={TravelersHandySword} ref={mid} />
      <Card opp def={LeaveItToMe} ref={zero} />
      <Card opp pile def={GamblersEarrings} ref={top} />
    </State>,
  );
  await c.opp.card(BonecrunchersEnergyBlock);
  const hands = c.state.players[1].hands.map((h) => h.id);
  const pile = c.state.players[1].pile.map((p) => p.id);
  expect(hands).toEqual([zero.id]);
  expect(pile[0]).toBe(top.id);
  expect(pile.slice(1)).toIncludeSameMembers([mid.id, low.id]);
});

test("passing of judgment in effect: cost ties are broken by earliest obtained", async () => {
  // 规则集：②……2张当前元素骰费用最高|入手最早的卡牌置入牌库底
  // 断言：三张同费用手牌中，最早入手的两张置入牌库底，最晚入手的留在手中
  const high = ref();
  const a = ref();
  const b = ref();
  const cc = ref();
  const c = setup(
    <State currentTurn="opp">
      <CombatStatus opp def={PassingOfJudgmentInEffect} />
      <Card opp def={BonecrunchersEnergyBlock} />
      <Card opp def={SacrificialSword} ref={high} />
      <Card opp def={TravelersHandySword} ref={a} />
      <Card opp def={TravelersHandySword} ref={b} />
      <Card opp def={TravelersHandySword} ref={cc} />
      <Card opp pile def={GamblersEarrings} />
    </State>,
  );
  await c.opp.card(BonecrunchersEnergyBlock);
  expect(c.state.players[1].hands.map((h) => h.id)).toEqual([cc.id]);
  expect(c.state.players[1].pile.slice(1).map((p) => p.id)).toIncludeSameMembers([a.id, b.id]);
});
