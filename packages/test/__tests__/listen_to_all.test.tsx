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

import { ref, setup, Character, State, Card, Equipment } from "#test";
import { test } from "vitest";
import {
  AmethystCrown,
  OrnateKabuto,
} from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { Akara, Nahida } from "@gi-tcg/data/internal/characters/dendro/nahida";
import {
  Keqing,
  StarwardSword,
} from "@gi-tcg/data/internal/characters/electro/keqing";

test("listenToAll works (amethyst crown)", async () => {
  const artifact = ref();
  const c = setup(
    <State>
      <Character my active def={Nahida}>
        <Equipment def={AmethystCrown} ref={artifact} />
      </Character>
    </State>,
  );
  await c.me.skill(Akara);
  c.expect(artifact).toHaveVariable({ crystal: 1 });
});

test("listenToPlayer works (ornate kabuto)", async () => {
  const master = ref();
  const c = setup(
    <State>
      <Character my active def={Keqing} energy={3} />
      <Character my energy={0} ref={master}>
        <Equipment def={OrnateKabuto} />
      </Character>
    </State>,
  );
  await c.me.skill(StarwardSword);
  c.expect(master).toHaveVariable({ energy: 1 });
});
