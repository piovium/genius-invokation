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

import { ref, setup, State, Character, Card } from "#test";
import { Collei, FloralSidewinder } from "@gi-tcg/data/internal/characters/dendro/collei";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("collei: talent status won't target on defeated characters", async () => {
  const chosenNext = ref();
  const collei = ref();
  const c = setup(
    <State>
      <Character opp health={1} aura={Aura.Hydro} />
      <Character opp ref={chosenNext} health={10} />
      <Character my def={Collei} ref={collei} />
      <Card my def={FloralSidewinder} />
    </State>
  );
  await c.me.card(FloralSidewinder, collei);
  await c.opp.chooseActive(chosenNext);
  c.expect(chosenNext).toHaveVariable({ health: 9, aura: Aura.Dendro });
});
