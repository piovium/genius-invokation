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
  CombatStatus,
  DeclaredEnd,
  $,
} from "#test";
import {
  Bennett,
  InspirationField01,
} from "@gi-tcg/data/internal/characters/pyro/bennett";
import {
  ElectroHypostasis,
  RockpaperscissorsCombo,
} from "@gi-tcg/data/internal/characters/electro/electro_hypostasis";
import { test } from "bun:test";
import { Aura } from "@gi-tcg/typings";

test("bennett talent don't heal on prepared skill", async () => {
  const opp1 = ref();
  const opp2 = ref();
  const opp3 = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} aura={Aura.Pyro} ref={opp1} />
      <Character opp health={10} aura={Aura.Pyro} ref={opp2} />
      <Character opp health={10} aura={Aura.Pyro} ref={opp3} />
      <Character my active def={ElectroHypostasis} health={1} />
      <CombatStatus my def={InspirationField01} />
    </State>,
  );
  await c.me.skill(RockpaperscissorsCombo);
  // 原伤害2，鼓舞+2，超载+2
  c.expect(opp1).toHaveVariable({ health: 4 });
  c.expect(opp2).toHaveVariable({ health: 4 });
  c.expect(opp3).toHaveVariable({ health: 3 });
  // 只有首次
  c.expect($.my.active).toHaveVariable({ health: 3 });
});
