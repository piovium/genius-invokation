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

import { ref, setup, Character, State, Equipment, $ } from "#test";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("damage combination", async () => {
  const target = ref();
  const veteran = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Sucrose} />
      <Character my active aura={Aura.Electro} />
      <Character my aura={Aura.Cryo} />
      <Character my aura={Aura.Cryo} ref={target} health={10} >
        <Equipment def={VeteransVisage} ref={veteran} />
      </Character>
    </State>,
  );
  await c.opp.skill(WindSpiritCreation);
  // 扩雷 1 伤
  // 雷冰超导 +1
  // 另一位的雷冰超导触发的后台穿透 +1
  c.expect(target).toHaveVariable({ health: 7 });
  // 伤害合并后，只触发一次老兵，不抽牌
  c.expect(veteran).toHaveVariable({ count: 1 });
  c.expect($.my.hand).toBeCount(0);
});
