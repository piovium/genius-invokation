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

import { ref, setup, Character, State, Card, $, Status } from "#test";
import { TandooriRoastChicken } from "@gi-tcg/data/internal/cards/event/food";
import { AbyssLectorVioletLightning, ChainLightningCascade, ElectricRebirth, ElectricRebirthHoned } from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning";
import { JadeScreen, Ningguang, SparklingScatter } from "@gi-tcg/data/internal/characters/geo/ningguang";
import { test } from "bun:test";

test("electro abyss talent: triggered on defeated", async () => {
  const abyss = ref();
  const c = setup(
    <State>
      <Card opp def={TandooriRoastChicken} />
      <Character opp active def={Ningguang} energy={2} />
      <Character my active def={AbyssLectorVioletLightning} health={1} ref={abyss} >
        <Status def={ElectricRebirth} />
      </Character>
      <Card my def={ChainLightningCascade} />
    </State>
  );
  await c.me.card(ChainLightningCascade, abyss);
  await c.me.end();
  // 打出复活甲
  await c.opp.skill(SparklingScatter);
  c.expect(abyss).toHaveVariable({ health: 4 });
  c.expect($.my.typeStatus.def(ElectricRebirthHoned)).toBeExist();
  // 被夺取一点充能
  c.expect($.opp.active).toHaveVariable({ energy: 2 });
  await c.opp.card(TandooriRoastChicken);
  // 2+2 打 4
  await c.opp.skill(JadeScreen);
  c.expect(abyss).toHaveVariable({ alive: 0 });
  // 被夺取一点充能
  c.expect($.opp.active).toHaveVariable({ energy: 2 });
})
