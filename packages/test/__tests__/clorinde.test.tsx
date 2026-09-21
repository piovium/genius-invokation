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
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  Clorinde,
  HuntersVigil,
  NightVigil,
  OathOfHuntingShadows,
} from "@gi-tcg/data/internal/characters/electro/clorinde.gts";
import { InspirationField } from "@gi-tcg/data/internal/characters/pyro/bennett.gts";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("hunter's vigil: attaches night vigil, removes bond of life, heals X and deals X electro damage", async () => {
  // 规则集：狩夜之巡 自身附属夜巡，移除自身所有生命之契，治疗自身X点，若X大于0，造成X点雷元素伤害（X为使用技能前自身生命之契层数）
  // 3 层生命之契：全部移除，治疗 3 点（5 → 8），造成 3 点雷伤
  const target = ref();
  const clorinde = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Clorinde} ref={clorinde} health={5}>
        <Status def={BondOfLife} usage={3} />
      </Character>
    </State>,
  );
  await c.me.skill(HuntersVigil);
  c.expect($.my.typeStatus.def(NightVigil)).toBeExist();
  c.expect($.my.typeStatus.def(BondOfLife)).toNotExist();
  c.expect(clorinde).toHaveVariable({ health: 8 });
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.Electro });
});

test("hunter's vigil: with 0 bond of life, heals 0 and deals no damage", async () => {
  // 规则集：治疗自身X点，若X大于0，造成X点雷元素伤害（X为使用技能前自身生命之契层数）
  // 无生命之契时 X=0：仍附属夜巡，治疗 0 点，不造成伤害
  const target = ref();
  const clorinde = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Clorinde} ref={clorinde} health={5} />
    </State>,
  );
  await c.me.skill(HuntersVigil);
  c.expect($.my.typeStatus.def(NightVigil)).toBeExist();
  c.expect(clorinde).toHaveVariable({ health: 5 });
  c.expect(target).toHaveVariable({ health: 10, aura: Aura.None });
  // 规则集注：若生命之契为0层，也能治疗0点；狩夜之巡自身的治疗不被夜巡终止，故无生命之契
  c.expect($.my.typeStatus.def(BondOfLife)).toNotExist();
});

test("night vigil: normal attack's physical damage becomes electro", async () => {
  // 规则集：夜巡 ②角色普通攻击造成的物理伤害变为雷元素伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Clorinde}>
        <Status def={NightVigil} />
      </Character>
    </State>,
  );
  await c.me.skill(OathOfHuntingShadows);
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.Electro });
});

test("night vigil: after normal attack attaches 2 bond of life", async () => {
  // 规则集：夜巡 ③角色使用普通攻击后：附属2层生命之契
  const clorinde = ref();
  const c = setup(
    <State>
      <Character my active def={Clorinde} ref={clorinde}>
        <Status def={NightVigil} />
      </Character>
    </State>,
  );
  await c.me.skill(OathOfHuntingShadows);
  c.expect($.my.typeStatus.def(BondOfLife)).toHaveVariable({ usage: 2 });
  c.expect($.my.character.has($.typeStatus.def(BondOfLife))).toBe(clorinde);
});

test("night vigil: lasts 1 round", async () => {
  // 规则集：夜巡 持续回合：1
  // 本回合附属的夜巡在回合结束后移除
  const c = setup(
    <State>
      <Character my active def={Clorinde} />
    </State>,
  );
  await c.me.skill(HuntersVigil);
  c.expect($.my.typeStatus.def(NightVigil)).toBeExist();
  await c.opp.end();
  await c.me.end();
  c.expect($.my.typeStatus.def(NightVigil)).toNotExist();
});

test.fails("hunter's vigil: heals before dealing damage", async () => {
  // 规则集：狩夜之巡 ……治疗自身X点，若X大于0，造成X点雷元素伤害（先治疗，后造成伤害）；
  // 当前引擎：先造成伤害再治疗（clorinde.gts HuntersVigil 先 :damage 后 :heal），伤害时生命值仍为 5
  // 鼓舞领域：角色生命值不低于 7 时造成的伤害+2。3 层生命之契、生命值 5：
  // 先治疗 3 点（5 → 8），再造成伤害时生命值 8 ≥ 7 → 3+2=5 点雷伤（10 → 5）
  // 若先伤害后治疗：伤害时生命值 5，无加成，仅 3 点（10 → 7）
  const target = ref();
  const clorinde = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Clorinde} ref={clorinde} health={5}>
        <Status def={BondOfLife} usage={3} />
      </Character>
      <CombatStatus my def={InspirationField} />
    </State>,
  );
  await c.me.skill(HuntersVigil);
  c.expect(clorinde).toHaveVariable({ health: 8 });
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.Electro });
});

test("night vigil: normal attack stacks 2 bond of life onto existing layers", async () => {
  // 规则集：夜巡 ③角色使用普通攻击后：附属2层生命之契
  // 已有 1 层生命之契时再附属 2 层 → 3 层
  const clorinde = ref();
  const c = setup(
    <State>
      <Character my active def={Clorinde} ref={clorinde}>
        <Status def={NightVigil} />
        <Status def={BondOfLife} usage={1} />
      </Character>
    </State>,
  );
  await c.me.skill(OathOfHuntingShadows);
  c.expect($.my.typeStatus.def(BondOfLife)).toHaveVariable({ usage: 3 });
  c.expect($.my.character.has($.typeStatus.def(BondOfLife))).toBe(clorinde);
});
