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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount, Status } from "#test";
import { RainbowMacaronsInEffect } from "@gi-tcg/data/internal/cards/event/food";
import { FurinaPneuma, SalonMembers } from "@gi-tcg/data/internal/characters/hydro/furina";
import { test } from "vitest";

test("furina: summon endPhase damage contains two skill", async () => {
  const macronsInEffect = ref();
  const furina = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={2}>
        <Status def={RainbowMacaronsInEffect} ref={macronsInEffect} />
      </Character>
      <Character my active def={FurinaPneuma} ref={furina} health={12} />
      <Character my alive={0} health={0} />
      <Character my alive={0} health={0} />
      <Summon my def={SalonMembers} />
    </State>
  );
  await c.me.end();
  // -1 +1 -1 +1
  c.expect($.opp.active).toHaveVariable({ health: 2 });
  c.expect(macronsInEffect).toHaveVariable({ usage: 1 });
  c.expect(furina).toHaveVariable({ health: 11 });
});
