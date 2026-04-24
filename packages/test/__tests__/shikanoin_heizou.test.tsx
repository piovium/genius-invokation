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

import { $, Character, CombatStatus, ref, setup, State, Status } from "#test";
import { Declension, HeartstopperStrike, ShikanoinHeizou } from "@gi-tcg/data/internal/characters/anemo/shikanoin_heizou";
import { AurousBlaze, Yoimiya } from "@gi-tcg/data/internal/characters/pyro/yoimiya";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("heizou: continue next turn", async () => {
  const declension = ref();
  const c = setup(
    <State>
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 5 }} ref={declension} />
      </Character>
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
    </State>,
  );
  // 准备后：宵宫打 1 火，继续行动：打 5 风扩散
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 4, aura: Aura.None });
  c.expect($.opp.next).toHaveVariable({ health: 9, aura: Aura.Pyro });
  c.expect($.opp.prev).toHaveVariable({ health: 9, aura: Aura.Pyro });
  // 消耗 2 层变格，扩散 +1 层
  c.expect(declension).toHaveVariable({ henkaku: 4 });
});
