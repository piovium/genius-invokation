// Copyright (C) 2025 Guyutongxue
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
  ref,
  setup,
  Character,
  State,
  Equipment,
  Summon,
  DeclaredEnd,
  Card,
  Status,
  $,
} from "#test";
import { Aura, SkillHandle } from "@gi-tcg/core/builder";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import {
  Chasca,
  NightsoulsBlessing,
  ShiningShadowhuntShellPyro,
  SoulsniperRitualStaff,
} from "@gi-tcg/data/internal/characters/anemo/chasca";
import {
  AlldevouringNarwhal,
  DarkShadow,
} from "@gi-tcg/data/internal/characters/hydro/alldevouring_narwhal";
import { test } from "bun:test";

test("dark shadow: do not barrier on nested damage", async () => {
  const darkShadow = ref();
  const c = setup(
    <State currentTurn="opp">
      <Card opp def={ShiningShadowhuntShellPyro} />
      <Card opp def={Paimon} />
      <Card opp def={Paimon} />
      <Character opp active def={Chasca}>
        <Equipment def={SoulsniperRitualStaff} usage={2} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my active health={10} />
      <Character my def={AlldevouringNarwhal} />
      <Summon my def={DarkShadow} ref={darkShadow} v={{ atk: 3, usage: 12 }} />
    </State>,
  );
  await c.opp.skill(1151121 as SkillHandle);
  c.expect($.my.active).toHaveVariable({ aura: Aura.Pyro, health: 9 });
  c.expect(darkShadow).toHaveVariable({ usage: 10 });
});
