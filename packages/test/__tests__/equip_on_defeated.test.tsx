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

import { ref, setup, Character, State, Equipment, Card, $ } from "#test";
import { HeartOfKhvarenasBrilliance } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { Keqing, YunlaiSwordsmanship } from "@gi-tcg/data/internal/characters/electro/keqing";
import { test } from "bun:test";

test("HeartOfKhvarenasBrilliance should not trigger on defeated damage", async () => {
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active def={Keqing} health={1}>
        <Equipment def={HeartOfKhvarenasBrilliance} />
        </Character>
      <Character my def={Kaeya} ref={myNext} />
      <Card my pile def={Paimon} />
    </State>,
  );
  await c.expect($.my.hand).toBeCount(0);
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(myNext);
  await c.expect($.my.hand).toBeCount(0);
});
