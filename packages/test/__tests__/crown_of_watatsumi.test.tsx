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
  Card,
  Character,
  DeclaredEnd,
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { CrownOfWatatsumi } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import { KukiShinobu } from "@gi-tcg/data/internal/characters/electro/kuki_shinobu.gts";
import {
  GuhuaStyle,
  Xingqiu,
} from "@gi-tcg/data/internal/characters/hydro/xingqiu.gts";
import {
  AbyssLectorFathomlessFlames,
  FieryRebirthStatus,
} from "@gi-tcg/data/internal/characters/pyro/abyss_lector_fathomless_flames.gts";
import { Gaming } from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { DiceType } from "@gi-tcg/typings";
import { test } from "vitest";

test("crown of watatsumi: damage bonus is floor(recorded healing / 3)", async () => {
  // 规则集：我方角色受到治疗后：获得等同治疗量【治疗记录】；
  //         角色造成的伤害+X（X为【治疗记录】数量/3，向下取整）
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={Xingqiu} />
      <Character my active def={Xingqiu} health={5} ref={a}>
        <Equipment def={CrownOfWatatsumi} />
      </Character>
      <Character my def={Gaming} health={5} ref={b} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={MondstadtHashBrown} />
      <DiceCount my count={16} type={DiceType.Omni} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  // 记录 2 -> X = 0，古华剑法只造成 2 点物理伤害
  await c.me.skill(GuhuaStyle);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  // 治疗的是后台角色，「我方角色受到治疗」不限于装备者
  await c.me.card(MondstadtHashBrown, b);
  // 记录 4 -> X = 1，伤害 2+1
  await c.me.skill(GuhuaStyle);
  c.expect($.opp.active).toHaveVariable({ health: 5 });
});

test("crown of watatsumi: only the final (non-overflowing) healing is recorded", async () => {
  // 规则集注：计算治疗终值（不计算溢出的治疗量）
  const crown = ref();
  const a = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={Xingqiu} health={9} ref={a}>
        <Equipment def={CrownOfWatatsumi} ref={crown} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  c.expect(a).toHaveVariable({ health: 10 });
  // 蒙德土豆饼治疗 2 点，实际只回复 1 点，只记录 1
  c.expect(crown).toHaveVariable({ healedPts: 1, bubble: 0 });
});

test.fails("crown of watatsumi: a damage bonus of at least 1 consumes all recorded healing", async () => {
  // 规则集：角色造成的伤害+X（X为【治疗记录】数量/3，向下取整），若X不小于1，消耗所有【治疗记录】
  //         注：实现上只记录了治疗量，并没有分成两个状态记录
  // 当前引擎：分成 healedPts 与 bubble 两个变量，只把整 3 的部分折算为 bubble 并在造成伤害时清空，
  //           余数 healedPts（记录 % 3）被保留，与之后的治疗累加后仍能再次提供伤害加成
  const a = ref();
  const b = ref();
  const d = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={Xingqiu} />
      <Character my active def={Xingqiu} health={5} ref={a}>
        <Equipment def={CrownOfWatatsumi} />
      </Character>
      <Character my def={Gaming} health={5} ref={b} />
      <Character my def={KukiShinobu} health={5} ref={d} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={MondstadtHashBrown} />
      <DiceCount my count={16} type={DiceType.Omni} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  await c.me.card(MondstadtHashBrown, b);
  // 记录 4 -> X = 1，伤害 2+1；此时应消耗全部 4 点记录
  await c.me.skill(GuhuaStyle);
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  await c.me.card(MondstadtHashBrown, d);
  // 记录 2 -> X = 0，伤害只有 2 点（引擎保留了余数 1，实际为 2+1）
  await c.me.skill(GuhuaStyle);
  c.expect($.opp.active).toHaveVariable({ health: 5 });
});

test("crown of watatsumi: healing from a defeat-prevention effect equals the character's health", async () => {
  // 规则集注：防止被击倒的效果，治疗量为角色生命值
  const crown = ref();
  const me1 = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Xingqiu} />
      <Character
        my
        active
        def={AbyssLectorFathomlessFlames}
        health={2}
        ref={me1}
      >
        <Equipment def={CrownOfWatatsumi} ref={crown} />
        <Status def={FieryRebirthStatus} />
      </Character>
    </State>,
  );
  await c.opp.skill(GuhuaStyle);
  // 火之新生：免于被击倒并治疗该角色到 4 点生命值，记录的治疗量即角色生命值 4
  // （4 -> 1 个泡沫 + 余 1），而不是 0 点或固定 1 点
  c.expect(me1).toHaveVariable({ health: 4 });
  c.expect(crown).toHaveVariable({ healedPts: 1, bubble: 1 });
});
