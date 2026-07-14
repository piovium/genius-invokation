
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

import { Character, ref, setup, State, Equipment, Card } from "#test";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona";
import { test } from "vitest";

test("mona: fast switch passive", async () => {
  const mona = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character my active ref={mona} def={Mona} />
      <Character my ref={target} />
    </State>,
  );
  await c.me.switch(target);
  c.expect(mona).toHaveVariable({ usagePerRound1: 0 });

  await c.me.end();
  await c.opp.end();

  c.expect(mona).toHaveVariable({ usagePerRound1: 1 });
});
