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
  Card,
  Status,$
} from "#test";
import { SkillHandle } from "@gi-tcg/core/builder";
import { AbundantPhlogistonInEffect } from "@gi-tcg/data/internal/cards/event/other";
import {
  GrappleLink,
  GrapplePrepare,
  Kinich,
  NightsoulsBlessing as NightsoulsBlessingKinich,
} from "@gi-tcg/data/internal/characters/dendro/kinich";
import { Kachina, NightsoulsBlessing as NightsoulsBlessingKachina, TurboTwirly, TurboTwirlyLetItRip } from "@gi-tcg/data/internal/characters/geo/kachina";
import { test } from "bun:test";

test("kinich's link handle event earlier then kachina's", async () => {
  const kinich = ref();
  const kachina = ref();
  const c = setup(
    <State>
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
      <Character my active def={Kachina} ref={kachina}>
        <Equipment def={TurboTwirly} />
        <Status def={NightsoulsBlessingKachina} v={{ nightsoul: 2 }} />
      </Character>
      <CombatStatus my def={AbundantPhlogistonInEffect} />
    </State>
  );
  // 转转冲击
  await c.me.skill(1161021 as SkillHandle);
  // 燃素充盈消耗
  c.expect($.combatStatus.def(AbundantPhlogistonInEffect)).toNotExist();
  // 钩锁准备
  c.expect($.typeStatus.def(GrapplePrepare)).toBeExist();
  // 1 -> 2 -> 0 -> 1
  c.expect($.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id))).toHaveVariable({ nightsoul: 1 });
  // 2 -> 1
  c.expect($.typeStatus.tag("nightsoulsBlessing").at($.id(kachina.id))).toHaveVariable({ nightsoul: 1 });
});
