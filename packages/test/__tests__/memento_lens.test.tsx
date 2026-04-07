// Copyright (C) 2026 Guyutongxue
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

import { $, Card, Character, ref, setup, State } from "#test";
import { TenacityOfTheMillelith } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { MementoLens } from "@gi-tcg/data/internal/cards/support/item";
import { test } from "bun:test";

test("memento lens: repeated same-name support/equipment card can deduct cost", async () => {
  const target = ref();
  const c = setup(
    <State phase="end">
      <Character my ref={target} />
      <Card my def={TenacityOfTheMillelith} />
      <Card my def={MementoLens} />
      <Card my def={TenacityOfTheMillelith} />
    </State>,
  );

  await c.me.card(TenacityOfTheMillelith, target);
  await c.me.card(MementoLens);
  await c.me.card(TenacityOfTheMillelith, target);

  c.expect($.my.support.def(MementoLens)).toHaveVariable({
    totalUsage: 1,
  });
});
