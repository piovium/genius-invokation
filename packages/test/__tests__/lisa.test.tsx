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
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { $, Character, DiceCount, ref, setup, State, Status } from "#test";
import {
  ConductiveLisa,
  Lisa,
  VioletArc,
} from "@gi-tcg/data/internal/characters/electro/lisa.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("lisa: violet arc consumes conductive stacks", async () => {
  const c = setup(
    <State>
      <Character opp active health={10}>
        <Status def={ConductiveLisa} v={{ conductive: 2 }} />
      </Character>
      <Character my active def={Lisa} />
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(VioletArc);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.opp.active.has($.typeStatus.def(ConductiveLisa))).toNotExist();
});

test("lisa: overload attaches conductive to the character switched in", async () => {
  // 规则集：注：造成超载伤害的场合，会给下一个角色附属【引雷】
  const first = ref();
  const second = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Pyro} ref={first} />
      <Character opp health={10} ref={second} />
      <Character my active def={Lisa} />
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(VioletArc);
  // 苍雷 2 点雷伤 + 超载 2 点，并强制对方切到下一个角色
  c.expect(first).toHaveVariable({ health: 6 });
  c.expect($.opp.active).toBe(second);
  // 引雷附属给超载后的新出战角色
  c.expect($.opp.character.has($.typeStatus.def(ConductiveLisa))).toBe(second);
});

test.fails("lisa: violet arc rechecks conductive after the overload switch", async () => {
  // 规则集：否则：造成2点雷元素伤害，如果敌方出战角色未附属引雷->敌方出战角色附属【引雷】
  // 附属结算时重新判断「敌方出战角色」：超载切入的角色已附属引雷，则不再附属（不叠层）
  // 当前引擎：苍雷在造成伤害前就把「敌方出战角色是否附属引雷」缓存下来，超载切人后不再复查，
  // 直接对新出战角色附属引雷，使其层数由 2 叠加到 3
  const first = ref();
  const second = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Pyro} ref={first} />
      <Character opp health={10} ref={second}>
        <Status def={ConductiveLisa} v={{ conductive: 2 }} />
      </Character>
      <Character my active def={Lisa} />
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(VioletArc);
  c.expect($.opp.active).toBe(second);
  c.expect($.opp.typeStatus.def(ConductiveLisa)).toHaveVariable({
    conductive: 2,
  });
});
