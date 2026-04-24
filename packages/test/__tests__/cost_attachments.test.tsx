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

import { ref, setup, State, Character, Support, $, Card } from "#test";
import { CountdownToTheShow3 } from "@gi-tcg/data/internal/cards/event/other";
import { SuperconductBlessingDeepFreeze } from "@gi-tcg/data/internal/cards/support/blessing";
import { FrostmoonEnclave } from "@gi-tcg/data/internal/cards/support/place";
import { CeremonialBladework, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { CostIncrease, NoTuningAllowed } from "@gi-tcg/data/internal/commons";
import { test } from "bun:test";

test("cost decrease applied on increase will neutralize each other", async () => {
  const theHandCard = ref();
  const c = setup(
    <State currentTurn="opp">
      <Support opp def={SuperconductBlessingDeepFreeze} />
      <Character opp def={Kaeya} />
      <Support my def={FrostmoonEnclave} />
      <Card my def={CountdownToTheShow3} ref={theHandCard} />
    </State>
  );
  await c.opp.skill(CeremonialBladework);
  c.expect($.my.attachment.def(CostIncrease)).toHaveVariable({ layer: 1 });
  await c.me.end();
  await c.opp.end();
  // 被减费抵消
  c.expect($.my.attachment.def(CostIncrease)).toNotExist();
  // 但不可调和还在
  c.expect($.my.attachment.on($.id(theHandCard.id))).toBeDefinition(NoTuningAllowed);
});
