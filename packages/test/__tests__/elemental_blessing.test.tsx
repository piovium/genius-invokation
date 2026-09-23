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

import { $, Card, Character, DiceCount, setup, State } from "#test";
import { ElementalTransfigurationSuperconductBlessing as SuperconductBlessing } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Chongyun } from "@gi-tcg/data/internal/characters/cryo/chongyun.gts";
import { Fischl } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

const D = DiceType;
const count = (dice: readonly DiceType[], type: DiceType) =>
  dice.filter((d) => d === type).length;

test("elemental blessing: multiple copies in hand resolve as a single activation", async () => {
  // 手牌和牌库中存在多张元素幻变时，第一张行动前自动打出时会弃置所有同名牌
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Kaeya} />
      <Character my def={Chongyun} />
      <Character my def={Fischl} />
      <Card my def={SuperconductBlessing} />
      <Card my def={SuperconductBlessing} />
      <DiceCount my count={8} type={D.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.support.def(SuperconductBlessing)).toBeCount(1);
  const dice = c.state.players[0].dice;
  expect(count(dice, D.Pyro)).toBe(4);
  expect(count(dice, D.Cryo)).toBe(2);
  expect(count(dice, D.Electro)).toBe(2);
  c.expect($.my.hand.def(SuperconductBlessing)).toBeCount(0);
});
