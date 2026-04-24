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

import { $, Card, Character, Equipment, ref, setup, State } from "#test";
import {
  ShadowOfTheSandKing,
  VourukashasGlow,
} from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { BlessingOfTheDivineRelicsInstallation, TheBoarPrincess } from "@gi-tcg/data/internal/cards/event/other";
import { expect, test } from "bun:test";

test("blessing of divine: trigger onDispose of overridden", async () => {
  const from = ref();
  const to = ref();
  const c = setup(
    <State>
      <Character my active ref={to}>
        <Equipment def={VourukashasGlow} />
      </Character>
      <Character my ref={from}>
        <Equipment def={ShadowOfTheSandKing} />
      </Character>
      <Card my def={TheBoarPrincess} />
      <Card my def={BlessingOfTheDivineRelicsInstallation} />
    </State>,
  );
  await c.me.card(TheBoarPrincess);
  await c.me.card(BlessingOfTheDivineRelicsInstallation, from, to);
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
  c.expect($.my.hand).toBeCount(0);
  c.expect($.typeEquipment.at($.id(to.id))).toBeUnique();
});
