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
import { LeaveItToMe } from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test("leave it to me: requires at least two undefeated characters", async () => {
  // 规则集：交给我吧！ 条件：我方有至少2名未击倒角色
  // 断言：仅剩出战角色存活时不可打出；存在存活后台角色时可打出
  const onlyOneAlive = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my alive={0} health={0} />
      <Character my alive={0} health={0} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await expect(onlyOneAlive.me.card(LeaveItToMe)).rejects.toThrow(
    /cannot play/i,
  );

  const twoAlive = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my />
      <Character my alive={0} health={0} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  await twoAlive.me.card(LeaveItToMe);
  twoAlive.expect($.my.combatStatus).toBeCount(1);
});
