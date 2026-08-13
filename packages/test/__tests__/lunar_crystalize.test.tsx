// Copyright (C) 2026 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { $, Character, Card, setup, State } from "#test";
import { test } from "vitest";
import { LunarSymphony, Moondrift } from "@gi-tcg/data/internal/commons.gts";

test("lunar crystalize: playing LunarSymphony strengthens Moondrift and bursts at effect 3", async () => {
  const c = setup(
    <State>
      <Character my active />
      <Character opp active health={10} />
      <Card my def={LunarSymphony} />
      <Card my def={LunarSymphony} />
      <Card my def={LunarSymphony} />
      <Card my def={LunarSymphony} />
    </State>,
  );
  await c.me.card(LunarSymphony);
  c.expect($.my.summon.def(Moondrift)).toHaveVariable({ effect: 1 });
  await c.me.card(LunarSymphony);
  c.expect($.my.summon.def(Moondrift)).toHaveVariable({ effect: 2 });
  // effect reaches 3: immediately deal 3 Geo damage, then reset effect to 1
  await c.me.card(LunarSymphony);
  c.expect($.my.summon.def(Moondrift)).toHaveVariable({ effect: 1 });
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  await c.me.card(LunarSymphony);
  c.expect($.my.summon.def(Moondrift)).toHaveVariable({ effect: 2 });
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});
