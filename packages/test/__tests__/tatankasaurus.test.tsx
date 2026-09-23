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
  setup,
  Character,
  State,
  Support,
  Equipment,
  DeclaredEnd,
} from "#test";
import {
  Tatankasaurus,
  SpiritedState,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  CollectiveOfPlenty,
  Exercise,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import { Bennett } from "@gi-tcg/data/internal/characters/pyro/bennett.gts";
import { test } from "vitest";

test("Tatankasaurus: exercise reaches 5 and both normal attacks are boosted", async () => {
  // 己方有沃陆之邦，使用昂扬状态，先附属【突角龙（生效中）】获得3层锻炼，再准备【普通攻击】，达到5层锻炼，2次普通攻击能得到增伤
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Bennett} health={10}>
        <Equipment def={Tatankasaurus} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );
  await c.me.skill(SpiritedState);
  c.expect($.my.def(Exercise)).toHaveVariable({ layer: 5 });
  // 两次普攻均为 2 + 1
  c.expect($.opp.active).toHaveVariable({ health: 4 });
});
