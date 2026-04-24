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
import { LumenstoneAdjuvant } from "@gi-tcg/data/internal/cards/support/item";
import { ScionsOfTheCanopy } from "@gi-tcg/data/internal/cards/support/place";
import { FlamestriderBlazingTrail, Mavuika, TheNamedMoment } from "@gi-tcg/data/internal/characters/pyro/mavuika";
import { expect, test } from "bun:test";

test("mavuika: play 'E' card trigger ScionsOfTheCanopy", async () => {
  const mavuika = ref();
  const c = setup(
    <State dataVersion="v5.7.0">
      <Character my active def={Mavuika} ref={mavuika} />
      <Card my def={ScionsOfTheCanopy} />
    </State>,
  );
  await c.me.skill(TheNamedMoment);
  await c.me.selectCard(FlamestriderBlazingTrail); // 涉渡
  await c.opp.end();
  await c.me.card(ScionsOfTheCanopy);
  await c.me.card(FlamestriderBlazingTrail, mavuika);
  // 初始1，打出后变2
  c.expect($.my.support.def(ScionsOfTheCanopy)).toHaveVariable({
    point: 2,
  });
  // 8 - 2(火神E) - 2(涉渡) + 1(悬木人生成) = 5
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
});
