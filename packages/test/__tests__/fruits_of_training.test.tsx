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

import { $, Character, ref, setup, State, Status } from "#test";
import {
  FruitsOfTrainingInEffect01,
  FruitsOfTrainingInEffect02,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  FatuiElectroCicinMage,
  SurgingThunderStatus,
  ThunderingShield,
} from "@gi-tcg/data/internal/characters/electro/fatui_electro_cicin_mage.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("fruits of training: interrupted preparation triggers once for each character", async () => {
  const mage = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character
        my
        active
        def={FatuiElectroCicinMage}
        ref={mage}
        energy={2}
        aura={Aura.Pyro}
      >
        <Status def={FruitsOfTrainingInEffect01} />
      </Character>
      <Character my ref={next}>
        <Status def={FruitsOfTrainingInEffect01} />
      </Character>
    </State>,
  );

  await c.me.skill(ThunderingShield);

  c.expect($.my.active).toBe(next);
  c.expect($.def(SurgingThunderStatus)).toNotExist();
  for (const character of [mage, next]) {
    c.expect(
      $.def(FruitsOfTrainingInEffect01).at($.id(character.id)),
    ).toHaveVariable({ usage: 1 });
    c.expect(
      $.def(FruitsOfTrainingInEffect02).at($.id(character.id)),
    ).toHaveVariable({ usage: 1 });
  }
});
