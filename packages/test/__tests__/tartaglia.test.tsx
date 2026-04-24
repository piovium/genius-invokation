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

import { ref, setup, Character, State, Support, DeclaredEnd, Status, $ } from "#test";
import { Keqing, YunlaiSwordsmanship } from "@gi-tcg/data/internal/characters/electro/keqing";
import { Riptide, Tartaglia } from "@gi-tcg/data/internal/characters/hydro/tartaglia";
import { test } from "bun:test";

test("riptide should propagate", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={1}>
        <Status def={Riptide} />
      </Character>
      <Character opp ref={oppNext} />
      <Character my active def={Keqing} />
      <Character my def={Tartaglia} />
    </State>,
  );
  await c.me.skill(YunlaiSwordsmanship);
  await c.opp.chooseActive(oppNext);
  c.expect($.typeStatus.def(Riptide).at($.id(oppNext.id))).toBeExist();
});
