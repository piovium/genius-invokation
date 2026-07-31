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

import { $, Card, Character, ref, setup, State } from "#test";
import { UltimateOverlordsMegaMagicSword } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { LeaveItToMe } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Noelle } from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import { expect, test } from "vitest";

test("ultimate overlord's mega magic sword: accesses its associated extension", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Noelle} ref={target} />
      <Card my def={UltimateOverlordsMegaMagicSword} />
      <Card my notInitial def={LeaveItToMe} />
    </State>,
  );
  c.expect($.def(UltimateOverlordsMegaMagicSword)).toHaveVariable({ supp: 0 });
  await c.me.card(LeaveItToMe);
  await c.me.card(UltimateOverlordsMegaMagicSword, target);
  c.expect($.def(UltimateOverlordsMegaMagicSword)).toHaveVariable({ supp: 1 });
});
