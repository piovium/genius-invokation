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

import { $, Card, Character, setup, State } from "#test";
import { WhenTheCraneReturned } from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test("when the crane returned: requires an alive standby character", async () => {
  // 规则集：鹤归之时 条件：我方存在后台角色
  // 断言：后台角色全部被击倒时不可打出；存在存活后台角色时可打出
  const noStandby = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my alive={0} health={0} />
      <Character my alive={0} health={0} />
      <Card my def={WhenTheCraneReturned} />
    </State>,
  );
  await expect(noStandby.me.card(WhenTheCraneReturned)).rejects.toThrow(
    /cannot play/i,
  );

  const withStandby = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my />
      <Character my alive={0} health={0} />
      <Card my def={WhenTheCraneReturned} />
    </State>,
  );
  await withStandby.me.card(WhenTheCraneReturned);
  withStandby.expect($.my.combatStatus).toBeCount(1);
});
