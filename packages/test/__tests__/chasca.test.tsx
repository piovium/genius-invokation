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
  Card,
  Character,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  Chasca,
  MultitargetFire,
  NightsoulsBlessing,
  SoulsniperRitualStaff,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { expect, test } from "vitest";

test("multitarget fire: usable when holding at least 3 cards", async () => {
  // 规则集：多重瞄准 条件：手牌数至少为3
  const chasca = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Chasca} ref={chasca}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Equipment def={SoulsniperRitualStaff} />
      </Character>
      <Card my def={Strategize} />
      <Card my def={Strategize} />
      <Card my def={Strategize} />
    </State>,
  );

  await c.me.skill(MultitargetFire);

  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(chasca.id)),
  ).toHaveVariable({ nightsoul: 1 });
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
});

test("multitarget fire: unusable when holding fewer than 3 cards", async () => {
  // 规则集：多重瞄准 条件：手牌数至少为3
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Chasca}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Equipment def={SoulsniperRitualStaff} />
      </Character>
      <Card my def={Strategize} />
      <Card my def={Strategize} />
    </State>,
  );

  await expect(c.me.skill(MultitargetFire)).rejects.toThrow(
    /cannot use skill/i,
  );
});
