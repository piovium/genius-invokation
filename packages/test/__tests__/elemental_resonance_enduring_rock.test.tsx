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

import { $, Card, Character, Equipment, setup, State } from "#test";
import {
  TheBell,
  RebelliousShield,
} from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { ElementalResonanceEnduringRock } from "@gi-tcg/data/internal/cards/event/other.gts";
import { ElementalResonanceEnduringRockInEffect } from "@gi-tcg/data/internal/old_versions/v5.4.0.gts";
import {
  CeremonialCrystalshot,
  Navia,
} from "@gi-tcg/data/internal/characters/geo/navia.gts";
import { Noelle } from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import { test } from "vitest";

test("v5.4.0 enduring rock: first Geo skill with The Bell grants 4 shield points beyond the append limit", async () => {
  const c = setup(
    <State dataVersion="v5.4.0">
      <Character my active def={Navia}>
        <Equipment def={TheBell} />
      </Character>
      <Character my def={Noelle} />
      <Character opp active health={10} />
      <Card my def={ElementalResonanceEnduringRock} />
    </State>,
  );

  c.expect($.my.combatStatus).toNotExist();
  await c.me.card(ElementalResonanceEnduringRock);
  c.expect(
    $.my.combatStatus.def(ElementalResonanceEnduringRockInEffect),
  ).toBeUnique();

  await c.me.skill(CeremonialCrystalshot);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect(
    $.my.combatStatus.def(ElementalResonanceEnduringRockInEffect),
  ).toNotExist();
  c.expect($.my.combatStatus.tag("shield")).toBeDefinition(RebelliousShield);
  c.expect($.my.combatStatus.tag("shield")).toHaveVariable({ shield: 4 });
});
