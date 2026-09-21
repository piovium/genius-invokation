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

import { ref, setup, State, Character, Status, DeclaredEnd, DiceCount } from "#test";
import {
  GluttonousYumkasaurMountainKing,
  CrushingTailAttack,
  WellFedAndStrong,
  WellFedAndSturdy,
} from "@gi-tcg/data/internal/characters/dendro/gluttonous_yumkasaur_mountain_king.gts";
import { Kaeya, CeremonialBladework } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { test } from "vitest";

test("well fed and strong: +1 damage and consumes one layer", async () => {
  // 规则集：食足力增 造成伤害时：伤害+1。可用次数：1
  // 断言：1 层时普攻 2 物理 → 3；触发后状态弃置
  const target = ref();
  const strong = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target} />
      <Character my active def={GluttonousYumkasaurMountainKing}>
        <Status def={WellFedAndStrong} usage={1} ref={strong} />
      </Character>
    </State>,
  );
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(strong).toNotExist();
});

test.fails("well fed and strong: stacks without cap, each damage consumes exactly one layer", async () => {
  // 规则集：食足力增 造成伤害时：伤害+1。可用次数：1（无上限）；当前引擎：自 v6.0.0 起每次伤害最多同时生效 2 层（+2 并消耗 2 层），v5.8.0 版本数据仍为每次 +1（见下一 test）
  // 断言：3 层时每次伤害只 +1、只减 1 层，三次伤害后耗尽
  const target = ref();
  const strong = ref();
  const c = setup(
    <State>
      <Character opp active health={20} ref={target} />
      <DeclaredEnd opp />
      <Character my active def={GluttonousYumkasaurMountainKing}>
        <Status def={WellFedAndStrong} usage={3} ref={strong} />
      </Character>
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 17 });
  c.expect(strong).toHaveVariable({ usage: 2 });
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 14 });
  c.expect(strong).toHaveVariable({ usage: 1 });
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 11 });
  c.expect(strong).toNotExist();
});

test("well fed and sturdy: -1 damage per hit, each hit consumes one layer", async () => {
  // 规则集：食足体健 受到伤害时：伤害-1。可用次数：1（无上限）
  // 断言：2 层时每次受伤只 -1、只减 1 层；耗尽后不再减伤
  const king = ref();
  const sturdy = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <DiceCount opp count={12} />
      <Character my active def={GluttonousYumkasaurMountainKing} health={8} ref={king}>
        <Status def={WellFedAndSturdy} usage={2} ref={sturdy} />
      </Character>
      <DeclaredEnd my />
    </State>,
  );
  await c.opp.skill(CeremonialBladework);
  c.expect(king).toHaveVariable({ health: 7 });
  c.expect(sturdy).toHaveVariable({ usage: 1 });
  await c.opp.skill(CeremonialBladework);
  c.expect(king).toHaveVariable({ health: 6 });
  c.expect(sturdy).toNotExist();
  await c.opp.skill(CeremonialBladework);
  c.expect(king).toHaveVariable({ health: 4 });
});

test("well fed and strong (v5.8.0 data): each damage +1 and consumes exactly one layer", async () => {
  // 规则集：食足力增 造成伤害时：伤害+1。可用次数：1（无上限）
  // 断言：规则集对应 v5.8.0 版本文本，使用该版本数据时 3 层每次伤害只 +1、只减 1 层
  const target = ref();
  const strong = ref();
  const c = setup(
    <State dataVersion="v5.8.0">
      <Character opp active health={20} ref={target} />
      <DeclaredEnd opp />
      <Character my active def={GluttonousYumkasaurMountainKing}>
        <Status def={WellFedAndStrong} usage={3} ref={strong} />
      </Character>
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 17 });
  c.expect(strong).toHaveVariable({ usage: 2 });
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 14 });
  c.expect(strong).toHaveVariable({ usage: 1 });
  await c.me.skill(CrushingTailAttack);
  c.expect(target).toHaveVariable({ health: 11 });
  c.expect(strong).toNotExist();
});
