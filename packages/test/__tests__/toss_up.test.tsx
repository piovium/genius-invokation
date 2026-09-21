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

import { Card, Character, DiceCount, setup, State } from "#test";
import { TossUp } from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test.fails("toss up: requires at least one die", async () => {
  // 规则集：乾坤一掷 条件：我方有至少一枚元素骰
  // 当前引擎：一掷乾坤（332003，cards/event/other.gts:803）无 filter 子句，0 骰时该
  // 行动仍为 VALID，可正常打出（重投无骰可投，等同于白白弃掉一张手牌）
  // 断言：我方没有任何元素骰时不可打出
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my def={TossUp} />
      <DiceCount my dice={[]} />
    </State>,
  );
  expect(c.state.players[0].dice).toHaveLength(0);
  await expect(c.me.card(TossUp)).rejects.toThrow(/cannot play/i);
});
