// Copyright (C) 2024-2025 Guyutongxue
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

import { ref, setup, Character, State, Status, Card, Equipment, $, Summon } from "#test";
import { QuickKnit } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { Ineffa } from "@gi-tcg/data/internal/characters/electro/ineffa";
import { Conductive, Thundercloud } from "@gi-tcg/data/internal/commons";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("thundercloud: trigger on gainUsage", async () => {
  const oppHand = ref();
  const thundercloud = ref();
  const c = setup(
    <State>
      <Card opp def={Paimon} ref={oppHand} />
      <Character my def={Ineffa} />
      <Summon my def={Thundercloud} ref={thundercloud} />
      <Card my def={QuickKnit} />
    </State>
  );
  c.expect(thundercloud).toHaveVariable({ usage: 1 });
  await c.me.card(QuickKnit, thundercloud);
  c.expect(thundercloud).toHaveVariable({ usage: 2 });
  c.expect($.attachment.def(Conductive).on($.id(oppHand.id))).toBeExist();
});
