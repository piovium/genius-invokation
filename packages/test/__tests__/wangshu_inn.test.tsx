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

import { ref, setup, Character, State, Support, DeclaredEnd } from "#test";
import { WangshuInn } from "@gi-tcg/data/internal/cards/support/place";
import { Keqing } from "@gi-tcg/data/internal/characters/electro/keqing";
import { AlldevouringNarwhal } from "@gi-tcg/data/internal/characters/hydro/alldevouring_narwhal";
import { test } from "vitest";

test("wangshu inn", async () => {
  const wangshuInn = ref();
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Support my def={WangshuInn} ref={wangshuInn} />
      <Character my active />
      <Character my def={AlldevouringNarwhal} />
      <Character my def={Keqing} health={6} ref={target} />
    </State>,
  );
  await c.me.end();
  c.expect(wangshuInn).toHaveVariable({ usage: 1 });
  c.expect(target).toHaveVariable({ health: 8 });
});
