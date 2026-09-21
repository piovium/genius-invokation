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

import { $, Card, setup, State } from "#test";
import {
  ElementalResonanceImpetuousWinds,
  ElementalResonanceImpetuousWindsInEffect01,
  ElementalResonanceImpetuousWindsInEffect02,
  ElementalResonanceImpetuousWindsInEffect03,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { test } from "vitest";

test("impetuous winds: generates three separate in-effect combat statuses", async () => {
  // 规则集：元素共鸣：迅捷之风 - 生成元素共鸣·迅捷之风（生效中）①，②，③
  // 三个生效中状态是彼此独立的出战状态，而不是合并成一个
  const c = setup(
    <State>
      <Card my def={ElementalResonanceImpetuousWinds} />
    </State>,
  );
  await c.me.card(ElementalResonanceImpetuousWinds);
  c.expect(
    $.my.combatStatus.def(ElementalResonanceImpetuousWindsInEffect01),
  ).toBeExist();
  c.expect(
    $.my.combatStatus.def(ElementalResonanceImpetuousWindsInEffect02),
  ).toBeExist();
  c.expect(
    $.my.combatStatus.def(ElementalResonanceImpetuousWindsInEffect03),
  ).toBeExist();
  c.expect($.my.combatStatus).toBeCount(3);
});
