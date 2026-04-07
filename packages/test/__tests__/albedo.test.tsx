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

import {
  ref,
  setup,
  Character,
  State,
  Equipment,
  Summon,
  $,
} from "#test";
import { test } from "bun:test";
import { GaleBlade, Jean } from "@gi-tcg/data/internal/characters/anemo/jean";
import { Albedo, DescentOfDivinity, FavoniusBladeworkWeiss, SolarIsotoma } from "@gi-tcg/data/internal/characters/geo/albedo";

test("Effect-caused switchActive should mark canPlunging", async () => {
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Jean} health={10} />
      <Character my active />
      <Character my def={Albedo} >
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.opp.skill(GaleBlade);
  await c.me.skill(FavoniusBladeworkWeiss);
  // 阿贝多天赋：下落攻击+1伤
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});
