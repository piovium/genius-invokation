// Copyright (C) 2026 Guyutongxue
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

import { $, Character, ref, setup, State, Status } from "#test";
import {
  ArmoredCrabCarapace,
  EmperorOfFireAndIron,
  ShatterclampStrike,
} from "@gi-tcg/data/internal/characters/pyro/emperor_of_fire_and_iron";
import {
  Candace,
  HeronShield,
} from "@gi-tcg/data/internal/characters/hydro/candace";
import { test } from "vitest";

test("Emperor of Fire and Iron absorbs another character's shield after acting", async () => {
  const emperor = ref();
  const heronShield = ref();
  const c = setup(
    <State>
      <Character my active def={EmperorOfFireAndIron} ref={emperor} />
      <Character my def={Candace}>
        <Status def={HeronShield} ref={heronShield} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.me.skill(ShatterclampStrike);

  c.expect(heronShield).toNotExist();
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({ shield: 2 });
});
