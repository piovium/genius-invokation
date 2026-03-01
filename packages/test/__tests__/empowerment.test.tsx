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

import { ref, setup, Character, State, Card, Attachment, DeclaredEnd } from "#test";
import {
  Bennett,
  GrandExpectation,
} from "@gi-tcg/data/internal/characters/pyro/bennett";
import { Empowerment } from "@gi-tcg/data/internal/commons";
import { test, expect } from "bun:test";

test("empowerment should not change energy cost", async () => {
  const bennett = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={Bennett} energy={2} ref={bennett} />
      <Card my def={GrandExpectation}>
        <Attachment def={Empowerment} />
      </Card>
    </State>,
  );
  // GrandExpectation costs 4 Pyro + 2 Energy.
  // With Empowerment (changeCardCostType to Void), should become 4 Void + 2 Energy.
  // The dice cost (excluding energy) should be 4, not 6.
  // Start with 8 dice, after playing the card, should have 4 remaining.
  await c.me.card(GrandExpectation, bennett);
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
});
