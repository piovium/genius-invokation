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

import { $, Character, ref, setup, State, Summon } from "#test";
import { TideTurningSacredLord } from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { BakeKurage } from "@gi-tcg/data/internal/characters/hydro/sangonomiya_kokomi.gts";
import { expect, test } from "vitest";

type Ctx = ReturnType<typeof setup>;

/** 读取任意一方某角色的当前生命值 */
function healthOf(c: Ctx, r: ReturnType<typeof ref>) {
  return c.state.players
    .flatMap((p) => p.characters)
    .find((ch) => ch.id === r.id)!.variables.health;
}

test("tide-turning sacred lord: deals 2 piercing damage at end phase, usable 3 times", async () => {
  // 规则集：回天的圣主 ①结束阶段：造成2点穿透伤害。可用次数：3
  // 断言：每个结束阶段对敌方出战角色造成 2 点穿透伤害并消耗 1 次可用次数，3 次用尽后此牌被弃置
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={8} />
      <Character opp health={5} />
      <Character opp health={5} />
      <Character my active />
      <Summon my def={TideTurningSacredLord} />
    </State>,
  );
  c.expect($.my.summon.def(TideTurningSacredLord)).toHaveVariable({ usage: 3 });
  await c.me.end();
  await c.opp.end();
  c.expect(oppActive).toHaveVariable({ health: 6 });
  c.expect($.my.summon.def(TideTurningSacredLord)).toHaveVariable({ usage: 2 });
  await c.me.end();
  await c.opp.end();
  c.expect(oppActive).toHaveVariable({ health: 4 });
  c.expect($.my.summon.def(TideTurningSacredLord)).toHaveVariable({ usage: 1 });
  await c.me.end();
  await c.opp.end();
  c.expect(oppActive).toHaveVariable({ health: 2 });
  c.expect($.my.summon.def(TideTurningSacredLord)).toNotExist();
});

test.fails("tide-turning sacred lord: deals 5 piercing damage to the highest-health character when disposed", async () => {
  // 规则集：②此牌被弃置后：对场上生命值最高|敌方优先的一名角色造成5点穿透伤害
  // 当前引擎：目标选择相同（命中生命值最高的我方出战角色），但只造成 3 点穿透伤害，
  //           实测 9 点生命剩 6 点；5 点的定义只保留在 old_versions/v6.7.0.gts 中
  // 断言：可用次数耗尽被弃置后，场上生命值最高的我方出战角色（9 点）受到 5 点穿透伤害 → 4 点
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={4} />
      <Character opp health={3} />
      <Character opp health={3} />
      <Character my active ref={myActive} health={9} />
      <Character my health={8} />
      <Character my health={8} />
      <Summon my def={TideTurningSacredLord} usage={1} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  // ① 先结算：敌方出战角色受到 2 点穿透伤害
  c.expect(oppActive).toHaveVariable({ health: 2 });
  c.expect($.my.summon.def(TideTurningSacredLord)).toNotExist();
  c.expect(myActive).toHaveVariable({ health: 4 });
});

test("tide-turning sacred lord: disposal damage prefers the opposing player, then active, then next", async () => {
  // 规则集：注：②效果发动时，不遵循当前回合，而是敌方玩家优先，再按照出战角色-下一个角色的顺序
  // 断言：生命值并列最高（均为 10）时，目标不是我方角色而是敌方角色；
  //       敌方出战角色已被 ① 打到 8 点不再是最高，于是命中敌方「下一个角色」而非再下一个
  //       （伤害数值由另一个 test 断言，此处只验证目标选择顺序）
  const myActive = ref();
  const myNext = ref();
  const myPrev = ref();
  const oppActive = ref();
  const oppNext = ref();
  const oppPrev = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character opp ref={oppPrev} health={10} />
      <Character my active ref={myActive} health={10} />
      <Character my ref={myNext} health={10} />
      <Character my ref={myPrev} health={10} />
      <Summon my def={TideTurningSacredLord} usage={1} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.summon.def(TideTurningSacredLord)).toNotExist();
  c.expect(oppActive).toHaveVariable({ health: 8 });
  expect(healthOf(c, oppNext)).toBeLessThan(10);
  expect(healthOf(c, oppPrev)).toBe(10);
  expect(healthOf(c, myActive)).toBe(10);
  expect(healthOf(c, myNext)).toBe(10);
  expect(healthOf(c, myPrev)).toBe(10);
});

test("tide-turning sacred lord: disposal target is relative to the card owner, not to the current turn player", async () => {
  // 规则集：注：②效果发动时，不遵循当前回合，而是敌方玩家优先，再按照出战角色-下一个角色的顺序
  // 断言：召唤物归对方所有、且对方先宣布结束（结束阶段中对方为当前轮次玩家）时，
  //       并列最高（10 点）的目标仍取「此牌拥有者的敌方」= 我方角色，而不是当前轮次玩家自己的角色；
  //       我方出战角色已被 ① 打到 8 点，于是命中我方「下一个角色」
  const myActive = ref();
  const myNext = ref();
  const myPrev = ref();
  const oppActive = ref();
  const oppNext = ref();
  const oppPrev = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character opp ref={oppPrev} health={10} />
      <Character my active ref={myActive} health={10} />
      <Character my ref={myNext} health={10} />
      <Character my ref={myPrev} health={10} />
      <Summon opp def={TideTurningSacredLord} usage={1} />
    </State>,
  );
  await c.opp.end();
  await c.me.end();
  c.expect($.opp.summon.def(TideTurningSacredLord)).toNotExist();
  c.expect(myActive).toHaveVariable({ health: 8 });
  expect(healthOf(c, myNext)).toBeLessThan(10);
  expect(healthOf(c, myPrev)).toBe(10);
  expect(healthOf(c, oppActive)).toBe(10);
  expect(healthOf(c, oppNext)).toBe(10);
  expect(healthOf(c, oppPrev)).toBe(10);
});

test("tide-turning sacred lord: the disposal effect resolves before later end-phase effects", async () => {
  // 规则集：注：②效果发动时，墓地（被弃置牌）的优先级较高（同弹头等）
  // 断言：先入场的回天的圣主在结束阶段用尽次数被弃置后，②立即结算：
  //       此时我方出战角色 8 点与敌方出战角色 8 点并列最高 → 敌方优先，命中敌方出战角色；
  //       随后才轮到后入场的化海月（治疗我方出战角色 1 点）→ 我方出战角色 9 点且从未受伤。
  //       若②被推迟到化海月之后结算，我方出战角色会先被治疗到 9 点成为唯一最高而挨这一下
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10} />
      <Character opp health={3} />
      <Character opp health={3} />
      <Character my active ref={myActive} health={8} />
      <Character my health={3} />
      <Character my health={3} />
      <Summon my def={TideTurningSacredLord} usage={1} />
      <Summon my def={BakeKurage} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.summon.def(TideTurningSacredLord)).toNotExist();
  c.expect(myActive).toHaveVariable({ health: 9 });
  // ① 2 点 + ② 穿透 + 化海月 1 点水伤都落在敌方出战角色身上
  expect(healthOf(c, oppActive)).toBeLessThan(7);
});

test("tide-turning sacred lord: disposal target is the owner's enemy, not the current turn player's enemy", async () => {
  // 规则集：注：②效果发动时，不遵循当前回合，而是敌方玩家优先，再按照出战角色-下一个角色的顺序
  // 断言：对方先宣布结束（结束阶段中对方为当前轮次玩家），而召唤物归我方所有；
  //       生命值并列最高（10 点）时命中的是「召唤物拥有者的敌方」= 对方角色，
  //       而不是「当前轮次玩家的对方」= 我方角色（此场景下两种解释结论相反，故可区分）
  const myActive = ref();
  const myNext = ref();
  const myPrev = ref();
  const oppActive = ref();
  const oppNext = ref();
  const oppPrev = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character opp ref={oppPrev} health={10} />
      <Character my active ref={myActive} health={10} />
      <Character my ref={myNext} health={10} />
      <Character my ref={myPrev} health={10} />
      <Summon my def={TideTurningSacredLord} usage={1} />
    </State>,
  );
  await c.opp.end();
  await c.me.end();
  c.expect($.my.summon.def(TideTurningSacredLord)).toNotExist();
  // ① 打在对方出战角色上，使其 10 → 8，不再是生命值最高
  c.expect(oppActive).toHaveVariable({ health: 8 });
  expect(healthOf(c, oppNext)).toBeLessThan(10);
  expect(healthOf(c, oppPrev)).toBe(10);
  expect(healthOf(c, myActive)).toBe(10);
  expect(healthOf(c, myNext)).toBe(10);
  expect(healthOf(c, myPrev)).toBe(10);
});
