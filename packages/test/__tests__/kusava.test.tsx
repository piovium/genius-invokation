// Copyright (C) 2024-2025 Guyutongxue
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

import { ref, setup, State, Card, Support, $ } from "#test";
import { TheBestestTravelCompanion } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { Kusava } from "@gi-tcg/data/internal/cards/support/item";
import { test } from "bun:test";

test("kusava", async () => {
  const kusava = ref();
  const c = setup(
    <State phase="roll">
      <Support my def={Kusava} ref={kusava} v={{ memory: 0 }} />
      <Card my def={Paimon} />
      <Card my def={TheBestestTravelCompanion} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.hand).toBeCount(0);
  c.expect(kusava).toHaveVariable({ memory: 2 });
});
