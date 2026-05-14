
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

import { ref, setup, Character, State, Equipment, CombatStatus, Card } from "#test";
import { KamisatoAyaka, KantenSenmyouBlessing } from "@gi-tcg/data/internal/characters/cryo/kamisato_ayaka";
import { expect, test } from "vitest";

test("a talent dup-equip test", async () => {
  const ayaka = ref();
  const c = setup(
    <State>
      <Character my active def={KamisatoAyaka} ref={ayaka} />
      <Card my def={KantenSenmyouBlessing} />
      <Card my def={KantenSenmyouBlessing} />
    </State>,
  );
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
});
