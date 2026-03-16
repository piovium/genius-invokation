
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

import { ref, setup, Character, State, Card } from "#test";
import { TandooriRoastChicken } from "@gi-tcg/data/internal/cards/event/food";
import { HydroTulpa, StormSurge } from "@gi-tcg/data/internal/characters/hydro/hydro_tulpa";
import { test } from "bun:test";

test("hydro tulpa: E can be increaseSkillDamage'd", async () => {
  const tulpa = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target} />
      <Character my active def={HydroTulpa} ref={tulpa} />
      <Card my def={TandooriRoastChicken} />
    </State>,
  );
  await c.me.card(TandooriRoastChicken);
  await c.me.skill(StormSurge);
  c.expect(target).toHaveVariable({ health: 6 });
});
