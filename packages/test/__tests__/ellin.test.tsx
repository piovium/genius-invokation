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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food";
import { Ellin } from "@gi-tcg/data/internal/cards/support/ally";
import { CeremonialBladework, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { AgileSwitch, EfficientSwitch } from "@gi-tcg/data/internal/commons";
import { expect, test } from "vitest";

test("Ellin: discard records after characters defeated", async () => {
  const kaeya = ref();
  const myNext = ref();
  const ellin = ref();
  const c = setup(
    <State>
      <Character opp def={Kaeya} />
      <Character my def={Kaeya} ref={kaeya} health={1} />
      <Character my ref={myNext} />
      <CombatStatus my def={AgileSwitch} />
      <CombatStatus my def={EfficientSwitch} />
      <Card my def={TeyvatFriedEgg} />
      <Support my def={Ellin} ref={ellin} />
    </State>
  );
  await c.me.skill(CeremonialBladework);
  await c.opp.skill(CeremonialBladework);
  await c.me.chooseActive(myNext);
  await c.me.card(TeyvatFriedEgg, kaeya);
  await c.me.switch(kaeya);
  // 8 - 3 - 2
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  await c.me.skill(CeremonialBladework);
  // 不触发减费
  expect(c.state.players[0].dice).toBeArrayOfSize(0);
  c.expect(ellin).toHaveVariable({ usagePerRound: 1 });
});
