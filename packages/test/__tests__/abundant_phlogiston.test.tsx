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

import { ref, setup, Character, State, Card, $ } from "#test";
import { test } from "bun:test";
import {
  CoolingTreatment,
  Mualani,
  SurfsharkWavebreaker,
} from "@gi-tcg/data/internal/characters/hydro/mualani";
import { AbundantPhlogiston } from "@gi-tcg/data/internal/cards/event/other";
import { expect } from "bun:test";

test("abundant phlogiston: mualani", async () => {
  const firstOpp = ref();
  const secondOpp = ref();
  const c = setup(
    <State>
      <Character my def={Mualani} />
      <Card my def={AbundantPhlogiston} />
      <Character opp active ref={firstOpp} />
      <Character opp ref={secondOpp} />
    </State>,
  );
  await c.me.skill(SurfsharkWavebreaker);
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.card(AbundantPhlogiston);
  await c.me.skill(CoolingTreatment);
  await c.opp.switch(firstOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.end();
  await c.opp.switch(secondOpp);
  c.expect($.my.typeStatus.tag("nightsoulsBlessing")).toNotExist();
});
