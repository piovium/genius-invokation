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

import { ref, setup, Character, State, Status, $, Equipment, Card, Support, Summon } from "#test";
import { Qucusaurus, Target } from "@gi-tcg/data/internal/cards/equipment/techniques";
import { Katheryne } from "@gi-tcg/data/internal/cards/support/ally";
import { Chasca, ShadowhuntShell } from "@gi-tcg/data/internal/characters/anemo/chasca";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona";
import { test, expect } from "bun:test";

test("qucusaurus delayed one fast action to next switch", async () => {
  const switch1Target = ref();
  const mona = ref();
  const c = setup(
    <State>
      <Character opp active health={10}>
        <Status def={Target} />
      </Character>
      <Support my def={Katheryne} />
      <Character my active ref={mona} def={Mona}>
      </Character>
      <Character my ref={switch1Target} def={Chasca}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={ShadowhuntShell} />
    </State>
  );
  // 第一次快速行动（绒翼龙减费，莫娜设置快速，绒翼龙快速存到下一次）
  await c.me.switch(switch1Target);
  c.expect(mona).toHaveVariable({ usagePerRound1: 0 });
  c.expect($.my.hand).toNotExist();
  // 弹头1伤
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  // 依然是快速行动（绒翼龙）
  await c.me.switch(mona);
  await c.me.end();
})
