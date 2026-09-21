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

import { $, Card, Character, Equipment, ref, setup, State } from "#test";
import { EngulfingLightning } from "@gi-tcg/data/internal/cards/equipment/weapon/pole.gts";
import { Paimon, Serene, Timmie } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { GrandNarukamiShrine } from "@gi-tcg/data/internal/cards/support/place.gts";
import { DoughFu, Pyronado, Xiangling } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 规则集：每回合自动触发1次 等价于 【入场时/行动阶段开始时】

test("Timmie: triggers once on enter, once more at next action phase begin", async () => {
  // 提米：每回合自动触发1次：此牌累积1只「鸽子」。
  const timmie = ref();
  const c = setup(
    <State>
      <Card my def={Timmie} ref={timmie} />
    </State>,
  );
  await c.me.card(timmie);
  // 入场时立即触发 1 次：1 只鸽子
  c.expect($.my.support.def(Timmie)).toHaveVariable({ pigeon: 1 });
  await c.me.end();
  await c.opp.end();
  // 下回合行动阶段开始时再触发 1 次：恰好 2 只鸽子（打出当回合不再重复触发）
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.support.def(Timmie)).toHaveVariable({ pigeon: 2 });
});

test("Timmie: 3rd trigger at round 3 action phase begin disposes, draws 1, generates 1 omni", async () => {
  // 提米：如果此牌已累积3只「鸽子」，则弃置此牌，抓1张牌，并生成1点万能元素。
  // 入场 1 次 + 第 2、3 回合行动阶段开始各 1 次 = 3 次
  const timmie = ref();
  const c = setup(
    <State>
      <Card my def={Timmie} ref={timmie} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );
  await c.me.card(timmie);
  await c.me.end();
  await c.opp.end();
  // 第 2 回合：2 只鸽子，尚未弃置；投掷阶段抓 2 张
  c.expect($.my.support.def(Timmie)).toHaveVariable({ pigeon: 2 });
  c.expect($.my.pile).toBeCount(3);
  await c.me.end();
  await c.opp.end();
  // 第 3 回合行动阶段开始：第 3 只鸽子 → 弃置、抓 1 张、生成 1 个万能骰
  expect(c.state.roundNumber).toBe(3);
  c.expect($.my.support.def(Timmie)).toNotExist();
  c.expect($.my.pile).toBeCount(0);
  c.expect($.my.hand).toBeCount(5);
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
});

test("Serene: triggers on enter and at each action phase begin, 3 times in total", async () => {
  // 瑟琳：每回合自动触发1次：将1张随机的「美露莘的声援」放入我方手牌。可用次数：3
  const serene = ref();
  const c = setup(
    <State>
      <Card my def={Serene} ref={serene} />
    </State>,
  );
  await c.me.card(serene);
  // 入场时立即触发 1 次：手牌 1 张（瑟琳已离手）
  c.expect($.my.support.def(Serene)).toBeExist();
  c.expect($.my.hand).toBeCount(1);
  await c.me.end();
  await c.opp.end();
  // 第 2 回合行动阶段开始：第 2 次（牌库为空，投掷阶段不抓牌）
  c.expect($.my.support.def(Serene)).toBeExist();
  c.expect($.my.hand).toBeCount(2);
  await c.me.end();
  await c.opp.end();
  // 第 3 回合行动阶段开始：第 3 次，次数用尽后弃置
  c.expect($.my.hand).toBeCount(3);
  c.expect($.my.support.def(Serene)).toNotExist();
  await c.me.end();
  await c.opp.end();
  // 第 4 回合不再触发
  expect(c.state.roundNumber).toBe(4);
  c.expect($.my.hand).toBeCount(3);
});

test("EngulfingLightning: gains 1 energy immediately on equip when no energy", async () => {
  // 薙草之稻光：每回合自动触发1次：如果所附属角色没有充能，就使其获得1点充能。
  const xiangling = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} energy={0} ref={xiangling} />
      <Card my def={EngulfingLightning} />
    </State>,
  );
  await c.me.card(EngulfingLightning, xiangling);
  // 入场时立即触发 1 次
  c.expect(xiangling).toHaveVariable({ energy: 1 });
});

test("EngulfingLightning: entry trigger is not retried later in the same round", async () => {
  // 触发时机只有【入场时】和【行动阶段开始时】：入场时条件「没有充能」不满足即不触发，
  // 同回合内充能被清空也不会补触发，须等到下回合行动阶段开始。
  const xiangling = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} energy={2} ref={xiangling} />
      <Card my def={EngulfingLightning} />
    </State>,
  );
  await c.me.card(EngulfingLightning, xiangling);
  c.expect(xiangling).toHaveVariable({ energy: 2 });
  // 元素爆发清空充能；本回合不会补触发
  await c.me.skill(Pyronado);
  c.expect(xiangling).toHaveVariable({ energy: 0 });
  await c.opp.end();
  await c.me.end();
  // 下回合行动阶段开始时才触发
  expect(c.state.roundNumber).toBe(2);
  c.expect(xiangling).toHaveVariable({ energy: 1 });
});

test("EngulfingLightning: triggers at each action phase begin, condition rechecked", async () => {
  // 入场时触发 1 次后，之后每回合行动阶段开始时再触发 1 次，每次重新判定条件「没有充能」
  const xiangling = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} energy={0} ref={xiangling} />
      <Card my def={EngulfingLightning} />
    </State>,
  );
  await c.me.card(EngulfingLightning, xiangling);
  c.expect(xiangling).toHaveVariable({ energy: 1 });
  // 普攻 +1 充能 → 2（战斗行动，轮到对方）
  await c.me.skill(DoughFu);
  c.expect(xiangling).toHaveVariable({ energy: 2 });
  await c.opp.end();
  await c.me.end();
  // 第 2 回合行动阶段开始：有充能，不获得
  expect(c.state.roundNumber).toBe(2);
  c.expect(xiangling).toHaveVariable({ energy: 2 });
  // 对方先手结束；元素爆发耗尽充能 → 0
  await c.opp.end();
  await c.me.skill(Pyronado);
  c.expect(xiangling).toHaveVariable({ energy: 0 });
  await c.me.end();
  await c.opp.end();
  // 第 3 回合行动阶段开始：没有充能，获得 1 点
  expect(c.state.roundNumber).toBe(3);
  c.expect(xiangling).toHaveVariable({ energy: 1 });
});

test("EngulfingLightning: already-equipped weapon (not played) triggers at action phase begin", async () => {
  // 未经「打出」而在场的装备：无入场触发，但下回合行动阶段开始时仍触发 1 次
  const xiangling = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} energy={0} ref={xiangling}>
        <Equipment def={EngulfingLightning} />
      </Character>
    </State>,
  );
  c.expect(xiangling).toHaveVariable({ energy: 0 });
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect(xiangling).toHaveVariable({ energy: 1 });
});

test("GrandNarukamiShrine (v5.7.0): 3 triggers in total, on enter and at action phase begin", async () => {
  // 旧版鸣神大社：每回合自动触发1次：生成1个随机的基础元素骰。可用次数：3
  // 3 次 = 入场时 1 次 + 第 2、3 回合行动阶段开始各 1 次
  const shrine = ref();
  const c = setup(
    <State dataVersion="v5.7.0">
      <Card my def={GrandNarukamiShrine} ref={shrine} />
    </State>,
  );
  await c.me.card(shrine);
  // 入场时立即触发：8 个万能骰付掉 2 个后剩 6 个，再生成 1 个基础元素骰（非万能）
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  expect(
    c.state.players[0].dice.filter((d) => d === DiceType.Omni),
  ).toBeArrayOfSize(6);
  await c.me.end();
  await c.opp.end();
  // 第 2 回合：触发在投掷阶段之后（8 个万能骰 + 1 个基础元素骰），说明时机是行动阶段开始时而非回合开始时
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
  c.expect($.my.support.def(GrandNarukamiShrine)).toBeExist();
  await c.me.end();
  await c.opp.end();
  // 第 3 回合：第 3 次触发，可用次数耗尽后弃置
  expect(c.state.roundNumber).toBe(3);
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
  c.expect($.my.support.def(GrandNarukamiShrine)).toNotExist();
  await c.me.end();
  await c.opp.end();
  // 第 4 回合不再触发
  expect(c.state.roundNumber).toBe(4);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
});
