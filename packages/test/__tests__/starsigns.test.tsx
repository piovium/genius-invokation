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

import { $, Card, Character, setup, State } from "#test";
import { Starsigns } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { expect, test } from "vitest";

test("starsigns: requires the active character's energy not to be full", async () => {
  // 规则集：星天之兆 条件：我方出战角色充能未满
  // 断言：出战角色充能已满时不可打出；未满时可打出并获得 1 点充能
  const fullEnergy = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={3} />
      <Card my def={Starsigns} />
    </State>,
  );
  await expect(fullEnergy.me.card(Starsigns)).rejects.toThrow(/cannot play/i);

  const notFull = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={2} />
      <Card my def={Starsigns} />
    </State>,
  );
  await notFull.me.card(Starsigns);
  notFull.expect($.my.active).toHaveVariable({ energy: 3 });
});
