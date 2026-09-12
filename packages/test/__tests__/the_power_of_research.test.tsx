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

import { $, Attachment, Card, Character, ref, setup, State } from "#test";
import {
  BrokenRimesEcho,
  TenacityOfTheMillelith,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  StoneAndContracts,
  ThePowerOfResearch,
  ThePowerOfResearchInEffect,
  WaterAndJustice,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { FavoniusCathedral } from "@gi-tcg/data/internal/cards/support/place.gts";
import { CostIncrease, CostReduction } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test.each([
  { type: "event", threeCost: StoneAndContracts, twoCost: WaterAndJustice },
  { type: "support", threeCost: Paimon, twoCost: FavoniusCathedral },
  {
    type: "equipment",
    threeCost: TenacityOfTheMillelith,
    twoCost: BrokenRimesEcho,
  },
])(
  "the power of research uses $type card costs with attachments",
  async ({ type, threeCost, twoCost }) => {
    const target = ref();
    const c = setup(
      <State>
        <Character my ref={target} health={8} />
        <Card my def={ThePowerOfResearch} />
        <Card my def={threeCost}>
          <Attachment def={CostReduction} v={{ layer: 1 }} />
        </Card>
        <Card my def={twoCost}>
          <Attachment def={CostIncrease} v={{ layer: 1 }} />
        </Card>
      </State>,
    );
    const effect = $.my.combatStatus.def(ThePowerOfResearchInEffect);
    const targets = type === "equipment" ? [target] : [];

    await c.me.card(ThePowerOfResearch);
    c.expect(effect).toHaveVariable({ usage: 3 });
    const diceBefore = c.state.players[0].dice.length;

    await c.me.card(threeCost, ...targets);
    c.expect(effect).toHaveVariable({ usage: 3 });
    expect.soft(c.state.players[0].dice).toHaveLength(diceBefore - 2);

    const diceBeforeIncreasedCard = c.state.players[0].dice.length;
    await c.me.card(twoCost, ...targets);
    c.expect(effect).toHaveVariable({ usage: 2 });
    expect(c.state.players[0].dice).toHaveLength(
      diceBeforeIncreasedCard - 3 + 1,
    );
  },
);
