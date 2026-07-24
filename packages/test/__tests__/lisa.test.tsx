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
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { $, Character, DiceCount, setup, State, Status } from "#test";
import {
  ConductiveLisa,
  Lisa,
  VioletArc,
} from "@gi-tcg/data/internal/characters/electro/lisa.gts";
import { test } from "vitest";

test("lisa: violet arc consumes conductive stacks", async () => {
  const c = setup(
    <State>
      <Character opp active health={10}>
        <Status def={ConductiveLisa} v={{ conductive: 2 }} />
      </Character>
      <Character my active def={Lisa} />
      <DiceCount my count={12} />
    </State>,
  );
  await c.me.skill(VioletArc);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.opp.active.has($.typeStatus.def(ConductiveLisa))).toNotExist();
});
