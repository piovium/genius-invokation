// Copyright (C) 2025 Guyutongxue
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

import { ref, setup, Character, State, Status, Card, Equipment, Support, DeclaredEnd, $ } from "#test";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { TheMausoleumOfKingDeshret } from "@gi-tcg/data/internal/cards/support/place";
import { test } from "bun:test";

test("the mausoleum of king deshret: trigger on overflowed HCI", async () => {
  const mausoleum = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Support opp ref={mausoleum} def={TheMausoleumOfKingDeshret} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
    </State>,
  );
  c.expect($.my.hand).toBeCount(10);
  await c.me.end();
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 2 });
  c.expect($.my.hand).toBeCount(10);
});
