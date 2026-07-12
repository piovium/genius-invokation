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

import { $, DeclaredEnd, State, Support, ref, setup } from "#test";
import { Jeht, KidKujirai } from "@gi-tcg/data/internal/cards/support/ally";
import { expect, test } from "vitest";

test("Kid Kujirai: move to opponent support area without counting as dispose", async () => {
  const kid = ref();
  const jeht = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Support my def={KidKujirai} ref={kid} />
      <Support my def={Jeht} ref={jeht} />
    </State>,
  );
  await c.me.end();
  c.expect($.my.id(kid.id)).toNotExist();
  c.expect($.opp.id(kid.id)).toBeExist();
  c.expect(jeht).toHaveVariable({ experience: 0 });
});
