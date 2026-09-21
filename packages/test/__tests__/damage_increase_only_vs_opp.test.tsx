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

import { $, Card, Character, CombatStatus, ref, setup, State } from "#test";
import { Revelry } from "@gi-tcg/data/internal/characters/hydro/furina.gts";
import {
  FatuiAmbusherPyroslingerBracer,
  Tada,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import { VanguardsCoordinatedTacticsInEffect } from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { PhysicalDmgIncrease } from "@gi-tcg/data/internal/characters/cryo/mika.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

// 规则集：所有我方造成伤害增加的能力均具有隐藏条件（我方对对方造成的伤害），我方对我方造成的伤害无法触发。
// 这些能力的描述都不写目标限制（「我方造成的伤害+1」），故用「我方实体对我方角色造成的非穿透伤害」检验隐藏条件。

test("damage increase applies to damage dealt to the opponent but not to my own character", async () => {
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={myActive} health={10} />
      <Character opp active def={Kaeya} ref={oppActive} health={10} />
      {/* 狂欢值：我方造成的伤害+1 */}
      <CombatStatus my def={Revelry} usage={2} />
      {/* 愚人众伏兵·火铳游击兵：所在阵营的角色使用技能后，对所在阵营的出战角色造成 1 点火元素伤害 */}
      <CombatStatus my def={FatuiAmbusherPyroslingerBracer} usage={2} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  // 对对方造成的伤害：2 物理 + 1 狂欢值 = 3
  c.expect(oppActive).toHaveVariable({ health: 7 });
  // 我方对我方造成的伤害：1 火元素，不增伤
  c.expect(myActive).toHaveVariable({ health: 9 });
  // 狂欢值只被「对对方的伤害」消耗了 1 次
  c.expect($.my.combatStatus.def(Revelry)).toHaveVariable({ usage: 1 });
});

test("damage increase is not applied to same-element damage dealt to my own character", async () => {
  const klee = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Klee} ref={klee} health={10} />
      <Character opp active def={Kaeya} ref={oppActive} health={10} />
      {/* 尖兵协同战法（生效中）：我方造成的火元素伤害或雷元素伤害+1 */}
      <CombatStatus my def={VanguardsCoordinatedTacticsInEffect} usage={2} />
      <CombatStatus my def={FatuiAmbusherPyroslingerBracer} usage={2} />
    </State>,
  );
  // 同一次技能里发生两笔 1 点火元素伤害，唯一区别是伤害目标属于哪一方
  await c.me.skill(Kaboom);
  // 砰砰对对方出战角色：1 + 1 = 2
  c.expect(oppActive).toHaveVariable({ health: 8 });
  // 伏兵对我方出战角色：1，不增伤
  c.expect(klee).toHaveVariable({ health: 9 });
  c.expect(
    $.my.combatStatus.def(VanguardsCoordinatedTacticsInEffect),
  ).toHaveVariable({
    usage: 1,
  });
});

test("damage increase is not applied to damage an event card deals to my own active character", async () => {
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={myActive} health={10} />
      <Character opp active def={Kaeya} ref={oppActive} health={10} />
      {/* 速射牵制（生效中）：我方造成的物理伤害+1，可用次数 1 */}
      <CombatStatus my def={PhysicalDmgIncrease} usage={1} />
      {/* 噔噔！：对我方「出战角色」造成 1 点物理伤害 */}
      <Card my def={Tada} />
    </State>,
  );
  await c.me.card(Tada);
  // 我方事件牌对我方出战角色造成的物理伤害：1，不增伤
  c.expect(myActive).toHaveVariable({ health: 9 });
  // 可用次数未被消耗，增伤能力仍在场
  c.expect($.my.combatStatus.def(PhysicalDmgIncrease)).toHaveVariable({
    usage: 1,
  });
  // 对照：同样是物理伤害，打到对方就 +1，并消耗掉唯一的可用次数
  await c.me.skill(CeremonialBladework);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect($.my.combatStatus.def(PhysicalDmgIncrease)).toNotExist();
});

test("damage increase does not apply to my own character even when the damage triggers a reaction", async () => {
  const myActive = ref();
  const c = setup(
    <State>
      <Character
        my
        active
        def={Kaeya}
        ref={myActive}
        health={10}
        aura={Aura.Cryo}
      />
      <Character opp active def={Kaeya} health={10} />
      <CombatStatus my def={Revelry} usage={3} />
      <CombatStatus my def={FatuiAmbusherPyroslingerBracer} usage={2} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  // 我方对我方：1 火 + 融化 2 = 3，不再 +1
  c.expect(myActive).toHaveVariable({ health: 7 });
  // 只有对对方的普通攻击消耗了 1 次狂欢值
  c.expect($.my.combatStatus.def(Revelry)).toHaveVariable({ usage: 2 });
});
