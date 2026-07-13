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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount } from "#test";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { AwakenMyKindred, GuardianOfApepsOasis, ProliferatedOrganism01 } from "@gi-tcg/data/internal/characters/dendro/guardian_of_apeps_oasis.gts";
import { test } from "vitest";
import { CeremonialBladework, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";

test("apeps: basic discard handling", async () => {
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active def={Xinyan}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Character my def={GuardianOfApepsOasis} />
      <Card my def={AwakenMyKindred} />
    </State>
  );
  await c.opp.skill(CeremonialBladework);
  c.expect($.my.hand).toNotExist();
  c.expect($.my.summon).toBeDefinition(ProliferatedOrganism01);
})
