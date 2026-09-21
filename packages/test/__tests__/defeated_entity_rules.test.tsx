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

import {
  ref,
  setup,
  Character,
  State,
  Status,
  Equipment,
  Card,
  $,
} from "#test";
import {
  GamblersEarrings,
  TenacityOfTheMillelith,
  VeteransVisage,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { EverlastingMoonglow } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import { TravelersHandySword } from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import { Satiated } from "@gi-tcg/data/internal/commons.gts";
import {
  Frostgnaw,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { ElectricRebirth } from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import {
  Keqing,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { SuperlativeSuperstrength } from "@gi-tcg/data/internal/characters/geo/arataki_itto.gts";
import {
  Azhdaha,
  AzhdahaCryo,
  StoneFacetsElementalCrystallization,
} from "@gi-tcg/data/internal/characters/geo/azhdaha.gts";
import { Barbara } from "@gi-tcg/data/internal/characters/hydro/barbara.gts";
import { expect, test } from "vitest";

test("equipment: disposed after its wearer is defeated", async () => {
  // 规则集：装备牌/角色状态默认具有能力：【被击倒后，弃置此牌】
  // 断言：武器与圣遗物在装备者被击倒后均被弃置
  const myActive = ref();
  const myNext = ref();
  const weapon = ref();
  const artifact = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active def={Keqing} health={2} ref={myActive}>
        <Equipment def={TravelersHandySword} ref={weapon} />
        <Equipment def={GamblersEarrings} ref={artifact} />
      </Character>
      <Character my def={Kaeya} ref={myNext} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(myNext);
  c.expect(myActive).toHaveVariable({ alive: 0, health: 0 });
  c.expect(weapon).toNotExist();
  c.expect(artifact).toNotExist();
  const defeatedCh = c.state.players[0].characters.find(
    (ch) => ch.id === myActive.id,
  )!;
  expect(defeatedCh.entities).toBeArrayOfSize(0);
});

test("character status: disposed after its wearer is defeated", async () => {
  // 规则集：装备牌/角色状态默认具有能力：【被击倒后，弃置此牌】
  // 断言：持续回合型与可用次数型的角色状态在所附属角色被击倒后均被弃置
  const myActive = ref();
  const myNext = ref();
  const satiated = ref();
  const strength = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active def={Keqing} health={2} ref={myActive}>
        <Status def={Satiated} ref={satiated} />
        <Status def={SuperlativeSuperstrength} usage={2} ref={strength} />
      </Character>
      <Character my def={Kaeya} ref={myNext} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(myNext);
  c.expect(myActive).toHaveVariable({ alive: 0, health: 0 });
  c.expect(satiated).toNotExist();
  c.expect(strength).toNotExist();
  const defeatedCh = c.state.players[0].characters.find(
    (ch) => ch.id === myActive.id,
  )!;
  expect(defeatedCh.entities).toBeArrayOfSize(0);
});

test("equipment ability: not triggered when the wearer is defeated by that damage", async () => {
  // 规则集：装备牌/角色状态能力默认具有条件：若装备者未被击倒
  // 对照：老兵的容颜（角色受到伤害或治疗后第 1 次触发：生成 1 个此角色类型的元素骰）在装备者存活时生成骰子
  {
    const c = setup(
      <State currentTurn="opp">
        <Character opp active def={Keqing} />
        <Character my active def={Keqing} health={3}>
          <Equipment def={VeteransVisage} />
        </Character>
      </State>,
    );
    await c.opp.skill(YunlaiSwordsmanship);
    c.expect($.my.active).toHaveVariable({ health: 1 });
    expect(c.state.players[0].dice).toBeArrayOfSize(9);
  }
  // 断言：同一伤害击倒装备者时，老兵的容颜的「受到伤害后」能力不发动，骰子数不变
  // 老兵的容颜自身没有「所附属角色为出战角色」之类的条件，发动与否只取决于该默认条件
  {
    const myNext = ref();
    const c = setup(
      <State currentTurn="opp">
        <Character opp active def={Keqing} />
        <Character my active def={Keqing} health={2}>
          <Equipment def={VeteransVisage} />
        </Character>
        <Character my def={Kaeya} ref={myNext} />
      </State>,
    );
    await c.opp.skill(YunlaiSwordsmanship);
    await c.me.chooseActive(myNext);
    expect(c.state.players[0].dice).toBeArrayOfSize(8);
  }
});

test("character status ability: not triggered when the wearer is defeated by that damage", async () => {
  // 规则集：装备牌/角色状态能力默认具有条件：若装备者未被击倒
  // 对照：磐岩百相·元素凝晶（角色受到冰元素伤害后汲取冰元素）在角色存活时使若陀龙王变为冰形态
  {
    const azhdaha = ref();
    const c = setup(
      <State>
        <Character opp active def={Azhdaha} health={4} ref={azhdaha}>
          <Status def={StoneFacetsElementalCrystallization} />
        </Character>
        <Character my active def={Kaeya} />
      </State>,
    );
    await c.me.skill(Frostgnaw);
    c.expect(azhdaha).toHaveVariable({ health: 1 });
    c.expect(azhdaha).toBeDefinition(AzhdahaCryo);
  }
  // 断言：同一伤害击倒若陀龙王时，元素凝晶的「受到伤害后」能力不发动，角色定义不变
  {
    const azhdaha = ref();
    const oppNext = ref();
    const c = setup(
      <State>
        <Character opp active def={Azhdaha} health={3} ref={azhdaha}>
          <Status def={StoneFacetsElementalCrystallization} />
        </Character>
        <Character opp def={Keqing} ref={oppNext} />
        <Character my active def={Kaeya} />
      </State>,
    );
    await c.me.skill(Frostgnaw);
    await c.opp.chooseActive(oppNext);
    c.expect(azhdaha).toHaveVariable({ alive: 0, health: 0 });
    c.expect(azhdaha).toBeDefinition(Azhdaha);
  }
});

test("defeated = damaged and health reduced to 0", async () => {
  // 规则集：被击倒后 = “受到伤害后，若生命值为0”的缩写
  // 对照：伤害未把生命值扣减至 0 时，赌徒的耳环（敌方角色被击倒后生成 2 个万能元素）不发动
  {
    const c = setup(
      <State>
        <Character opp active def={Keqing} health={3} />
        <Character my active def={Keqing}>
          <Equipment def={GamblersEarrings} />
        </Character>
      </State>,
    );
    await c.me.skill(YunlaiSwordsmanship);
    c.expect($.opp.active).toHaveVariable({ health: 1 });
    expect(c.state.players[0].dice).toBeArrayOfSize(5);
  }
  // 断言：把生命值扣减至 0 的伤害事件的「受到伤害后」时机即「被击倒后」，赌徒的耳环发动，生成 2 个万能元素
  {
    const oppNext = ref();
    const c = setup(
      <State>
        <Character opp active def={Keqing} health={2} />
        <Character opp def={Kaeya} ref={oppNext} />
        <Character my active def={Keqing}>
          <Equipment def={GamblersEarrings} />
        </Character>
      </State>,
    );
    await c.me.skill(YunlaiSwordsmanship);
    await c.opp.chooseActive(oppNext);
    expect(c.state.players[0].dice).toBeArrayOfSize(7);
  }
});

test("immune to defeated: health is not 0 afterwards, so it is not 被击倒后", async () => {
  // 规则集：被击倒后 = “受到伤害后，若生命值为0”的缩写；装备牌/角色状态能力默认具有条件：若装备者未被击倒
  // 断言：雷之新生使角色免于被击倒并治疗到 4 点，该伤害的「受到伤害后」时机生命值不为 0，
  // 因此不是「被击倒后」：装备不被弃置、千岩牢固照常发动（我方 8+1 骰），敌方赌徒的耳环不发动（对方 8-3 骰）
  const myActive = ref();
  const artifact = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing}>
        <Equipment def={GamblersEarrings} />
      </Character>
      <Character my active def={Keqing} health={2} ref={myActive}>
        <Status def={ElectricRebirth} />
        <Equipment def={TenacityOfTheMillelith} ref={artifact} />
      </Character>
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  c.expect(myActive).toHaveVariable({ alive: 1, health: 4 });
  c.expect(artifact).toBeExist();
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
  expect(c.state.players[1].dice).toBeArrayOfSize(5);
});

test("increased max health is not removed after defeated", async () => {
  // 规则集：注：已增加的最大生命值不会移除
  // 断言：不灭月华使最大生命值 +1；装备者被击倒后武器被弃置，但增加后的最大生命值保留，复苏后亦然
  const barbara = ref();
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Keqing} />
      <Character my active def={Barbara} health={1} ref={barbara} />
      <Character my def={Kaeya} ref={myNext} />
      <Card my def={EverlastingMoonglow} />
      <Card my def={TeyvatFriedEgg} />
    </State>,
  );
  const findBarbara = () =>
    c.state.players[0].characters.find((ch) => ch.id === barbara.id)!;
  const increasedMaxHealth = findBarbara().variables.maxHealth + 1;
  await c.me.card(EverlastingMoonglow, barbara);
  c.expect(barbara).toHaveVariable({
    maxHealth: increasedMaxHealth,
    health: 2,
  });
  await c.me.end();
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(myNext);
  c.expect(barbara).toHaveVariable({
    alive: 0,
    health: 0,
    maxHealth: increasedMaxHealth,
  });
  expect(findBarbara().entities).toBeArrayOfSize(0);
  await c.opp.end();
  // 下一回合我方先手，用提瓦特煎蛋复苏
  await c.me.card(TeyvatFriedEgg, barbara);
  c.expect(barbara).toHaveVariable({
    alive: 1,
    health: 1,
    maxHealth: increasedMaxHealth,
  });
});
