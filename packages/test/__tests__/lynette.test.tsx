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

import { $, Character, CombatStatus, setup, State, Summon } from "#test";
import {
  BogglecatBox,
  BogglecatBoxsTaunt,
  Lynette,
  MagicTrickAstonishingShift,
} from "@gi-tcg/data/internal/characters/anemo/lynette.gts";
import {
  CeremonialBladework,
  Frostgnaw,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Guoba } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { Aura, DamageType } from "@gi-tcg/typings";
import { test } from "vitest";

test("bogglecat box: creates the taunt when it enters", async () => {
  // 规则集：惊奇猫猫盒①入场时/行动阶段开始时：生成【惊奇猫猫盒的嘲讽】
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} energy={2} />
    </State>,
  );

  await c.me.skill(MagicTrickAstonishingShift);

  c.expect($.my.summon.def(BogglecatBox)).toBeExist();
  c.expect($.my.combatStatus.def(BogglecatBoxsTaunt)).toBeExist();
});

test("bogglecat box: creates the taunt again at the beginning of the action phase", async () => {
  // 规则集：惊奇猫猫盒①入场时/行动阶段开始时：生成【惊奇猫猫盒的嘲讽】
  // 断言：上回合的嘲讽已用尽，新回合行动阶段开始时重新生成
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} />
      <Summon my def={BogglecatBox} usage={2} />
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect($.my.combatStatus.def(BogglecatBoxsTaunt)).toBeExist();
});

test("bogglecat box: removes the taunt when it leaves the field", async () => {
  // 规则集：惊奇猫猫盒②离场时：移除我方【净焰剑域之护】（整段抄自迪希雅【净焰剑狱领域】，此处应为【惊奇猫猫盒的嘲讽】）
  // 断言：召唤物可用次数耗尽离场后，嘲讽同时被移除（新回合也不会再生成）
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} />
      <Summon my def={BogglecatBox} usage={1} />
      <CombatStatus my def={BogglecatBoxsTaunt} usage={1} />
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect($.my.summon.def(BogglecatBox)).toNotExist();
  c.expect($.my.combatStatus.def(BogglecatBoxsTaunt)).toNotExist();
});

test("bogglecat box: deals 1 anemo damage at end phase", async () => {
  // 规则集：惊奇猫猫盒③结束阶段：造成1点风元素伤害。可用次数：3
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} />
      <Summon my def={BogglecatBox} usage={2} />
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect($.opp.active).toHaveVariable({ health: 9, aura: Aura.None });
  c.expect($.my.summon.def(BogglecatBox)).toHaveVariable({ usage: 1 });
});

test("bogglecat box: is summoned with 2 usages", async () => {
  // 规则集：惊奇猫猫盒③结束阶段：造成1点风元素伤害。可用次数：3
  // 规则集此处①②③整段抄自迪希雅【净焰剑狱领域】（②仍写作移除【净焰剑域之护】，③沿用其「可用次数：3」），
  // 惊奇猫猫盒本身为2，故按2断言
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Lynette} energy={2} />
    </State>,
  );

  await c.me.skill(MagicTrickAstonishingShift);

  c.expect($.my.summon.def(BogglecatBox)).toHaveVariable({ usage: 2 });
});

test("bogglecat box: converts its damage type after my character takes cryo damage", async () => {
  // 规则集：惊奇猫猫盒④我方角色受到冰/水火/雷元素伤害后：若此牌伤害类型为风->转换为对应类型伤害
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active def={Lynette} />
      <Summon my def={BogglecatBox} usage={2} />
    </State>,
  );

  await c.opp.skill(Frostgnaw);

  c.expect($.my.summon.def(BogglecatBox)).toHaveVariable({
    hintIcon: DamageType.Cryo,
  });

  await c.me.end();
  await c.opp.end();

  // 结束阶段改为造成1点冰元素伤害
  c.expect($.opp.active).toHaveVariable({ health: 9, aura: Aura.Cryo });
});

test("bogglecat box: does not convert again once its damage type is no longer anemo", async () => {
  // 规则集：惊奇猫猫盒④我方角色受到冰/水火/雷元素伤害后：若此牌伤害类型为风->转换为对应类型伤害
  // 断言：已转为冰之后，我方角色再受到火元素伤害（锅巴）也不会二次转换
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active def={Lynette} />
      <Summon my def={BogglecatBox} usage={2} />
      <Summon opp def={Guoba} usage={2} />
    </State>,
  );

  await c.opp.skill(Frostgnaw);
  await c.me.end();
  await c.opp.end();

  c.expect($.my.summon.def(BogglecatBox)).toHaveVariable({
    hintIcon: DamageType.Cryo,
  });
});

test("bogglecat box's taunt: reduces the damage taken by my active character by 1, once", async () => {
  // 规则集：惊奇猫猫盒的嘲讽 我方出战角色受到伤害时：伤害值-1 可用次数：1
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active def={Lynette} />
      <CombatStatus my def={BogglecatBoxsTaunt} usage={1} />
    </State>,
  );

  // 霜袭3点冰伤被减免为2点
  await c.opp.skill(Frostgnaw);
  c.expect($.my.active).toHaveVariable({ health: 8 });
  c.expect($.my.combatStatus.def(BogglecatBoxsTaunt)).toNotExist();

  await c.me.end();
  // 可用次数已耗尽，本回合第二次受伤不再减免
  await c.opp.skill(CeremonialBladework);
  c.expect($.my.active).toHaveVariable({ health: 6 });
});
