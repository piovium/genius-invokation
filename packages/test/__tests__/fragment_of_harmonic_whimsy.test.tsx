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


import { setup, Character, State, Equipment, DeclaredEnd, $ } from "#test";
import { FragmentOfHarmonicWhimsy, HarmoniousSymphonyPreludeInEffect } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { Collei, SupplicantsBowmanship } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test("fragment of harmonic whimsy: after skill, all my characters get 1 bond of life and a cost-reduction combat status", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} />
      <Character my active def={Collei}>
        <Equipment def={FragmentOfHarmonicWhimsy} />
      </Character>
    </State>,
  );
  // 规则集：角色使用技能后：我方所有角色附属1层生命之契，生成【谐律异想断章(生效中)】
  await c.me.skill(SupplicantsBowmanship);
  c.expect($.my.character.has($.typeStatus.def(BondOfLife))).toBeCount(3);
  for (const ch of c.state.players[0].characters) {
    const bond = ch.entities.find((e) => e.definition.id === BondOfLife)!;
    expect(bond.variables.usage).toBe(1);
  }
  c.expect($.my.combatStatus.def(HarmoniousSymphonyPreludeInEffect)).toBeExist();
  c.expect($.my.combatStatus.def(HarmoniousSymphonyPreludeInEffect)).toHaveVariable({ usage: 1 });
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  // 规则集：生效中：我方角色使用技能少花费1个元素骰；可用次数：1
  // 普攻 3 骰少 1 骰：5 - 2 = 3；状态消耗
  await c.me.skill(SupplicantsBowmanship);
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  c.expect($.my.combatStatus.def(HarmoniousSymphonyPreludeInEffect)).toNotExist();
});
