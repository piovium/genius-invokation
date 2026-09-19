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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { Card, Character, ref, setup, State, Summon } from "#test";
import { QuickKnit } from "@gi-tcg/data/internal/cards/event/other.gts";
import { ClusterbloomArrow } from "@gi-tcg/data/internal/characters/dendro/tighnari.gts";
import { test } from "vitest";

test.each([2, 3])(
  "quick knit increases Clusterbloom Arrow usage from %i beyond its append limit",
  async (usage) => {
    const summon = ref();
    const c = setup(
      <State>
        <Character my active />
        <Character opp active />
        <Summon my def={ClusterbloomArrow} ref={summon} v={{ usage }} />
        <Card my def={QuickKnit} />
      </State>,
    );

    c.expect(summon).toHaveVariable({ usage });
    await c.me.card(QuickKnit, summon);
    c.expect(summon).toHaveVariable({ usage: usage + 1 });
  },
);
