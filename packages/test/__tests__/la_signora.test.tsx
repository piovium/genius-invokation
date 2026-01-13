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

import { Card, Character, CombatStatus, ref, setup, State, Status } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food";
import {
  IcesealedCrimsonWitchOfEmbers,
  LaSignora,
} from "@gi-tcg/data/internal/characters/cryo/la_signora";
import { GrassRingOfSanctification, KukiShinobu } from "@gi-tcg/data/internal/characters/electro/kuki_shinobu";
import { BestialAscent, Gaming } from "@gi-tcg/data/internal/characters/pyro/gaming";
import { test } from "bun:test";

test("la signora: death in cryo state", async () => {
  const laSignora = ref();
  const c = setup(
    <State>
      <Card opp def={TeyvatFriedEgg} />
      <Character
        opp
        active
        def={LaSignora}
        ref={laSignora}
        health={1}
      >
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
      <Character opp />
      <Character my def={Gaming} />
      <CombatStatus my def={GrassRingOfSanctification} />
      <Character my def={KukiShinobu} />
    </State>,
  );
  // 嘉明E技能内火伤+切人，打死女士，女士免于被击倒回1
  // 切人触发鸣草结环再打1，以冰形态击倒
  await c.me.skill(BestialAscent);

  // 死了
  c.expect(laSignora).toHaveVariable({ alive: 0 });
  // 复活甲没了
  c.expect(
    `opp status with definition id ${IcesealedCrimsonWitchOfEmbers}`,
  ).toNotExist();
  // 仍然是冰形态
  c.expect(`with id ${laSignora.id}`).toBeDefinition(LaSignora);

  await c.opp.card(TeyvatFriedEgg, laSignora);

  c.expect(laSignora).toHaveVariable({ alive: 1, health: 1 });
  // 复活后带着复活甲
  c.expect(
    `opp status with definition id ${IcesealedCrimsonWitchOfEmbers}`,
  ).toBeExist();
});
