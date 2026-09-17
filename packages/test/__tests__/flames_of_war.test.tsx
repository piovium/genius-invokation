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

import { $, Card, Character, setup, State } from "#test";
import {
  FlamesOfWar,
  PilgrimageOfTheReturnOfTheSacredFlame,
} from "@gi-tcg/data/internal/cards/event/legend.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { test } from "vitest";

function setupPilgrimage() {
  return setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} />
      <Card my def={PilgrimageOfTheReturnOfTheSacredFlame} />
    </State>,
  );
}

test("flames of war: pilgrimage spirit remains after damage synchronization", async () => {
  const c = setupPilgrimage();

  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);
  await c.me.skill(CeremonialBladework);

  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 3 });
});

test("flames of war: created support synchronizes its initial spirit", async () => {
  const c = setupPilgrimage();

  await c.me.card(PilgrimageOfTheReturnOfTheSacredFlame);

  c.expect($.my.support.def(FlamesOfWar)).toHaveVariable({ spirit: 1 });
});
