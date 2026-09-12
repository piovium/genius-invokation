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

import { $, Card, Character, CombatStatus, ref, setup, State, Support } from "#test";
import { BrokenRimesEcho } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { LyresongInEffect2 } from "@gi-tcg/data/internal/cards/event/other.gts";
import { ScionsOfTheCanopy } from "@gi-tcg/data/internal/cards/support/place.gts";
import { expect, test } from "vitest";

test("scions of the canopy: do not affected by action cost reduction", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character my ref={target} />
      <Support my def={ScionsOfTheCanopy} v={{ point: 1 }} />
      <CombatStatus my def={LyresongInEffect2} />
      <Card my def={BrokenRimesEcho} notInitial />
    </State>,
  );
  const diceBefore = c.state.players[0].dice.length;

  // 琴音之诗： 2 费圣遗物以 0 费打出，仍触发悬木人
  await c.me.card(BrokenRimesEcho, target);

  c.expect($.my.equipment.def(BrokenRimesEcho)).toBeExist();
  c.expect($.my.support.def(ScionsOfTheCanopy)).toHaveVariable({ point: 2 });
  c.expect($.my.combatStatus.def(LyresongInEffect2)).toNotExist();
  expect(c.state.players[0].dice).toHaveLength(diceBefore + 1);
});
