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

import { $, Card, CombatStatus, setup, State } from "#test";
import {
  ElementalResonanceWovenIce,
  ElementalResonanceWovenThunder,
  MoonAndHomeland,
  MoonAndHomelandInEffect01,
  MoonAndHomelandInEffect02,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test("moon and homeland: creates in-effect 1 lasting one round", async () => {
  // 规则集：月与故乡 生成【月与故乡（生效中）1】；持续回合：1
  const c = setup(
    <State>
      <Card my def={MoonAndHomeland} />
    </State>,
  );
  await c.me.card(MoonAndHomeland);
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toHaveVariable({
    duration: 1,
  });
});

test("moon and homeland in-effect 1: consumed by the next non-self card", async () => {
  // 规则集：月与故乡（生效中）1 我方使用不为【月与故乡】的卡牌后：生成【月与故乡（生效中）2】，记录该卡牌；可用次数：1
  const c = setup(
    <State>
      <Card my def={MoonAndHomeland} />
      <Card my def={ElementalResonanceWovenThunder} />
    </State>,
  );
  await c.me.card(MoonAndHomeland);
  // 打出【月与故乡】自身不消耗可用次数
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toBeExist();
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toNotExist();
  await c.me.card(ElementalResonanceWovenThunder);
  // 可用次数 1 用尽后弃置，并生成生效中 2
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toNotExist();
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toBeExist();
});

test("moon and homeland in-effect 1: not consumed by opponent card plays", async () => {
  // 规则集：月与故乡（生效中）1 我方使用不为【月与故乡】的卡牌后：生成【月与故乡（生效中）2】，记录该卡牌
  // 「我方」限定：对方打牌既不消耗可用次数也不记录
  const c = setup(
    <State currentTurn="opp">
      <CombatStatus my def={MoonAndHomelandInEffect01} />
      <Card my def={ElementalResonanceWovenIce} />
      <Card opp def={ElementalResonanceWovenThunder} />
    </State>,
  );
  await c.opp.card(ElementalResonanceWovenThunder);
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toBeExist();
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toNotExist();
  // 换成我方打牌则触发，说明上面不触发不是因为整个效果失效
  await c.opp.end();
  await c.me.card(ElementalResonanceWovenIce);
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toNotExist();
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toBeExist();
});

test("moon and homeland in-effect 2: copies the recorded card at action phase start", async () => {
  // 规则集：月与故乡（生效中）2 行动阶段开始时：获得记录卡牌的复制；可用次数：1
  const c = setup(
    <State>
      <Card my def={MoonAndHomeland} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={ElementalResonanceWovenIce} />
    </State>,
  );
  await c.me.card(MoonAndHomeland);
  await c.me.card(ElementalResonanceWovenThunder);
  // 生效中 1 已用尽，之后打出的牌不再被记录
  await c.me.card(ElementalResonanceWovenIce);
  await c.me.end();
  await c.opp.end();
  // 下一回合行动阶段开始时，只获得所记录的【交织之雷】
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    ElementalResonanceWovenThunder,
  ]);
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toNotExist();
});

test("moon and homeland in-effect 1: expires after one round if unused", async () => {
  // 规则集：月与故乡（生效中）1 持续回合：1
  const c = setup(
    <State>
      <Card my def={MoonAndHomeland} />
    </State>,
  );
  await c.me.card(MoonAndHomeland);
  await c.me.end();
  await c.opp.end();
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect01)).toNotExist();
  c.expect($.my.hand).toBeCount(0);
});

test("moon and homeland: reusing keeps one in-effect 2, the new card overwrites the old", async () => {
  // 规则集：注：重复使用的场合，不同的记录是同一个状态，新的卡牌会覆盖旧的
  const c = setup(
    <State>
      <Card my def={MoonAndHomeland} />
      <Card my def={ElementalResonanceWovenThunder} />
      <Card my def={MoonAndHomeland} />
      <Card my def={ElementalResonanceWovenIce} />
    </State>,
  );
  const findInEffect02 = () =>
    c.state.players[0].combatStatuses.find(
      (st) => st.definition.id === MoonAndHomelandInEffect02,
    );
  await c.me.card(MoonAndHomeland);
  await c.me.card(ElementalResonanceWovenThunder);
  const firstId = findInEffect02()!.id;
  await c.me.card(MoonAndHomeland);
  await c.me.card(ElementalResonanceWovenIce);
  // 是同一个状态实体，而不是新建第二个
  c.expect($.my.combatStatus.def(MoonAndHomelandInEffect02)).toBeCount(1);
  expect(findInEffect02()!.id).toBe(firstId);
  await c.me.end();
  await c.opp.end();
  // 新的记录（交织之冰）覆盖旧的（交织之雷）
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    ElementalResonanceWovenIce,
  ]);
});
