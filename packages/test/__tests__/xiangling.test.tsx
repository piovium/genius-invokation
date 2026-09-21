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
  Character,
  CombatStatus,
  DeclaredEnd,
  DiceCount,
  ref,
  setup,
  State,
} from "#test";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  PyronadoStatus,
  Pyronado,
  Xiangling,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { test } from "vitest";

test("pyronado status: deals 2 pyro after any of my characters' skills, 2 usages", async () => {
  // 规则集：旋火轮（出战状态）我方角色使用【旋火轮】以外的技能后：造成2点火元素伤害。可用次数：2
  // 出战角色是凯亚（非香菱），验证「我方角色」而非「香菱」；第三次技能时可用次数已耗尽
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Kaeya} />
      <Character my def={Xiangling} />
      <CombatStatus my def={PyronadoStatus} usage={2} />
      <DiceCount my count={12} />
      <DeclaredEnd opp />
    </State>,
  );
  // 2 点物理 + 旋火轮 2 点火
  await c.me.skill(CeremonialBladework);
  c.expect(target).toHaveVariable({ health: 26 });
  c.expect($.my.combatStatus.def(PyronadoStatus)).toHaveVariable({ usage: 1 });
  await c.me.skill(CeremonialBladework);
  c.expect(target).toHaveVariable({ health: 22 });
  c.expect($.my.combatStatus.def(PyronadoStatus)).toNotExist();
  // 可用次数耗尽，只剩普通攻击的 2 点物理
  await c.me.skill(CeremonialBladework);
  c.expect(target).toHaveVariable({ health: 20 });
});

test("pyronado status: not triggered by Pyronado itself", async () => {
  // 规则集：我方角色使用【旋火轮】以外的技能后：造成2点火元素伤害
  // 香菱使用旋火轮时，已在场的旋火轮状态不触发，只有技能本身的 3 点火伤
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Xiangling} energy={2} />
      <CombatStatus my def={PyronadoStatus} usage={2} />
    </State>,
  );
  await c.me.skill(Pyronado);
  c.expect(target).toHaveVariable({ health: 27 });
});
