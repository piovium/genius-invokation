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

import { $, Card, DiceCount, setup, State } from "#test";
import { ThunderAndEternity } from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test("thunder and eternity: can be played with no dice at all", async () => {
  // 规则集：雷与永恒 注：没有元素骰也能使用
  // 我方骰子为 0 时仍然是合法行动
  const c = setup(
    <State>
      <DiceCount my count={0} />
      <Card my def={ThunderAndEternity} />
    </State>,
  );
  await c.me.card(ThunderAndEternity);
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[0].dice).toBeArrayOfSize(0);
});
