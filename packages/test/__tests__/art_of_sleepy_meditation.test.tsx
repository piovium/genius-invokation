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
  ArtOfSleepyMeditation,
  ArtOfSleepyMeditationInEffect,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
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

const diceCount = (c: Controller) => c.state.players[0].dice.length;

test("art of sleepy meditation: select 1 of 3 technique cards and create the in-effect status", async () => {
  // 规则集：困困冥想术 从3张特技牌中挑选1张；生成【困困冥想术（生效中）】
  // 断言：候选恰为 3 张「特技」牌，只有挑中的 1 张入手，并生成生效中状态
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my def={ArtOfSleepyMeditation} />
    </State>,
  );
  await c.me.card(ArtOfSleepyMeditation);
  const rpc = selectCardRpc(c);
  expect(rpc?.request.$case).toBe("selectCard");
  const candidates = rpc!.request.value.candidateDefinitionIds;
  expect(candidates).toBeArrayOfSize(3);
  for (const id of candidates) {
    expect(c.state.data.entities.get(id)?.tags).toContain("technique");
  }
  await c.me.selectCard(candidates[0]);
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    candidates[0],
  ]);
  c.expect($.my.combatStatus.def(ArtOfSleepyMeditationInEffect)).toBeExist();
});

test("art of sleepy meditation in effect: a card not in the initial pile costs 2 less", async () => {
  // 规则集：我方打出名称不存在于本局最初牌组的牌少花费2个元素骰
  // 断言：3 费的派蒙只花费 1 个骰子
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <CombatStatus my def={ArtOfSleepyMeditationInEffect} />
      <Card my def={Paimon} notInitial />
    </State>,
  );
  const before = diceCount(c);
  await c.me.card(Paimon);
  expect(before - diceCount(c)).toBe(1);
});

test("art of sleepy meditation in effect: usage 1, only the next such card is discounted", async () => {
  // 规则集：困困冥想术（生效中） 可用次数：1
  // 断言：第一张减 2 费后状态弃置，第二张按原价 3 费结算
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <CombatStatus my def={ArtOfSleepyMeditationInEffect} />
      <Card my def={Paimon} notInitial />
      <Card my def={Paimon} notInitial />
    </State>,
  );
  const before = diceCount(c);
  await c.me.card(Paimon);
  expect(before - diceCount(c)).toBe(1);
  c.expect($.my.combatStatus.def(ArtOfSleepyMeditationInEffect)).toNotExist();
  const afterFirst = diceCount(c);
  await c.me.card(Paimon);
  expect(afterFirst - diceCount(c)).toBe(3);
});

test("art of sleepy meditation in effect: no discount when the same name is in the initial pile", async () => {
  // 规则集：需要名称不同才能减费
  // 断言：手牌的派蒙并非初始牌组那一张，但初始牌组存在同名牌，因此不减费
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <CombatStatus my def={ArtOfSleepyMeditationInEffect} />
      <Card my pile def={Paimon} />
      <Card my def={Paimon} notInitial />
    </State>,
  );
  const before = diceCount(c);
  await c.me.card(Paimon);
  expect(before - diceCount(c)).toBe(3);
  c.expect($.my.combatStatus.def(ArtOfSleepyMeditationInEffect)).toBeExist();
});
