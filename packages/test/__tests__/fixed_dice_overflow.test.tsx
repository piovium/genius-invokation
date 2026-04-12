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

import { setup, State, Support } from "#test";
import { SuperconductBlessingDeepFreeze } from "@gi-tcg/data/internal/cards/support/blessing";
import { expect, test } from "bun:test";

test("fixedDice may not overflow initialDiceCount", async () => {
  const c = setup(
    <State>
      <Support my def={SuperconductBlessingDeepFreeze} />
      <Support my def={SuperconductBlessingDeepFreeze} />
      <Support my def={SuperconductBlessingDeepFreeze} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  // After roll phase, my dice count should be capped at 8 (initialDiceCount),
  // not 12 (3 blessings × 4 fixed dice each).
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
});
