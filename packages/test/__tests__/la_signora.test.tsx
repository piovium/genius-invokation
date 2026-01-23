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

import { Card, Character, DeclaredEnd, ref, setup, State, Status } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food";
import {
  IcesealedCrimsonWitchOfEmbers,
  LaSignora,
} from "@gi-tcg/data/internal/characters/cryo/la_signora";
import {
  Chevreuse,
  RingOfBurstingGrenades,
} from "@gi-tcg/data/internal/characters/pyro/chevreuse";
import { Aura } from "@gi-tcg/typings";
import { expect } from "bun:test";
import { test } from "bun:test";

test("la signora: death in cryo state", async () => {
  const laSignora = ref();
  const otherOpp = ref();
  const c = setup(
    <State>
      <Card opp def={TeyvatFriedEgg} />
      <Character
        opp
        active
        def={LaSignora}
        ref={laSignora}
        health={1}
        aura={Aura.Electro}
      >
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
      <Character opp aura={Aura.Electro} ref={otherOpp} />
      <Character opp alive={0} />
      <Character my active def={Chevreuse} energy={2} />
    </State>,
  );
  // 火伤打雷底，触发超载，女士免于被击倒
  // 超载触发“二重毁伤弹”火伤，再触发超载，再切回女士
  // 再触发一次火伤，将女士以冰形态击倒
  await c.me.skill(RingOfBurstingGrenades);

  // 死了
  c.expect(laSignora).toHaveVariable({ alive: 0 });
  // 复活甲没了
  c.expect(
    `opp status with definition id ${IcesealedCrimsonWitchOfEmbers}`,
  ).toNotExist();
  // 仍然是冰形态
  c.expect(`with id ${laSignora.id}`).toBeDefinition(LaSignora);

  await c.opp.chooseActive(otherOpp);
  await c.opp.card(TeyvatFriedEgg, laSignora);

  c.expect(laSignora).toHaveVariable({ alive: 1, health: 1 });
  // 复活后带着复活甲
  c.expect(
    `opp status with definition id ${IcesealedCrimsonWitchOfEmbers}`,
  ).toBeExist();
});
