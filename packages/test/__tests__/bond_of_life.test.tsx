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

import { ref, setup, Character, State, Status, Card, $ } from "#test";
import { BondOfLife } from "@gi-tcg/data/internal/commons";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food";
import { test } from "bun:test";

test("bond of life decrease the heal", async () => {
  const active = ref();
  const c = setup(
    <State>
      <Character my health={5} maxHealth={6} ref={active}>
        <Status def={BondOfLife} usage={2} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, active);
  c.expect($.my.active).toHaveVariable({ health: 5 });
});
