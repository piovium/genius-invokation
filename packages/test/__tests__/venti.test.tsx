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

import { ref, setup, Character, State, Status, Card, Equipment, $, Summon } from "#test";
import { Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose";
import { Stormeye, Venti } from "@gi-tcg/data/internal/characters/anemo/venti";
import { Aura, DamageType } from "@gi-tcg/typings";
import { test } from "vitest";

test("venti: summon dmg type affected by swirling", async () => {
  const stormeye = ref();
  const c = setup(
    <State>
      <Character opp active aura={Aura.Hydro} health={10} />
      <Character opp health={10} />
      <Character my active def={Sucrose} />
      <Character my def={Venti} />
      <Summon my def={Stormeye} ref={stormeye} />
    </State>
  );
  await c.me.skill(WindSpiritCreation);
  await c.opp.end();
  await c.me.end();
  // 砂糖扩水后，暴风之眼 2水伤重新挂水
  c.expect($.opp.active).toHaveVariable({ health: 7, aura: Aura.Hydro });
  // 砂糖扩散1水到后台
  c.expect($.opp.next).toHaveVariable({ health: 9, aura: Aura.Hydro });
  c.expect(stormeye).toHaveVariable({ hintIcon: DamageType.Hydro });
});
