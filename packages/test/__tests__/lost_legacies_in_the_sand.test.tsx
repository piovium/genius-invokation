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

import { Card, ref, setup, State } from "#test";
import { LostLegaciesInTheSand } from "@gi-tcg/data/internal/cards/event/legend.gts";
import {
  DisperseTheCalamity,
  SanctifyTheDefiled,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  SacrificialSword,
  TravelersHandySword,
} from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import { GamblersEarrings } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { expect, test } from "vitest";

test("lost legacies in the sand: disperse the calamity puts opp's highest-cost, earliest-obtained card to pile bottom", async () => {
  // 规则集：驱逐灾厄：将敌方1张费用最高|入手最早的卡牌置于牌库底
  // 断言：对方手牌费用 1/3/3，最早入手的费用 3 牌置入对方牌库底，其余留在手中
  const low = ref();
  const first = ref();
  const second = ref();
  const top = ref();
  const c = setup(
    <State>
      <Card my def={LostLegaciesInTheSand} />
      <Card opp def={GamblersEarrings} ref={low} />
      <Card opp def={SacrificialSword} ref={first} />
      <Card opp def={SacrificialSword} ref={second} />
      <Card opp pile def={TravelersHandySword} ref={top} />
    </State>,
  );
  await c.me.card(LostLegaciesInTheSand);
  await c.me.selectCard(DisperseTheCalamity);
  expect(c.state.players[1].hands.map((h) => h.id)).toEqual([low.id, second.id]);
  expect(c.state.players[1].pile.map((p) => p.id)).toEqual([top.id, first.id]);
});

test("lost legacies in the sand: sanctify the defiled puts all X hands to pile bottom, then draws X+1", async () => {
  // 规则集：肃净污染：将X手牌置于牌库底（X为手牌数量），抓X+1张手牌
  // 断言：3 张手牌全部置入牌库底（位于原牌库 4 张之下），随后抓 4 张恰为原牌库顶 4 张，牌库仅剩原手牌
  const a = ref();
  const b = ref();
  const cc = ref();
  const p1 = ref();
  const p2 = ref();
  const p3 = ref();
  const p4 = ref();
  const c = setup(
    <State>
      <Card my def={LostLegaciesInTheSand} />
      <Card my def={GamblersEarrings} ref={a} />
      <Card my def={TravelersHandySword} ref={b} />
      <Card my def={SacrificialSword} ref={cc} />
      <Card my pile def={GamblersEarrings} ref={p1} />
      <Card my pile def={GamblersEarrings} ref={p2} />
      <Card my pile def={GamblersEarrings} ref={p3} />
      <Card my pile def={GamblersEarrings} ref={p4} />
    </State>,
  );
  await c.me.card(LostLegaciesInTheSand);
  await c.me.selectCard(SanctifyTheDefiled);
  expect(c.state.players[0].hands.map((h) => h.id)).toEqual([p1.id, p2.id, p3.id, p4.id]);
  expect(c.state.players[0].pile.map((p) => p.id)).toIncludeSameMembers([a.id, b.id, cc.id]);
});

test.fails("lost legacies in the sand: sanctify the defiled puts hands to pile bottom in obtained order, earliest on top", async () => {
  // 规则集：先入手先放入牌库底，最终在牌库的上方，后入手的在最底部；当前引擎：顺序相反，最晚入手的在上方、最早入手的在最底部
  // 断言：手牌 a、b、cc（按入手先后）置底、抓走原牌库顶 4 张后，牌库自上而下为 [a, b, cc]
  const a = ref();
  const b = ref();
  const cc = ref();
  const c = setup(
    <State>
      <Card my def={LostLegaciesInTheSand} />
      <Card my def={GamblersEarrings} ref={a} />
      <Card my def={TravelersHandySword} ref={b} />
      <Card my def={SacrificialSword} ref={cc} />
      <Card my pile def={GamblersEarrings} />
      <Card my pile def={GamblersEarrings} />
      <Card my pile def={GamblersEarrings} />
      <Card my pile def={GamblersEarrings} />
    </State>,
  );
  await c.me.card(LostLegaciesInTheSand);
  await c.me.selectCard(SanctifyTheDefiled);
  expect(c.state.players[0].pile.map((p) => p.id)).toEqual([a.id, b.id, cc.id]);
});
