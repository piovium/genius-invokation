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

import { ref, setup, Character, State, Card, Status, $ } from "#test";
import { ScionsOfTheCanopy } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  BlazingTrail,
  CrucibleOfDeathAndLife,
  FlamestriderBlazingTrail,
  FlamestriderSoaringAscent,
  Mavuika,
  NightsoulsBlessing,
  SoaringAscent,
  TheNamedMoment,
} from "@gi-tcg/data/internal/characters/pyro/mavuika.gts";
import { expect, test } from "vitest";

test("mavuika: play 'E' card trigger ScionsOfTheCanopy", async () => {
  const mavuika = ref();
  const c = setup(
    <State>
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
  // 8 - 3(火神E) - 2(涉渡) + 1(悬木人生成) = 4
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
  // 点涉渡
  await c.me.skill(BlazingTrail);
  c.expect($.my.prev).toBeDefinition(Mavuika);
  c.expect($.my.typeEquipment.def(FlamestriderBlazingTrail)).toHaveVariable({
    usage: 1,
  });
});

test("mavuika: technique consumes Crucible of Death and Life usage", async () => {
  const mavuika = ref();
  const c = setup(
    <State>
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
        <Status def={CrucibleOfDeathAndLife} />
      </Character>
      <Card my def={FlamestriderSoaringAscent} />
    </State>,
  );
  await c.me.card(FlamestriderSoaringAscent, mavuika);
  await c.me.skill(SoaringAscent);

  c.expect($.my.typeStatus.def(CrucibleOfDeathAndLife)).toHaveVariable({
    usage: 1,
  });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});
