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

import { ref, setup, Character, State, Status, Card, $, DiceCount } from "#test";
import { AnAncientSacrificeOfSacredBrocade } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  ChenyuVale,
  TheChasm,
  Tonatiuh,
} from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { DiceType } from "@gi-tcg/typings";
import { describe, expect, test } from "vitest";

describe("adventure", () => {
  test("chenyuvale basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(ChenyuVale);
    c.expect($.my.support.def(ChenyuVale)).toHaveVariable({ exp: 1 });
  });

  test("chasm basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(TheChasm);
    c.expect($.my.pile).toBeCount(5);
  });

  test("tonatiuh basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
        <DiceCount my count={2} type={DiceType.Cryo} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(Tonatiuh);
    expect(c.state.players[0].dice).toEqual([DiceType.Omni]);
  })
});
