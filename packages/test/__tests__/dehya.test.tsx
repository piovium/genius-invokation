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
  ref,
  setup,
  State,
  Summon,
} from "#test";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  Dehya,
  FierySanctumField,
  FierySanctumsProtection,
  MoltenInferno,
} from "@gi-tcg/data/internal/characters/pyro/dehya.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { test } from "vitest";

test("fiery sanctum's protection: decreases 1 damage, then redmane's blood removes it and pierces Dehya", async () => {
  // 规则集：净焰剑域之护①我方出战角色受到伤害时：若迪希雅在后台，伤害-1。可用次数：1（耗尽时不弃置）
  // 规则集：赤鬃之血①我方角色受到伤害后：若【净焰剑域之护】可用次数为0->移除我方【净焰剑域之护】，然后若迪希雅生命值至少为7->对迪希雅造成1点穿透伤害
  const myActive = ref();
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Kaeya} ref={myActive} />
      <Character my def={Dehya} ref={dehya} health={10} />
      <CombatStatus my def={FierySanctumsProtection} usage={1} />
    </State>,
  );
  // 2 点物理 -1 => 1 点
  await c.opp.skill(TemperedSword);
  c.expect(myActive).toHaveVariable({ health: 9 });
  // 可用次数归零后被赤鬃之血移除，并对迪希雅造成 1 点穿透
  c.expect(dehya).toHaveVariable({ health: 9 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
});

test("redmane's blood: pierces Dehya at exactly 7 health", async () => {
  // 规则集：……然后若迪希雅生命值至少为7->对迪希雅造成1点穿透伤害
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Kaeya} />
      <Character my def={Dehya} ref={dehya} health={7} />
      <CombatStatus my def={FierySanctumsProtection} usage={1} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(dehya).toHaveVariable({ health: 6 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
});

test("redmane's blood: no piercing below 7 health, protection still removed", async () => {
  // 规则集：……然后若迪希雅生命值至少为7->对迪希雅造成1点穿透伤害
  // 生命值 6 时不造成穿透伤害，但护盾状态仍被移除
  const myActive = ref();
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Kaeya} ref={myActive} />
      <Character my def={Dehya} ref={dehya} health={6} />
      <CombatStatus my def={FierySanctumsProtection} usage={1} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(myActive).toHaveVariable({ health: 9 });
  c.expect(dehya).toHaveVariable({ health: 6 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
});

test("fiery sanctum's protection: no damage decrease when Dehya is the active character", async () => {
  // 规则集：净焰剑域之护①我方出战角色受到伤害时：若迪希雅在后台，伤害-1
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Dehya} ref={dehya} health={10} />
      <Character my def={Kaeya} />
      <CombatStatus my def={FierySanctumsProtection} usage={1} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(dehya).toHaveVariable({ health: 8 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toHaveVariable({
    usage: 1,
  });
});

test("fiery sanctum field: creates the protection on enter", async () => {
  // 规则集：净焰剑狱领域①入场时/回合结束时，生成【净焰剑域之护】
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Dehya} />
    </State>,
  );
  await c.me.skill(MoltenInferno);
  c.expect($.my.summon.def(FierySanctumField)).toBeExist();
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toHaveVariable({
    usage: 1,
  });
});

test("fiery sanctum field: end phase deals 1 pyro and the protection comes back next round", async () => {
  // 规则集：净焰剑狱领域③结束阶段：造成1点火元素伤害。可用次数：3
  // 规则集：净焰剑狱领域①入场时/回合结束时，生成【净焰剑域之护】
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Kaeya} />
      <Character my def={Dehya} />
      <Summon my def={FierySanctumField} usage={3} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.my.summon.def(FierySanctumField)).toHaveVariable({ usage: 2 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toHaveVariable({
    usage: 1,
  });
});

test("fiery sanctum field: removes the protection when it leaves", async () => {
  // 规则集：净焰剑狱领域②离场时，移除我方【净焰剑域之护】
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Kaeya} />
      <Character my def={Dehya} />
      <Summon my def={FierySanctumField} usage={1} />
      <CombatStatus my def={FierySanctumsProtection} usage={1} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.my.summon.def(FierySanctumField)).toNotExist();
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
});

test("redmane's blood: an already-exhausted protection is removed by a later damage", async () => {
  // 规则集：赤鬃之血①我方角色受到伤害后：若【净焰剑域之护】可用次数为0->移除我方【净焰剑域之护】，然后若迪希雅生命值至少为7->对迪希雅造成1点穿透伤害
  // 护盾可用次数已为 0：不再减伤，但后续任一我方角色受到伤害后仍应移除它并追加穿透伤害
  const myActive = ref();
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Kaeya} ref={myActive} />
      <Character my def={Dehya} ref={dehya} health={10} />
      <CombatStatus my def={FierySanctumsProtection} usage={0} />
    </State>,
  );
  // 可用次数为 0，2 点物理不再减伤
  await c.opp.skill(TemperedSword);
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
  c.expect(dehya).toHaveVariable({ health: 9 });
});

test.fails("redmane's blood: triggered when Dehya herself is damaged", async () => {
  // 规则集：赤鬃之血①我方角色受到伤害后：若【净焰剑域之护】可用次数为0->移除我方【净焰剑域之护】，然后若迪希雅生命值至少为7->对迪希雅造成1点穿透伤害
  // 当前引擎：被动技能带有 `:e.target.id !== :self.id` 判定，迪希雅自己受到伤害时不触发，护盾状态不被移除、也不追加穿透伤害
  const dehya = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Dehya} ref={dehya} health={10} />
      <Character my def={Kaeya} />
      <CombatStatus my def={FierySanctumsProtection} usage={0} />
    </State>,
  );
  // 迪希雅受到 2 点物理伤害（自己在前台，护盾不减伤）
  await c.opp.skill(TemperedSword);
  c.expect($.my.combatStatus.def(FierySanctumsProtection)).toNotExist();
  // 10 - 2（物理） - 1（赤鬃之血穿透）
  c.expect(dehya).toHaveVariable({ health: 7 });
});
