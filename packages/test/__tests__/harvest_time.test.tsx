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

import { $, Card, Character, CombatStatus, setup, State } from "#test";
import {
  HarvestTime,
  HarvestTimeInEffect,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

type Controller = ReturnType<typeof setup>;

const selectCardRpc = (c: Controller) =>
  (
    c.me as unknown as {
      awaitingRpc: {
        request: { $case: string; value: { candidateDefinitionIds: number[] } };
      } | null;
    }
  ).awaitingRpc;

const selectFirstCandidate = async (c: Controller) => {
  const rpc = selectCardRpc(c);
  expect(rpc?.request.$case).toBe("selectCard");
  const candidates = rpc!.request.value.candidateDefinitionIds;
  await c.me.selectCard(candidates[0]);
  return candidates;
};

test("harvest time: select 1 of 3 food cards and create 1 stack", async () => {
  // 规则集：收获时间 从3张随机料理牌挑选1张，生成1层【收获时间（出战状态）】
  // 断言：候选恰为 3 张「料理」牌，只有挑中的 1 张入手，出战状态层数为 1
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my def={HarvestTime} />
    </State>,
  );
  await c.me.card(HarvestTime);
  const rpc = selectCardRpc(c);
  expect(rpc?.request.$case).toBe("selectCard");
  const candidates = rpc!.request.value.candidateDefinitionIds;
  expect(candidates).toBeArrayOfSize(3);
  for (const id of candidates) {
    expect(c.state.data.entities.get(id)?.tags).toContain("food");
  }
  await c.me.selectCard(candidates[0]);
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    candidates[0],
  ]);
  c.expect($.my.combatStatus.def(HarvestTimeInEffect)).toHaveVariable({
    cardCount: 1,
  });
});

test("harvest time: stacks are capped at 2", async () => {
  // 规则集：收获时间（出战状态）（层数上限：2）
  // 断言：连打 3 张收获时间后层数仍为 2
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my def={HarvestTime} />
      <Card my def={HarvestTime} />
      <Card my def={HarvestTime} />
    </State>,
  );
  await c.me.card(HarvestTime);
  await selectFirstCandidate(c);
  await c.me.card(HarvestTime);
  await selectFirstCandidate(c);
  c.expect($.my.combatStatus.def(HarvestTimeInEffect)).toHaveVariable({
    cardCount: 2,
  });
  await c.me.card(HarvestTime);
  await selectFirstCandidate(c);
  c.expect($.my.combatStatus.def(HarvestTimeInEffect)).toHaveVariable({
    cardCount: 2,
  });
});

test("harvest time in effect: end phase creates X cards into the pile and disposes itself", async () => {
  // 规则集：收获时间（出战状态）结束阶段：生成X张收获时间，随机置入我方牌组，弃置此状态（X为层数）
  // 断言：2 层时结束阶段向我方（而非对方）牌组生成 2 张收获时间（可能被结束阶段抓牌抓走），状态随后消失
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <CombatStatus my def={HarvestTimeInEffect} v={{ cardCount: 2 }} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  const created = [
    ...c.state.players[0].pile,
    ...c.state.players[0].hands,
  ].filter((card) => card.definition.id === HarvestTime);
  expect(created).toBeArrayOfSize(2);
  const oppCreated = [
    ...c.state.players[1].pile,
    ...c.state.players[1].hands,
  ].filter((card) => card.definition.id === HarvestTime);
  expect(oppCreated).toBeArrayOfSize(0);
  c.expect($.my.combatStatus.def(HarvestTimeInEffect)).toNotExist();
});
