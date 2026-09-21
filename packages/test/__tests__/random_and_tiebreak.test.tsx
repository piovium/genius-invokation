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
  AbyssalSummons,
  PlungingStrike,
  StoneAndContracts,
  SunyataFlower,
  TheBestestTravelCompanion,
  TheLegendOfVennessa,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  OceanidMimicSummoning,
  RhodeiaOfLoch,
} from "@gi-tcg/data/internal/characters/hydro/rhodeia_of_loch.gts";
import {
  DanceOnFire,
  SweepingFervor,
  Xinyan,
} from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { expect, test } from "vitest";

// 引擎随机数为 minstd LCG，种子为 0 时永远不变，因此必须使用非 0 种子
const SEED = 12345;

test("random: plain damage skill does not change random", async () => {
  // 规则集：随机数只在随机事件发生时才发生变化
  // 断言：普通攻击造成伤害（无随机效果）后 random 保持不变
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={Xinyan} />
    </State>,
  );
  await c.me.skill(DanceOnFire);
  expect(c.state.iterators.random).toBe(SEED);
});

test("random: switching, tuning and declaring end do not change random", async () => {
  // 规则集：随机数只在随机事件发生时才发生变化
  // 断言：切换角色、元素调和、宣布结束都不是随机事件，random 保持不变
  const next = ref();
  const card = ref();
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={Xinyan} />
      <Character my ref={next} />
      <Card my def={StoneAndContracts} ref={card} />
    </State>,
  );
  await c.me.switch(next);
  await c.opp.end();
  await c.me.tune(card);
  await c.me.end();
  expect(c.state.iterators.random).toBe(SEED);
});

test("random: round-begin dice roll changes random", async () => {
  // 规则集：随机事件包括：投掷骰子：如 回合开始投掷
  // 测试框架默认投出全万能骰（不消耗随机数），此处关闭该配置以进行真实投掷
  // 断言：进入下一回合投掷阶段后 random 发生变化
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
    </State>,
  );
  for (const player of c.game.players) {
    player.config = { ...player.config, alwaysOmni: false };
  }
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.iterators.random).not.toBe(SEED);
});

test("random: SunyataFlower (random result) changes random", async () => {
  // 规则集：随机事件包括：随机结果：如：净觉花
  // 断言：打出净觉花（随机生成 2 张支援牌）后 random 发生变化
  const paimon = ref();
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={Paimon} ref={paimon} />
      <Card my def={SunyataFlower} />
    </State>,
  );
  await c.me.card(SunyataFlower, paimon);
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  expect(c.state.iterators.random).not.toBe(SEED);
});

test("random: AbyssalSummons (random result) changes random", async () => {
  // 规则集：随机事件包括：随机结果：如：深渊的呼唤
  // 断言：打出深渊的呼唤（随机召唤丘丘人）后 random 发生变化
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Card my def={AbyssalSummons} />
    </State>,
  );
  await c.me.card(AbyssalSummons);
  expect(c.state.players[0].summons).toBeArrayOfSize(1);
  expect(c.state.iterators.random).not.toBe(SEED);
});

test("random: OceanidMimicSummoning (random result) changes random", async () => {
  // 规则集：随机事件包括：随机结果：如：纯水幻形
  // 断言：使用纯水幻造（随机召唤纯水幻形）后 random 发生变化
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={RhodeiaOfLoch} />
    </State>,
  );
  await c.me.skill(OceanidMimicSummoning);
  expect(c.state.players[0].summons).toBeArrayOfSize(1);
  expect(c.state.iterators.random).not.toBe(SEED);
});

test("random: random discard of hand card changes random", async () => {
  // 规则集：随机事件包括：随机结果：如：随机弃置手牌
  // 断言：热情拂扫随机舍弃 1 张费用最高的手牌后 random 发生变化
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={Xinyan} />
      <Card my def={StoneAndContracts} />
      <Card my def={PlungingStrike} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  expect(c.state.players[0].hands).toBeArrayOfSize(1);
  expect(c.state.iterators.random).not.toBe(SEED);
});

test.fails(
  "random: TheBestestTravelCompanion changes random although no random event",
  async () => {
    // 规则集：特例：使用【最好的伙伴】虽然没有随机事件，但也会修改随机数
    // 当前引擎：该牌为 :generateDice(DiceType.Omni, 2)，skill_context.ts generateDice 对
    // 非 "randomElement" 走 fill 分支，出牌全程不调用 stepRandom，random 保持不变
    // 断言：打出最好的伙伴后 random 发生变化
    const c = setup(
      <State random={SEED}>
        <Character opp active />
        <Character my active />
        <Card my def={TheBestestTravelCompanion} />
      </State>,
    );
    await c.me.card(TheBestestTravelCompanion);
    expect(c.state.players[0].dice).toBeArrayOfSize(8);
    expect(c.state.iterators.random).not.toBe(SEED);
  },
);

test("random discard: chosen max-cost hand card is stable while random is unchanged", async () => {
  // 规则集：确定舍弃的手牌不会改变，除非：费用最高的手牌数量变化 / 随机数变化
  // 断言：3 张同为 3 费的手牌，中间插入非随机行动（普通攻击、对方宣布结束）后，
  // 随机舍弃选中的仍是同一张牌
  const build = () =>
    setup(
      <State random={SEED}>
        <Character opp active />
        <Character my active def={Xinyan} />
        <Card my def={StoneAndContracts} />
        <Card my def={PlungingStrike} />
        <Card my def={TheLegendOfVennessa} />
      </State>,
    );
  const remainingDefs = (c: ReturnType<typeof setup>) =>
    c.state.players[0].hands.map((h) => h.definition.id);

  const c1 = build();
  await c1.me.skill(SweepingFervor);
  const remaining1 = remainingDefs(c1);
  expect(remaining1).toBeArrayOfSize(2);

  const c2 = build();
  await c2.me.skill(DanceOnFire);
  await c2.opp.end();
  expect(c2.state.iterators.random).toBe(SEED);
  await c2.me.skill(SweepingFervor);
  expect(remainingDefs(c2)).toEqual(remaining1);
});

// 费用最高的三张手牌，均为 3 费
const MAX_COST_CARDS = [StoneAndContracts, PlungingStrike, TheLegendOfVennessa];

const discardedMaxCostCard = (c: ReturnType<typeof setup>) => {
  const remaining = c.state.players[0].hands.map((h) => h.definition.id);
  const discarded = MAX_COST_CARDS.filter((def) => !remaining.includes(def));
  expect(discarded).toBeArrayOfSize(1);
  return discarded[0];
};

test("random discard: an extra cheaper hand card does not change the chosen card", async () => {
  // 规则集：弃置牌的选取和 费用最高的手牌数量 以及随机数 有关；弃置牌的索引x = rand(N)（N为费用最高的手牌数量）
  // 断言：手上多 1 张 2 费牌（N 与随机数都没变）时，被舍弃的仍是同一张 3 费牌，且 2 费牌不会被选中
  const withoutCheapCard = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={Xinyan} />
      <Card my def={StoneAndContracts} />
      <Card my def={PlungingStrike} />
      <Card my def={TheLegendOfVennessa} />
    </State>,
  );
  await withoutCheapCard.me.skill(SweepingFervor);

  const withCheapCard = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active def={Xinyan} />
      <Card my def={StoneAndContracts} />
      <Card my def={PlungingStrike} />
      <Card my def={TheLegendOfVennessa} />
      <Card my def={TheBestestTravelCompanion} />
    </State>,
  );
  await withCheapCard.me.skill(SweepingFervor);
  expect(
    withCheapCard.state.players[0].hands.map((h) => h.definition.id),
  ).toContain(TheBestestTravelCompanion);
  expect(discardedMaxCostCard(withCheapCard)).toBe(
    discardedMaxCostCard(withoutCheapCard),
  );
});
