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
  DeclaredEnd,
  DiceCount,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  Chihayaburu,
  GaryuuBladework,
  KaedeharaKazuha,
  MidareRanzan,
  MidareRanzanCryo,
  MidareRanzanElectro,
  MidareRanzanHydro,
  MidareRanzanPyro,
} from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

const variants = [
  { element: "anemo", aura: Aura.None, status: MidareRanzan },
  { element: "cryo", aura: Aura.Cryo, status: MidareRanzanCryo },
  { element: "hydro", aura: Aura.Hydro, status: MidareRanzanHydro },
  { element: "pyro", aura: Aura.Pyro, status: MidareRanzanPyro },
  { element: "electro", aura: Aura.Electro, status: MidareRanzanElectro },
];

test.each(variants)(
  "kazuha v4.7: $element Midare Ranzan survives Chihayaburu and buffs the next plunging attack",
  async ({ aura, status }) => {
    const next = ref();
    const c = setup(
      <State dataVersion="v4.7.0">
        <DiceCount my count={10} />
        <DeclaredEnd opp />
        <Character my active def={KaedeharaKazuha} />
        <Character my ref={next} />
        <Character opp active aura={aura} />
      </State>,
    );

    await c.me.skill(Chihayaburu);
    c.expect($.my.active).toBe(next);
    c.expect($.my.status).toBeDefinition(status);
    c.expect($.opp.active).toHaveVariable({ health: 7, aura: Aura.None });

    await c.me.switch(KaedeharaKazuha);
    await c.me.skill(GaryuuBladework);
    c.expect($.opp.active).toHaveVariable({ health: 4, aura });
    c.expect($.my.status).toNotExist();

    // The consumed status must not buff another normal attack.
    await c.me.skill(GaryuuBladework);
    c.expect($.opp.active).toHaveVariable({ health: 2, aura });
  },
);

test.each(
  variants.flatMap((previous) =>
    variants.map((next) => ({
      previous: previous.element,
      oldStatus: previous.status,
      ...next,
    })),
  ),
)(
  "kazuha v4.7: Chihayaburu refreshes $previous Midare Ranzan to $element",
  async ({ oldStatus, aura, status }) => {
    const c = setup(
      <State dataVersion="v4.7.0">
        <DeclaredEnd opp />
        <Character my active def={KaedeharaKazuha}>
          <Status def={oldStatus} />
        </Character>
        <Character my />
        <Character opp active aura={aura} />
      </State>,
    );

    await c.me.skill(Chihayaburu);
    // Includes refreshing the same element and replacing every other element.
    c.expect($.my.status).toBeDefinition(status);
    c.expect($.opp.active).toHaveVariable({ health: 7, aura: Aura.None });

    await c.me.switch(KaedeharaKazuha);
    await c.me.skill(GaryuuBladework);
    c.expect($.opp.active).toHaveVariable({ health: 4, aura });
    c.expect($.my.status).toNotExist();
  },
);

test.each(variants)(
  "kazuha v4.7: a non-plunging normal attack consumes $element Midare Ranzan without a buff",
  async ({ status }) => {
    const c = setup(
      <State dataVersion="v4.7.0">
        <DeclaredEnd opp />
        <Character my active def={KaedeharaKazuha}>
          <Status def={status} />
        </Character>
        <Character opp active />
      </State>,
    );

    await c.me.skill(GaryuuBladework);
    c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.None });
    c.expect($.my.status).toNotExist();
  },
);
