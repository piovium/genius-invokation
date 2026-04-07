// Copyright (C) 2024-2025 Guyutongxue
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
  Status,
  Equipment,
  Card,
  $,
} from "#test";
import {
  Klee,
  Kaboom,
  ExplosiveSpark,
  JumpyDumpty,
} from "@gi-tcg/data/internal/characters/pyro/klee";
import { TulaytullahsRemembrance } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst";
import { VermillionHereafter } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { MintyMeatRolls } from "@gi-tcg/data/internal/cards/event/food";
import { test } from "bun:test";
import { expect } from "bun:test";

test("klee: dice deduction", async () => {
  const klee = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Klee} ref={klee}>
        <Equipment def={TulaytullahsRemembrance} />
        <Equipment def={VermillionHereafter} />
      </Character>
      <Card my def={MintyMeatRolls} />
    </State>,
  );
  await c.me.card(MintyMeatRolls, klee);
  expect(c.state.players[0].dice).toBeArrayOfSize(7);

  await c.me.skill(JumpyDumpty);
  await c.opp.end();
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  expect(c.state.players[0].dice).toBeArrayOfSize(4);

  await c.me.skill(Kaboom);
  expect(c.state.players[0].dice).toBeArrayOfSize(4);

  c.expect($.my.typeStatus.def(ExplosiveSpark)).toNotExist();
  c.expect($.my.typeEquipment.def(TulaytullahsRemembrance)).toHaveVariable({
    usagePerRound: 1,
  });
  c.expect($.my.typeEquipment.def(VermillionHereafter)).toHaveVariable({
    usagePerRound: 1,
  });
});
