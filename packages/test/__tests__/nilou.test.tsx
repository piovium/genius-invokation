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

import { test } from "bun:test";
import { $, Character, CombatStatus, setup, State } from "#test"
import { AllSchemesToKnow, Nahida } from "@gi-tcg/data/internal/characters/dendro/nahida"
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona"
import { BountifulCore, GoldenChalicesBounty, Nilou } from "@gi-tcg/data/internal/characters/hydro/nilou"
import { DendroCore } from "@gi-tcg/data/internal/commons"
import { Aura } from "@gi-tcg/typings"

test("nilou basic logic", async () => {
  const c = setup(
    <State>
      <Character opp active aura={Aura.Hydro} />
      <Character my def={Nilou} />
      <Character my active def={Nahida} />
      <Character my def={Mona} />
      <CombatStatus my def={GoldenChalicesBounty} />
    </State>
  );
  await c.me.skill(AllSchemesToKnow);
  c.expect($.opp.active).toHaveVariable({ aura: Aura.None });
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
  c.expect($.my.summon.def(BountifulCore)).toBeExist();
})
