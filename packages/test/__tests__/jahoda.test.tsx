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
  ref,
  setup,
  Card,
  Character,
  Equipment,
  State,
  Status,
  $,
} from "#test";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  Jahoda,
  PurrloinedTreasureFlask,
} from "@gi-tcg/data/internal/characters/anemo/jahoda.gts";
import {
  AbyssLectorVioletLightning,
  ElectricRebirth,
} from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import { test } from "vitest";

test("jahoda: treasure flask triggers Veteran's Visage twice", async () => {
  const target = ref();
  const veteran = ref();
  const c = setup(
    <State>
      <Character opp active ref={target}>
        <Equipment def={VeteransVisage} ref={veteran} />
      </Character>
      <Card opp pile def={PurrloinedTreasureFlask} />
      <Character my active def={Jahoda} />
      <Card my def={PurrloinedTreasureFlask} />
    </State>,
  );

  await c.me.card(PurrloinedTreasureFlask);

  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(veteran).toHaveVariable({ count: 2 });
  c.expect($.opp.hand).toBeCount(1);
});

test("jahoda: treasure flask resolves revival between damage instances", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character
        opp
        active
        def={AbyssLectorVioletLightning}
        health={1}
        ref={target}
      >
        <Status def={ElectricRebirth} />
      </Character>
      <Character my active def={Jahoda} />
      <Card my def={PurrloinedTreasureFlask} />
    </State>,
  );

  await c.me.card(PurrloinedTreasureFlask);

  c.expect(target).toHaveVariable({ alive: 1, health: 3 });
});
