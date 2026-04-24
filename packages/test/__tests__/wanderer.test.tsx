
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

import { Character, ref, setup, State, Equipment, Card, Status, $ } from "#test";
import { Wanderer, Windfavored, YuubanMeigen } from "@gi-tcg/data/internal/characters/anemo/wanderer";
import { test } from "bun:test";

test("wanderer: normal attack to opp next", async () => {
  const sb = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp ref={target} />
      <Character my active ref={sb} def={Wanderer} >
        <Status def={Windfavored} v={{ usage: 1 }} />
      </Character>
    </State>,
  );
  await c.me.skill(YuubanMeigen);
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect($.opp.active).toHaveVariable({ health: 10 });
});
