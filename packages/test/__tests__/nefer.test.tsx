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
  Attachment,
  Card,
  Character,
  CombatStatus,
  ref,
  setup,
  State,
} from "#test";
import {
  Nefer,
  SeedsOfDeceit,
  SenetStrategyDanceOfAThousandNights,
  SenetStrategyDanceOfAThousandNightsInEffect,
} from "@gi-tcg/data/internal/characters/dendro/nefer.gts";
import { CostReduction, RES } from "@gi-tcg/data/internal/commons.gts";
import { test } from "vitest";

test("nefer: senet strategy deals damage and attaches res and the in-effect status", async () => {
  // 规则集：弈术·千夜一舞 - 造成1点草元素伤害，附属【抗性】，附属【弈术·千夜一舞（生效中）】
  const nefer = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Nefer} ref={nefer} />
    </State>,
  );
  await c.me.skill(SenetStrategyDanceOfAThousandNights);
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.typeStatus.def(RES).at($.id(nefer.id))).toHaveVariable({
    usage: 1,
  });
  c.expect(
    $.my.combatStatus.def(SenetStrategyDanceOfAThousandNightsInEffect),
  ).toBeExist();
});

test("nefer: in-effect status reduces the cost of at most 3 seeds of deceit", async () => {
  // 规则集：弈术·千夜一舞（生效中）- 我方选择行动前：赋予手牌中至多3张费用最高的【诳言之核】费用降低。可用次数：1
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Nefer} />
      <CombatStatus my def={SenetStrategyDanceOfAThousandNightsInEffect} />
      <Card my def={SeedsOfDeceit} />
      <Card my def={SeedsOfDeceit} />
      <Card my def={SeedsOfDeceit} />
      <Card my def={SeedsOfDeceit} />
    </State>,
  );
  // 我方选择行动前生效
  await c.me.end();
  // 手牌 4 张诳言之核，只有 3 张获得费用降低
  c.expect($.my.attachment.def(CostReduction)).toBeCount(3);
  // 可用次数 1，生效后离场
  c.expect(
    $.my.combatStatus.def(SenetStrategyDanceOfAThousandNightsInEffect),
  ).toNotExist();
});

test("nefer: in-effect status picks the seeds of deceit with the highest current cost", async () => {
  // 规则集：弈术·千夜一舞（生效中）- ……赋予手牌中至多3张**费用最高**的【诳言之核】费用降低
  const reduced = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Nefer} />
      <CombatStatus my def={SenetStrategyDanceOfAThousandNightsInEffect} />
      <Card my def={SeedsOfDeceit} ref={reduced}>
        <Attachment def={CostReduction} />
      </Card>
      <Card my def={SeedsOfDeceit} />
      <Card my def={SeedsOfDeceit} />
      <Card my def={SeedsOfDeceit} />
    </State>,
  );
  await c.me.end();
  // 已减费的一张当前费用最低，不在「费用最高的 3 张」之列，层数保持 1
  c.expect($.my.attachment.on($.id(reduced.id))).toHaveVariable({ layer: 1 });
  // 其余 3 张各获得 1 层，共 4 张带费用降低的手牌
  c.expect($.my.attachment.def(CostReduction)).toBeCount(4);
});

test("nefer: in-effect status does not trigger before the opponent's action", async () => {
  // 规则集：弈术·千夜一舞（生效中）- **我方**选择行动前：赋予手牌中至多3张费用最高的【诳言之核】费用降低
  const c = setup(
    <State currentTurn="opp">
      <Character opp active />
      <Character my active def={Nefer} />
      <CombatStatus my def={SenetStrategyDanceOfAThousandNightsInEffect} />
      <Card my def={SeedsOfDeceit} />
    </State>,
  );
  await c.opp.end().manual();
  c.expect($.my.attachment.def(CostReduction)).toNotExist();
  c.expect(
    $.my.combatStatus.def(SenetStrategyDanceOfAThousandNightsInEffect),
  ).toBeExist();
});
