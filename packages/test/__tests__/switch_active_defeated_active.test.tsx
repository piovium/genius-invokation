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

import { ref, setup, Card, Character, CombatStatus, DeclaredEnd, DiceCount, State, $ } from "#test";
import { Aura, DiceType } from "@gi-tcg/core/data";
import { ConsecratedFlyingSerpent, DeathlyCycloneInEffect } from "@gi-tcg/data/internal/characters/anemo/consecrated_flying_serpent.gts";
import { Jahoda, PurrloinedTreasureFlask, PurrloinedTreasureFlaskCryo } from "@gi-tcg/data/internal/characters/anemo/jahoda.gts";
import { Keqing, StarwardSword } from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { BestialAscent, Gaming } from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { expect, test } from "vitest";

test("switch active when opponent active is defeated", async () => {
  const jahoda = ref();
  const myOther = ref();
  const flask = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={Gaming} />
      <Character my def={Jahoda} ref={jahoda} />
      <Character my ref={myOther} />
      <Card my def={PurrloinedTreasureFlask} ref={flask} />
      <Character opp active health={1} ref={oppActive} />
      <Character opp aura={Aura.Cryo} ref={oppNext} />
    </State>,
  );

  // 嘉明 E 击倒对方出战 + 切换到雅珂达，触发“雅珂达切换为出战角色时”事件
  // 手牌「呼噜噜秘藏瓶」读取对方出战角色附着的元素
  // 此时对方出战角色已倒下、附着被清空，所以秘藏瓶读到空附着，保持未转化
  await c.me.skill(BestialAscent);

  // 对面被击倒
  c.expect(oppActive).toHaveVariable({ alive: 0 });
  // 我方成功切人
  c.expect($.my.active).toBe(jahoda);

  // 敌方出战位上是这个已倒下的角色、元素附着被清空
  c.expect($.opp.active.includesDefeated).toBe(oppActive);
  c.expect(oppActive).toHaveVariable({ aura: Aura.None });
  // 秘藏瓶保持未转化
  c.expect(flask).toBeDefinition(PurrloinedTreasureFlask);

  // extra test: 对方选出附着冰元素的新出战角色，我方切走又切回雅珂达，触发一次秘藏瓶转化
  await c.opp.chooseActive(oppNext);
  await c.me.switch(myOther);
  await c.me.switch(jahoda);
  c.expect(flask).toBeDefinition(PurrloinedTreasureFlaskCryo);
});

test("switch active to a defeated character", async () => {
  const myActive = ref();
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      {/* 我方骰子清零，方便观察生成出来的那一个骰子 */}
      <DiceCount my count={0} />
      {/* 前台角色附着火元素，准备被超载 */}
      <Character my active def={ConsecratedFlyingSerpent} aura={Aura.Pyro} ref={myActive} />
      {/* 后台被穿透致死 */}
      <Character my def={Diluc} health={3} ref={myNext} />
      <Character my />
      <CombatStatus my def={DeathlyCycloneInEffect} />
      <Character opp active def={Keqing} energy={3} />
    </State>,
  );

  // 刻晴「天街巡游」：先对我方后台造成 3 点穿透伤害（下一个角色血量归零，但此刻还没判定倒下），
  // 再对带火附着的出战角色造成雷伤触发超载，强制切人到那个 0 血角色。
  await c.opp.skill(StarwardSword);

  // 出战位上站着的是这个刚被切入、又已倒下的角色
  c.expect($.my.active.includesDefeated).toBe(myNext);
  // 他凉了
  c.expect(myNext).toHaveVariable({ alive: 0 });
  // 「亡风啸卷（生效中）」成功触发，生成 1 个 myNext（迪卢克，火）元素类型的骰子
  expect(c.state.players[0].dice).toEqual([DiceType.Pyro]);
});
