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


import { ref, setup, Character, State, Status, Equipment, DeclaredEnd, $ } from "#test";
import { CrownlessCrown, CrownlessCrownInEffect } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { Collei, SupplicantsBowmanship, FloralBrush } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { Diluc, SearingOnslaught } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("crownless crown: my burning attaches in-effect status to opp active, consumed on next damage", async () => {
  const oppActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp health={10} />
      <Character opp active ref={oppActive} health={10} aura={Aura.Pyro} />
      <Character my active def={Collei}>
        <Equipment def={CrownlessCrown} />
      </Character>
    </State>,
  );
  // 规则集：我方触发燃烧反应后：优先对方出战角色附属【失冕的宝冠（生效中）】
  // 出战角色不在首位：附属给出战角色而非位置靠前的后台角色
  // 草伤 3 + 燃烧 1 = 4；附属状态在本次伤害之后，故本次不加伤
  await c.me.skill(FloralBrush);
  c.expect(oppActive).toHaveVariable({ health: 6 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toBeCount(1);
  c.expect($.opp.character.has($.typeStatus.def(CrownlessCrownInEffect))).toBe(oppActive);
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toHaveVariable({ layer: 1 });
  // 规则集：受到伤害时：伤害值+X（X为层数），弃置此状态
  // 物理 2 + 1 = 3，状态弃置
  await c.me.skill(SupplicantsBowmanship);
  c.expect(oppActive).toHaveVariable({ health: 3 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toNotExist();
});

test("crownless crown in effect: damage +X where X is layer count, then disposed", async () => {
  const oppActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={oppActive} health={10}>
        <Status def={CrownlessCrownInEffect} v={{ layer: 3 }} />
      </Character>
      <Character my active def={Collei} />
    </State>,
  );
  // 规则集：受到伤害时：伤害值+X（X为层数），弃置此状态；可用层数：1（无上限）
  // 3 层：物理 2 + 3 = 5，一次受伤即弃置
  await c.me.skill(SupplicantsBowmanship);
  c.expect(oppActive).toHaveVariable({ health: 5 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toNotExist();
  await c.me.skill(SupplicantsBowmanship);
  c.expect(oppActive).toHaveVariable({ health: 3 });
});

test("crownless crown: when opp active is defeated by the burning, attaches to next alive character", async () => {
  const oppA = ref();
  const oppB = ref();
  const oppC = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={oppA} health={4} aura={Aura.Pyro} />
      <Character opp ref={oppB} health={10} />
      <Character opp ref={oppC} health={10} />
      <Character my active def={Collei}>
        <Equipment def={CrownlessCrown} />
      </Character>
    </State>,
  );
  // 规则集：优先对方出战角色附属；出战角色被燃烧伤害击倒时附属给其他存活角色
  await c.me.skill(FloralBrush);
  c.expect(oppA).toHaveVariable({ alive: 0 });
  await c.opp.chooseActive(oppB);
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toBeCount(1);
  c.expect($.opp.character.has($.typeStatus.def(CrownlessCrownInEffect))).toBe(oppB);
});

test("crownless crown: two crowns triggered by one burning stack layers, damage +X", async () => {
  const oppActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={oppActive} health={10} aura={Aura.Pyro} />
      <Character my active def={Collei}>
        <Equipment def={CrownlessCrown} />
      </Character>
      <Character my def={Diluc}>
        <Equipment def={CrownlessCrown} />
      </Character>
    </State>,
  );
  // 规则集：可用层数：1（无上限）
  // 两件宝冠各自响应同一次燃烧，各附属 1 层：叠加为 2 层
  await c.me.skill(FloralBrush);
  c.expect(oppActive).toHaveVariable({ health: 6 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toBeCount(1);
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toHaveVariable({ layer: 2 });
  // 规则集：受到伤害时：伤害值+X（X为层数），弃置此状态
  // 物理 2 + 2 = 4
  await c.me.skill(SupplicantsBowmanship);
  c.expect(oppActive).toHaveVariable({ health: 2 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toNotExist();
});

test("crownless crown: burning triggered by the opponent does not attach the status", async () => {
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Collei} health={10} aura={Aura.Dendro}>
        <Equipment def={CrownlessCrown} />
      </Character>
    </State>,
  );
  // 规则集：我方触发燃烧反应后……；对方触发的燃烧不附属
  await c.opp.skill(SearingOnslaught);
  c.expect($.my.active).toHaveVariable({ health: 6 });
  c.expect($.opp.typeStatus.def(CrownlessCrownInEffect)).toNotExist();
  c.expect($.my.typeStatus.def(CrownlessCrownInEffect)).toNotExist();
});
