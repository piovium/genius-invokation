
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

import { ref, setup, Character, State, Equipment, CombatStatus, Card, $ } from "#test";
import { BurstScan, Kaveh } from "@gi-tcg/data/internal/characters/dendro/kaveh";
import { FlamestriderSoaringAscent } from "@gi-tcg/data/internal/characters/pyro/mavuika";
import { DendroCore } from "@gi-tcg/data/internal/commons";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("kaveh deal damage after dispose card", async () => {
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={3} />
      <Character opp ref={target} health={10} aura={Aura.Hydro} />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan}  usage={1} />
      <Card pile my def={FlamestriderSoaringAscent} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
  c.expect($.opp.active.onlyDefeated).toBeExist();
  await c.opp.chooseActive(target);
  // 3草伤+1绽放
  c.expect(target).toHaveVariable({ health: 6 });
  c.expect($.my.combatStatus.def(DendroCore)).toBeExist();
});
