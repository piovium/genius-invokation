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

import { ref, setup, Character, State, Status, Card, $ } from "#test";
import { AnAncientSacrificeOfSacredBrocade } from "@gi-tcg/data/internal/cards/event/other";
import { ChenyuVale } from "@gi-tcg/data/internal/cards/support/adventure";
import {
  SkywardSonnet,
  Venti,
} from "@gi-tcg/data/internal/characters/anemo/venti";
import { Satiated } from "@gi-tcg/data/internal/commons";
import { test } from "bun:test";

test("adventure: basic", async () => {
  const c = setup(
    <State>
      <Card my def={AnAncientSacrificeOfSacredBrocade} />
    </State>,
  );
  await c.me.card(AnAncientSacrificeOfSacredBrocade);
  await c.me.selectCard(ChenyuVale);
  c.expect($.my.support.def(ChenyuVale)).toHaveVariable({ exp: 1 });
});
