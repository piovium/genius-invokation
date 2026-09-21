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

import {
  $,
  Character,
  CombatStatus,
  Equipment,
  ref,
  setup,
  State,
} from "#test";
import {
  EremiteFloralRingdancer,
  SpiritOfOmenDendroSpiritserpent,
  SpiritserpentsBlessing,
  SpiritSerpentsSwirl,
  VinyRazorscale,
} from "@gi-tcg/data/internal/characters/dendro/eremite_floral_ringdancer.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import { Baizhu } from "@gi-tcg/data/internal/characters/dendro/baizhu.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("viny razorscale: blessing increases damage without consuming technique usage", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={EremiteFloralRingdancer} energy={1}>
        <Equipment def={SpiritOfOmenDendroSpiritserpent} />
      </Character>
      <CombatStatus my def={SpiritserpentsBlessing} usage={1} />
    </State>,
  );

  await c.me.skill(VinyRazorscale);

  c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(SpiritserpentsBlessing)).toNotExist();
  c.expect(
    $.my.typeEquipment.def(SpiritOfOmenDendroSpiritserpent),
  ).toHaveVariable({ usage: 2 });
});

test("spirit of omen dendro spirit-serpent: each equipped card triggers once on switch", async () => {
  const char1 = ref();
  const char2 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={EremiteFloralRingdancer}>
        <Equipment def={SpiritSerpentsSwirl} />
      </Character>
      <Character my ref={char1} def={Mona}>
        <Equipment def={SpiritOfOmenDendroSpiritserpent} />
      </Character>
      <Character my ref={char2} def={Baizhu}>
        <Equipment def={SpiritOfOmenDendroSpiritserpent} />
      </Character>
    </State>,
  );
  await c.me.switch(char1);
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  await c.opp.end();
  await c.me.switch(char2);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
});
