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

import { ref, setup, State, Character, $, Support, Card } from "#test";
import { LeaveItToMe } from "@gi-tcg/data/internal/cards/event/other.gts";
import { ChenyuVale } from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { Paimon, Seymour } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { test } from "vitest";

test("seymour: consumeUsage after adventure", async () => {
  const c = setup(
    <State>
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Seymour} usage={1} />
      <Card my notInitial def={LeaveItToMe} />
    </State>,
  );
  await c.me.card(LeaveItToMe);
  await c.me.selectCard(ChenyuVale);
  c.expect($.my.support.def(Seymour)).toNotExist();
  c.expect($.my.support.def(ChenyuVale)).toNotExist();
});
