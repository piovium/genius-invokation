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

import { ref, setup, Character, State, Status, Equipment, Card, Summon, DeclaredEnd } from "#test";
import { Collei, CuileinAnbar } from "@gi-tcg/data/internal/characters/dendro/collei";
import { Emilie, LumidouceCaseLevel1 } from "@gi-tcg/data/internal/characters/dendro/emilie";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("emillie: lumidouce upgrade at end phase", async () => {
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} aura={Aura.Pyro} />
      <Character my active def={Emilie} />
      <Character my def={Collei} />
      <Summon my def={CuileinAnbar} />
      <Summon my def={LumidouceCaseLevel1} />
    </State>,
  );
  await c.me.end();
  // 柯里安巴 -2，燃烧 -1
  // 灯升级，二阶 -2
  c.expect(target).toHaveVariable({ health: 5 });
});
