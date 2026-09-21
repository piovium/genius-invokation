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

import { ref, setup, Character, State, Card, $, Status } from "#test";
import { TandooriRoastChicken } from "@gi-tcg/data/internal/cards/event/food.gts";
import { AbyssLectorVioletLightning, ChainLightningCascade, ElectricRebirth, ElectricRebirthHoned, ShockOfTheEnigmaticAbyss } from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import { JadeScreen, Ningguang, SparklingScatter } from "@gi-tcg/data/internal/characters/geo/ningguang.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("electro abyss talent: triggered on defeated", async () => {
  const abyss = ref();
  const c = setup(
    <State>
      <Card opp def={TandooriRoastChicken} />
      <Character opp active def={Ningguang} energy={2} />
      <Character my active def={AbyssLectorVioletLightning} health={1} ref={abyss} >
        <Status def={ElectricRebirth} />
      </Character>
      <Card my def={ChainLightningCascade} />
    </State>
  );
  await c.me.card(ChainLightningCascade, abyss);
  await c.me.end();
  // 打出复活甲
  await c.opp.skill(SparklingScatter);
  c.expect(abyss).toHaveVariable({ health: 4 });
  c.expect($.my.typeStatus.def(ElectricRebirthHoned)).toBeExist();
  // 被夺取一点充能
  c.expect($.opp.active).toHaveVariable({ energy: 2 });
  await c.opp.card(TandooriRoastChicken);
  // 2+2 打 4
  await c.opp.skill(JadeScreen);
  c.expect(abyss).toHaveVariable({ alive: 0 });
  // 被夺取一点充能
  c.expect($.opp.active).toHaveVariable({ energy: 2 });
})

test("abyss lector: the enigmatic abyss steals energy from an electro-attached target", async () => {
  // 规则集：如果目标附着雷元素且有充能->目标失去1点充能，我方一名角色获得1点充能；造成3点雷元素伤害
  // 断言：目标充能 1 -> 0，我方咏者获得 1 点充能（再加上使用元素战技本身的 1 点），并受到 3 点雷伤。
  const abyss = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} energy={1} aura={Aura.Electro} />
      <Character my active def={AbyssLectorVioletLightning} ref={abyss} energy={0} />
    </State>
  );
  await c.me.skill(ShockOfTheEnigmaticAbyss);
  c.expect(target).toHaveVariable({ health: 7, energy: 0, aura: Aura.Electro });
  c.expect(abyss).toHaveVariable({ energy: 2 });
})

test("abyss lector: no energy is stolen when the target is not electro-attached", async () => {
  // 规则集：如果目标附着雷元素且有充能->目标失去1点充能，我方一名角色获得1点充能
  // 断言：目标未附着雷元素时不夺取充能，我方也不额外获得充能。
  const abyss = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} energy={1} />
      <Character my active def={AbyssLectorVioletLightning} ref={abyss} energy={0} />
    </State>
  );
  await c.me.skill(ShockOfTheEnigmaticAbyss);
  c.expect(target).toHaveVariable({ health: 7, energy: 1, aura: Aura.Electro });
  // 只有使用元素战技本身的 1 点充能
  c.expect(abyss).toHaveVariable({ energy: 1 });
})

test("abyss lector: nobody gains energy when the electro-attached target has none", async () => {
  // 规则集：如果目标附着雷元素且有充能->目标失去1点充能，我方一名角色获得1点充能
  // 断言：目标虽附着雷元素但充能为 0，则不发生夺取，我方也不额外获得充能。
  const abyss = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} energy={0} aura={Aura.Electro} />
      <Character my active def={AbyssLectorVioletLightning} ref={abyss} energy={0} />
    </State>
  );
  await c.me.skill(ShockOfTheEnigmaticAbyss);
  c.expect(target).toHaveVariable({ health: 7, energy: 0, aura: Aura.Electro });
  c.expect(abyss).toHaveVariable({ energy: 1 });
})
