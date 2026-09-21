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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import { FrostflakeArrow, Ganyu, UndividedHeart } from "@gi-tcg/data/internal/characters/cryo/ganyu.gts";
import { CeremonialBladework, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { AgileSwitch, EfficientSwitch } from "@gi-tcg/data/internal/commons.gts";
import { test } from "vitest";

test("ganyu: FrostflakeArrow usage clear after defeated", async () => {
  const ganyu = ref();
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active health={10} def={Kaeya} />
      <Character opp health={10} />
      <Character opp health={10} />
      <Character my active def={Ganyu} ref={ganyu} health={1} />
      <Character my ref={myNext} />
      <CombatStatus my def={AgileSwitch} />
      <CombatStatus my def={EfficientSwitch} />
      <Card my def={TeyvatFriedEgg} />
      <Card my def={UndividedHeart} />
      <DiceCount my count={12} />
    </State>
  );
  await c.me.skill(FrostflakeArrow);
  c.expect($.opp.next).toHaveVariable({ health: 8 });
  await c.opp.skill(CeremonialBladework);
  await c.me.chooseActive(myNext);
  await c.me.card(TeyvatFriedEgg, ganyu);
  await c.me.switch(ganyu);
  await c.me.card(UndividedHeart, ganyu);
  // 不触发天赋，仍然是后台-2
  c.expect($.opp.next).toHaveVariable({ health: 6 });
});

test("ganyu: talent raises piercing damage to 3 when FrostflakeArrow was used before", async () => {
  // 规则：注：角色被击倒会清空使用列表，复活后技能无法触发天赋（此处验证未被击倒时「使用列表」正常生效）
  const oppNext = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character opp health={10} />
      <Character my active def={Ganyu}>
        <Equipment def={UndividedHeart} />
      </Character>
      <DiceCount my count={16} />
    </State>,
  );
  // 本场对局首次使用：后台穿透 2 点
  await c.me.skill(FrostflakeArrow);
  c.expect(oppNext).toHaveVariable({ health: 8 });
  // 已在使用列表中：后台穿透改为 3 点
  await c.me.skill(FrostflakeArrow);
  c.expect(oppNext).toHaveVariable({ health: 5 });
});
