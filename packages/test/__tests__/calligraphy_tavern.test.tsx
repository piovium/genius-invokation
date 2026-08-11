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

import { Card, ref, setup, State, Summon, Support, $ } from "#test";
import { PopupPaperFrogSummon } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon, Setaria } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { CalligraphyTavern } from "@gi-tcg/data/internal/cards/support/place.gts";
import { test } from "vitest";

test("calligraphy tavern triggers before after-action effects on declare end", async () => {
  const setaria = ref();
  const calligraphyTavern = ref();
  const popupPaperFrog = ref();
  const c = setup(
    <State>
      <Support my def={Setaria} ref={setaria} />
      <Support my def={CalligraphyTavern} ref={calligraphyTavern} />
      <Summon my def={PopupPaperFrogSummon} ref={popupPaperFrog} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.end();

  c.expect($.my.hand).toBeCount(1);
  c.expect(setaria).toHaveVariable({ usage: 3 });
  c.expect(calligraphyTavern).toHaveVariable({ usage: 2 });
  c.expect(popupPaperFrog).toHaveVariable({ usage: 1 });
});
