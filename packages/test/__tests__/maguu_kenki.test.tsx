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

import { $, Character, Equipment, ref, setup, State, Summon } from "#test";
import {
  BlusteringBlade,
  MaguuKenki,
  PseudoTenguSweeper,
  ShadowswordLoneGale,
  TranscendentAutomaton,
} from "@gi-tcg/data/internal/characters/anemo/maguu_kenki.gts";
import { test } from "vitest";

test("maguu kenki talent: blustering blade summons and switches to the next character", async () => {
  // 规则集：孤风刀势：召唤剑影·孤风。若装备天赋，切换到下一个角色。
  // 断言：召唤剑影·孤风（可用次数2）并切换到下一个角色，充能记在施放技能的魔偶剑鬼身上
  const kenki = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={MaguuKenki} energy={0} ref={kenki}>
        <Equipment def={TranscendentAutomaton} />
      </Character>
      <Character my ref={next} energy={0} />
    </State>,
  );

  await c.me.skill(BlusteringBlade);

  c.expect($.my.active).toBe(next);
  c.expect($.my.summon.def(ShadowswordLoneGale)).toHaveVariable({ usage: 2 });
  c.expect(kenki).toHaveVariable({ energy: 1 });
  c.expect(next).toHaveVariable({ energy: 0 });
});

test("shadowsword lone gale: deals 1 anemo damage at end phase", async () => {
  // 规则集：剑影·孤风①结束阶段：造成1点风元素伤害。可用次数：2
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={MaguuKenki} />
      <Summon my def={ShadowswordLoneGale} usage={2} />
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect($.my.summon.def(ShadowswordLoneGale)).toHaveVariable({ usage: 1 });
});

test("shadowsword lone gale: deals 1 anemo damage after maguu kenki's burst, without consuming usage", async () => {
  // 规则集：剑影·孤风②我方魔偶剑鬼使用元素爆发后：造成1点风元素伤害
  // 断言：爆发4点风伤 + 剑影1点风伤 = 5，且剑影可用次数不减少
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={MaguuKenki} energy={3} />
      <Summon my def={ShadowswordLoneGale} usage={2} />
    </State>,
  );

  await c.me.skill(PseudoTenguSweeper);

  c.expect($.opp.active).toHaveVariable({ health: 5 });
  c.expect($.my.summon.def(ShadowswordLoneGale)).toHaveVariable({ usage: 2 });
});
