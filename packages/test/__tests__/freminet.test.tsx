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

import { Card, Character, Equipment, ref, setup, State, Status, $ } from "#test";
import { GamblersEarrings } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import {
  SacrificialSword,
  TravelersHandySword,
} from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  FlowingEddies,
  Freminet,
  MomentOfWakingAndResolve,
  PersTimer,
  PressurizedFloe,
  SubnauticalHunterMode,
  SubnauticalShield,
} from "@gi-tcg/data/internal/characters/cryo/freminet.gts";
import { expect, test } from "vitest";

test("Freminet: level 2 Pers Timer does not reduce talent card cost", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 2 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );
  const initialDice = c.state.players[0].dice.length;

  await c.me.card(MomentOfWakingAndResolve, freminet);

  expect(c.state.players[0].dice).toHaveLength(initialDice - 3);
});

test("Freminet: level 2 Pers Timer is disposed after playing talent card", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 2 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.card(MomentOfWakingAndResolve, freminet);

  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: level 1 Pers Timer remains after playing talent card", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 1 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.card(MomentOfWakingAndResolve, freminet);

  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.typeStatus.def(PersTimer)).toHaveVariable({ level: 2 });
});

test("Freminet: newly created Pers Timer don't trigger onUseSkill", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 4 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toBeCount(4);
  c.expect($.my.typeStatus.def(PersTimer)).toHaveVariable({ level: 4 });
});

test("Freminet: existing Pers Timer is disposed at level 2", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 0 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 2 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toBeCount(2);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: existing Pers Timer deals Physical DMG and is disposed at level 4", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 0 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 4 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 4 });
  c.expect($.my.hand).toBeCount(4);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: a burned drawn card also adds a Pers Timer layer", async () => {
  // 规则集：佩伊刻计①我方每抓一张牌后/爆一张牌后：累积一层【压力阶级】
  // 断言：手牌已满 10 张时抓到的那张牌被爆掉，佩伊刻计仍累积 1 层
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 0 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(FlowingEddies);

  // 手牌仍为 10 张、牌库已空，说明抓到的牌是被爆掉的
  c.expect($.my.hand).toBeCount(10);
  c.expect($.my.pile).toBeCount(0);
  c.expect($.my.typeStatus.def(PersTimer)).toHaveVariable({ level: 1 });
});

test("Freminet: Pers Timer at level 2 reduces Pressurized Floe cost by 1", async () => {
  // 规则集：佩伊刻计②如果【压力阶级】层数不小于2，所附属角色使用【浮冰增压】少花费1元素骰
  // 断言：3 费的浮冰增压只花掉 2 个骰
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 2 }} />
      </Character>
    </State>,
  );
  const initialDice = c.state.players[0].dice.length;

  await c.me.skill(PressurizedFloe);

  expect(c.state.players[0].dice).toHaveLength(initialDice - 2);
});

test("Freminet: Pers Timer at level 3 is removed without dealing Physical DMG", async () => {
  // 规则集：佩伊刻计③...如果【压力阶级】层数不小于4->造成物理伤害；④...如果层数不小于2->移除此状态
  // 断言：层数 3 属于「移除但不造成伤害」的边界，对方只受到 2 点冰元素伤害
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 3 }} />
      </Character>
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test.fails("Freminet: Pers Timer at level 4 deals 2 Physical DMG", async () => {
  // 规则集：③所附属角色使用【浮冰增压】后：如果【压力阶级】层数不小于4->造成2点物理伤害
  // 当前引擎：freminet.gts:44 为 :damage(DamageType.Physical, 3)，对方剩 5 点而非 6 点。
  // 「2 点」是 v6.4.0 及更早的官方数值（old_versions/v6.4.0.gts:96），v6.5.0 起官方改为 3 点，
  // 即规则集此条滞后于当前版本；触发条件（层数不小于 4）与引擎一致。
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 4 }} />
      </Character>
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  // 2 点冰元素伤害 + 2 点物理伤害
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: Pers Timer going from level 1 to 2 during the skill is removed, without cost cut or DMG", async () => {
  // 规则集：注：层数1的场合，使用技能后，若层数为2，也会移除。此时既不减费也不造成伤害。
  // 断言：层数 1 → 技能结算中抓 1 张牌升到 2 层 → 被移除；浮冰增压仍花 3 个骰，且没有额外物理伤害
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 1 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Card my pile def={Paimon} />
    </State>,
  );
  const initialDice = c.state.players[0].dice.length;

  await c.me.skill(PressurizedFloe);

  // 不减费
  expect(c.state.players[0].dice).toHaveLength(initialDice - 3);
  // 2 点冰元素伤害 + 便携动力锯 1 点加成，没有额外物理伤害
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: Subnautical Hunter Mode grants a shield on every 3rd card drawn", async () => {
  // 规则集：潜猎模式①我方抓1张牌后：累积1层【猎】，然后若层数为3->移除所有【猎】，生成【护盾】
  // 断言：抓 2 张还没有护盾；抓到第 3 张时生成 1 点护盾并清空层数，第 4 张重新累积 1 层
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={SubnauticalHunterMode} />
      </Character>
      <Card my def={Strategize} />
      <Card my def={Strategize} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.card(Strategize);

  c.expect($.my.typeStatus.def(SubnauticalShield)).toNotExist();
  c.expect($.my.typeStatus.def(SubnauticalHunterMode)).toHaveVariable({
    drawnCard: 2,
  });

  await c.me.card(Strategize);

  c.expect($.my.typeStatus.def(SubnauticalShield)).toHaveVariable({
    shield: 1,
  });
  c.expect($.my.typeStatus.def(SubnauticalHunterMode)).toHaveVariable({
    drawnCard: 1,
  });
});

test("Freminet: Subnautical Hunter Mode undraws the 2 highest-cost hand cards, highest at the very bottom", async () => {
  // 规则集：潜猎模式②角色使用【普通攻击】或【元素战技】后：将当前元素骰费用最高|入手最早的至多2张手牌置于牌库低（费用高在底部），抓等量的牌
  // 手牌费用依次为 3 / 2 / 2 / 1：选中 3 费与两张 2 费里入手更早的一张；3 费落在牌库最底部
  const cost3 = ref();
  const cost2a = ref();
  const cost2b = ref();
  const cost1 = ref();
  const p1 = ref();
  const p2 = ref();
  const p3 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={SubnauticalHunterMode} />
      </Character>
      <Card my def={SacrificialSword} ref={cost3} />
      <Card my def={TravelersHandySword} ref={cost2a} />
      <Card my def={TravelersHandySword} ref={cost2b} />
      <Card my def={GamblersEarrings} ref={cost1} />
      <Card my pile def={Paimon} ref={p1} />
      <Card my pile def={Paimon} ref={p2} />
      <Card my pile def={Paimon} ref={p3} />
    </State>,
  );

  await c.me.skill(FlowingEddies);

  // 牌库自顶向底：原第 3 张、入手更早的 2 费、最底部的 3 费
  expect(c.state.players[0].pile.map((p) => p.id)).toEqual([
    p3.id,
    cost2a.id,
    cost3.id,
  ]);
  // 手牌：未被置底的两张 + 从牌库顶抓到的两张
  expect(c.state.players[0].hands.map((h) => h.id)).toEqual([
    cost2b.id,
    cost1.id,
    p1.id,
    p2.id,
  ]);
});

test("Freminet: Subnautical Hunter Mode undraws fewer than 2 cards when the hand is smaller", async () => {
  // 规则集：潜猎模式②...将当前元素骰费用最高|入手最早的至多2张手牌置于牌库低，抓等量的牌
  // 断言：「至多」——手牌只剩 1 张时只置底 1 张、只抓 1 张
  const only = ref();
  const p1 = ref();
  const p2 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={SubnauticalHunterMode} />
      </Character>
      <Card my def={SacrificialSword} ref={only} />
      <Card my pile def={Paimon} ref={p1} />
      <Card my pile def={Paimon} ref={p2} />
    </State>,
  );

  await c.me.skill(FlowingEddies);

  expect(c.state.players[0].pile.map((p) => p.id)).toEqual([p2.id, only.id]);
  expect(c.state.players[0].hands.map((h) => h.id)).toEqual([p1.id]);
});

test("Freminet: Subnautical Hunter Mode ignores a teammate's skill", async () => {
  // 规则集：潜猎模式②「角色」使用【普通攻击】或【元素战技】后：...（指所附属角色）
  // 断言：出战的队友（凯亚）使用普通攻击时不置底也不抓牌，手牌与牌库原样不动
  const held = ref();
  const p1 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Character my def={Freminet}>
        <Status def={SubnauticalHunterMode} />
      </Character>
      <Card my def={SacrificialSword} ref={held} />
      <Card my pile def={Paimon} ref={p1} />
    </State>,
  );

  await c.me.skill(CeremonialBladework);

  expect(c.state.players[0].hands.map((h) => h.id)).toEqual([held.id]);
  expect(c.state.players[0].pile.map((p) => p.id)).toEqual([p1.id]);
});
