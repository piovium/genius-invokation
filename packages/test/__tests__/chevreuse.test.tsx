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

import { ref, setup, Character, State, Equipment, Card, $ } from "#test";
import { Chevreuse, OverchargedBall, ShortrangeRapidInterdictionFire } from "@gi-tcg/data/internal/characters/pyro/chevreuse";

import { test } from "bun:test";

test("chevreuse overcharged ball", async () => {
  const target = ref();
  const chevreuse = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Chevreuse} ref={chevreuse} health={8} />
      <Card my def={OverchargedBall} />
    </State>
  );
  await c.me.skill(ShortrangeRapidInterdictionFire);
  // e -2, 弹头 -1
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(chevreuse).toHaveVariable({ health: 9 });
  c.expect($.my.hand).toNotExist();
})
