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

import { ref, setup, Character, State, Support, Card } from "#test";
import { BrokenSea } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { NashaTown } from "@gi-tcg/data/internal/cards/support/place";
import { test } from "bun:test";

test("nasha town: triggered when disposed by broken sea", async () => {
  const target = ref();
  const nashaTown = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <Support my def={NashaTown} ref={nashaTown} />
      <Card my def={BrokenSea} />
    </State>,
  );

  await c.me.card(BrokenSea, nashaTown);
  c.expect(nashaTown).toNotExist();
  c.expect(target).toHaveVariable({ health: 8 });
});

test("nasha town: not triggered when disposed by playing another support", async () => {
  const target = ref();
  const nashaTown = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <Support my def={NashaTown} ref={nashaTown} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Card my def={Paimon} />
    </State>,
  );

  await c.me.card(Paimon, nashaTown);
  c.expect(nashaTown).toNotExist();
  c.expect(target).toHaveVariable({ health: 10 });
});
