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

import {
  $,
  Card,
  Character,
  CombatStatus,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore";
import {
  RainbowMacaronsInEffect,
  SingYourHeartOut,
} from "@gi-tcg/data/internal/cards/event/food";
import { TheBestestTravelCompanion } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import {
  Keqing,
  StellarRestoration,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing";
import {
  DetailedDiagnosisThoroughTreatmentStatus,
  LargeBolsteringBubblebalm,
  ReboundHydrotherapy,
  Sigewinne,
} from "@gi-tcg/data/internal/characters/hydro/sigewinne";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan";
import { BondOfLife, Satiated } from "@gi-tcg/data/internal/commons";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("sigwinne: passive triggered after defeated", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Sigewinne} health={1} aura={Aura.Cryo} />
      <Character opp health={10} ref={oppNext}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
        <Status def={BondOfLife} usage={1} />
        <Status def={RainbowMacaronsInEffect} />
        <Status def={Satiated} />
      </Character>
      <Character my active def={Keqing} />
    </State>,
  );
  await c.me.skill(StellarRestoration);
  // 超导后台穿透，oppNext 扣 1 血
  // 马卡龙回 1 血但被生命之契吃掉（生命值 9）
  // 生命之契弃置，触发希格雯被动，最大生命值+1
  // 生命值 10，最大生命值 11
  c.expect(oppNext).toHaveVariable({ health: 10, maxHealth: 11 });
  c.expect($.opp.typeStatus.def(DetailedDiagnosisThoroughTreatmentStatus),
  ).toNotExist();
  await c.opp.chooseActive(oppNext);
  c.expect($.opp.active).toBe(oppNext);
});

test("sigwinne: bubble", async () => {
  const target = ref();
  const c = setup(
    <State dataVersion="v6.1.0">
      <Character my def={Sigewinne} />
      <Character my ref={target} health={1} />
      <Card pile my def={Paimon} />
      <Card pile my def={Paimon} />
      <Card pile my def={TheBestestTravelCompanion} />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await c.me.skill(ReboundHydrotherapy);
  await c.opp.end();
  await c.me.switch(target);
  await c.me.card(SingYourHeartOut);
  // 抓三张，水泡自动弃置
  c.expect($.my.hand).toBeCount(2);
  c.expect(target).toHaveVariable({ health: 4 });
});

test("sigwinne bubble: disposed before HCI event", async () => {
  const myActive = ref();
  const c = setup(
    <State>
      <Character my active def={Xinyan} health={1} ref={myActive}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Character my def={Sigewinne} />
      <Card my pile def={LargeBolsteringBubblebalm} /> 
    </State>
  );
  await c.me.skill(SweepingFervor);
  // 希格雯水泡抽上来且舍弃掉
  c.expect($.my.pile).toBeCount(0);
  // 但是不会触发效果
  c.expect($.opp.pile).toBeCount(0);
  c.expect(myActive).toHaveVariable({ health: 1 });
});
