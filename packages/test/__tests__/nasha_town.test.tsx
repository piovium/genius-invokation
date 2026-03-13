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

import { Card, Character, Support, ref, setup, State } from "#test";
import { Katheryne, Paimon, Timaeus } from "@gi-tcg/data/internal/cards/support/ally";
import { NashaTown, WangshuInn } from "@gi-tcg/data/internal/cards/support/place";
import { expect, test } from "bun:test";

test("nasha town: no selfDispose trigger when targeted by support play", async () => {
  const myActive = ref();
  const nashaTown = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={10} />
      <Support my def={NashaTown} ref={nashaTown} usage={0} />
      <Support my def={Paimon} />
      <Support my def={Katheryne} />
      <Support my def={Timaeus} />
      <Card my def={WangshuInn} />
    </State>,
  );

  await c.me.card(WangshuInn, nashaTown);

  c.expect(myActive).toHaveVariable({ health: 10 });
  c.expect(nashaTown).toNotExist();
  c.expect(`my support with definition id ${WangshuInn}`).toBeExist();
  expect(c.state.players[0].supports).toHaveLength(4);
});
