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

import { $, Card, ref, setup, State, Summon, Support } from "#test";
import {
  BrokenSea,
  DisposedSupportAndSummonsCountExtension,
  FellDragon,
  FellDragonsAwakening,
  ToyGuard,
  ToyGuardSummon,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { MiniBaku } from "@gi-tcg/data/internal/characters/anemo/yumemizuki_mizuki.gts";
import { Jinni01 } from "@gi-tcg/data/internal/characters/electro/dori.gts";
import { SingerOfManyWaters } from "@gi-tcg/data/internal/characters/hydro/furina.gts";
import { expect, test } from "vitest";

/** 读取「本局我方支援区/召唤区弃置数」扩展状态，用于确认场景真的弃置了那么多张 */
const disposedCount = (c: ReturnType<typeof setup>) =>
  c.state.extensions.find(
    (ext) => ext.definition.id === DisposedSupportAndSummonsCountExtension,
  )!.state as {
    disposedSupportCount: [number, number];
    disposedSummonsCount: [number, number];
  };

test("fell dragon: enter value from disposed support/summon count", async () => {
  // 规则集：入场时：可用次数+X，攻击力+Y（X 为本局游戏我方支援区弃置数，Y 为我方召唤区弃置数）
  // 本局弃置 2 张支援牌、1 个召唤物 => 可用次数 1+2=3，攻击力 1+1=2
  const s1 = ref();
  const s2 = ref();
  const c = setup(
    <State>
      <Support my def={Paimon} ref={s1} />
      <Support my def={Paimon} ref={s2} />
      <Summon my def={MiniBaku} usage={1} />
      <Card my def={BrokenSea} />
      <Card my def={BrokenSea} />
      <Card my def={FellDragonsAwakening} />
    </State>,
  );
  await c.me.card(BrokenSea, s1);
  await c.me.card(BrokenSea, s2);
  // 结束阶段迷你貘用尽可用次数被弃置，召唤区弃置数 +1
  await c.me.end();
  await c.opp.end();
  await c.me.card(FellDragonsAwakening);
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 3,
    effect: 2,
  });
});

test("fell dragon: values are fixed on enter, later disposal does not change it", async () => {
  // 规则集：注：入场时确定数值，召唤后不会变更
  const s1 = ref();
  const c = setup(
    <State>
      <Support my def={Paimon} ref={s1} />
      <Card my def={FellDragonsAwakening} />
      <Card my def={BrokenSea} />
    </State>,
  );
  await c.me.card(FellDragonsAwakening);
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 1,
    effect: 1,
  });
  await c.me.card(BrokenSea, s1);
  // 入场之后再弃置支援牌，已入场的邪龙数值不变
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 1,
    effect: 1,
  });
});

test("fell dragon: re-summon refreshes usage/effect on the same summon", async () => {
  // 规则集：注：重复召唤刷新召唤物的次数和效果值（是同一个召唤物）
  // 首次入场：已弃置 1 张支援牌、0 个召唤物 => 次数 2、效果 1；
  // 结束阶段结算 1 次（次数回到基础值 1）并弃置 2 个召唤物后重新召唤，
  // 次数与效果值都按当前弃置数重新结算为 1+1=2 与 1+2=3，且仍是同一个召唤物
  const s1 = ref();
  const fellDragonId = () =>
    c.state.players[0].summons.find((s) => s.definition.id === FellDragon)!.id;
  const c = setup(
    <State>
      <Support my def={Paimon} ref={s1} />
      <Summon my def={MiniBaku} usage={1} />
      <Summon my def={Jinni01} usage={1} />
      <Card my def={BrokenSea} />
      <Card my def={FellDragonsAwakening} />
      <Card my def={FellDragonsAwakening} />
    </State>,
  );
  await c.me.card(BrokenSea, s1);
  await c.me.card(FellDragonsAwakening);
  const firstId = fellDragonId();
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 2,
    effect: 1,
  });
  await c.me.end();
  await c.opp.end();
  // 结束阶段：邪龙结算 1 次，另外两个召唤物用尽次数被弃置
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 1,
    effect: 1,
  });
  expect(disposedCount(c).disposedSummonsCount[0]).toBe(2);
  await c.me.card(FellDragonsAwakening);
  // 是同一个召唤物（实体 id 不变，且只有一个）
  c.expect($.my.summon.def(FellDragon)).toBeCount(1);
  expect(fellDragonId()).toBe(firstId);
  // 次数和效果值都被刷新（而非停留在 1 / 1）
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 2,
    effect: 3,
  });
});

test("fell dragon: end phase deals 1 piercing damage, usage 1", async () => {
  // 规则集：结束阶段：造成1点穿透伤害。可用次数：1
  const c = setup(
    <State>
      <Card my def={FellDragonsAwakening} />
    </State>,
  );
  await c.me.card(FellDragonsAwakening);
  await c.me.end();
  await c.opp.end();
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  // 可用次数 1，结算一次后弃置
  c.expect($.my.summon.def(FellDragon)).toNotExist();
});

test("fell dragon: piercing damage equals its effect value", async () => {
  // 规则集：入场时……攻击力+Y；结束阶段：造成1点穿透伤害
  // 攻击力为 3 时结束阶段造成 3 点穿透伤害
  const c = setup(
    <State>
      <Summon my def={FellDragon} usage={2} effect={3} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({ usage: 1 });
});

test.fails("fell dragon: support disposal count caps at 5", async () => {
  // 规则集：①入场时：可用次数+X（X为本局游戏我方支援区弃置数，最大为5）
  // => 本局弃置 5 张支援牌时可用次数应为 1+5=6
  // 当前引擎：X 最多按 4 计入（other.gts 中 `usage 1 { range 5; }`，上限 5），
  // 弃置 5 张支援牌后可用次数仍为 5
  const s1 = ref();
  const s2 = ref();
  const s3 = ref();
  const s4 = ref();
  const s5 = ref();
  const c = setup(
    <State>
      <Support my def={Paimon} ref={s1} />
      <Support my def={Paimon} ref={s2} />
      <Support my def={Paimon} ref={s3} />
      <Support my def={Paimon} ref={s4} />
      <Card my def={BrokenSea} />
      <Card my def={BrokenSea} />
      <Card my def={BrokenSea} />
      <Card my def={BrokenSea} />
      <Card my def={Paimon} ref={s5} />
      <Card my def={BrokenSea} />
      <Card my def={FellDragonsAwakening} />
    </State>,
  );
  await c.me.card(BrokenSea, s1);
  await c.me.card(BrokenSea, s2);
  await c.me.card(BrokenSea, s3);
  await c.me.card(BrokenSea, s4);
  await c.me.card(s5);
  await c.me.card(BrokenSea, s5);
  await c.me.end();
  await c.opp.end();
  await c.me.card(FellDragonsAwakening);
  // 场景前提：本局确实弃置了 5 张支援牌
  expect(disposedCount(c).disposedSupportCount[0]).toBe(5);
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 6,
    effect: 1,
  });
});

test("fell dragon: summon disposal count caps at 4", async () => {
  // 规则集：Y 为本局游戏我方召唤区弃置数，最大为4
  // 本局弃置 5 个召唤物 => 攻击力 1+4=5（不会到 6）
  const c = setup(
    <State>
      <Summon my def={MiniBaku} usage={1} />
      <Summon my def={Jinni01} usage={1} />
      <Summon my def={SingerOfManyWaters} usage={1} />
      <Summon my def={ToyGuardSummon} usage={1} />
      <Card my def={ToyGuard} />
      <Card my def={FellDragonsAwakening} />
    </State>,
  );
  // 第 1 回合结束阶段：4 个召唤物用尽次数被弃置
  await c.me.end();
  await c.opp.end();
  // 第 2 回合重新召唤积木小人（可用次数 2），于第 3 回合结束阶段弃置，累计 5 次
  await c.me.card(ToyGuard);
  await c.me.end();
  await c.opp.end();
  await c.me.end();
  await c.opp.end();
  c.expect($.my.summon).toNotExist();
  // 场景前提：本局确实弃置了 5 个召唤物，否则下面的上限断言无意义
  expect(disposedCount(c).disposedSummonsCount[0]).toBe(5);
  await c.me.card(FellDragonsAwakening);
  c.expect($.my.summon.def(FellDragon)).toHaveVariable({
    usage: 1,
    effect: 5,
  });
});
