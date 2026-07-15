// Copyright (C) 2026 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { $, Character, ref, setup, State, Status, Support } from "#test";
import {
  CollectiveOfPlenty,
  Exercise,
} from "@gi-tcg/data/internal/cards/support/place";
import { test } from "vitest";

test("collective of plenty: recreating exercise heals when it crosses three layers", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={target} health={8}>
        <Status def={Exercise} v={{ layer: 2 }} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.switch(target);

  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.def(Exercise)).toHaveVariable({ layer: 4 });
});
