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
  $,
  Card,
  Character,
  Equipment,
  ref,
  setup,
  State,
  Status,
  Support,
} from "#test";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import { WaterAndJustice } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  CrownOfWatatsumi,
  OceanhuedClam,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { RightfulReward } from "@gi-tcg/data/internal/cards/equipment/weapon/pole.gts";
import { TravelersHandySword } from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import {
  DistantStorm,
  SeiraiIsland,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Clorinde,
  HuntersVigil,
  NightVigil,
} from "@gi-tcg/data/internal/characters/electro/clorinde.gts";
import { Arlecchino } from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import { CryoCrystalCore } from "@gi-tcg/data/internal/characters/cryo/cryo_hypostasis.gts";
import {
  DoughFu,
  Xiangling,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { test } from "vitest";

test("Night Vigil terminates the heal at 'before healed': no later resolution, no 'after healed'", async () => {
  // 规则集：受到治疗前：克罗林德（夜巡）……治疗在此时机被终止后，不进行后续结算；夜巡会终止治疗结算（不会生成 受到治疗后 时机）
  // 断言：附属夜巡的克洛琳德吃蒙德土豆饼 → 生命不变、改为附属 2 层生命之契；清籁岛（任意角色受到治疗后）不触发，克洛琳德不附属悠远雷暴
  const clorinde = ref();
  const c = setup(
    <State>
      <Character my active def={Clorinde} health={5} ref={clorinde}>
        <Status def={NightVigil} />
      </Character>
      <Support my def={SeiraiIsland} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, clorinde);
  c.expect(clorinde).toHaveVariable({ health: 5 });
  c.expect($.my.typeStatus.def(BondOfLife)).toHaveVariable({ usage: 2 });
  c.expect($.my.typeStatus.def(DistantStorm)).toNotExist();
});

test("Arlecchino's passive terminates the heal at 'before healed': no 'when healed', no 'after healed'", async () => {
  // 规则集：受到治疗前：克罗林德，仆人；治疗在此时机被终止后，不进行后续结算
  // 断言：附属 3 层契的阿蕾奇诺（唯厄月可知晓）吃蒙德土豆饼 → 生命不变；「受到治疗时」的生命之契不被消耗（仍 3 层）；公义之理不累积、清籁岛不触发
  const arlecchino = ref();
  const reward = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active def={Arlecchino} health={5} ref={arlecchino}>
        <Equipment def={RightfulReward} ref={reward} />
        <Status def={BondOfLife} usage={3} ref={bond} />
      </Character>
      <Support my def={SeiraiIsland} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, arlecchino);
  c.expect(arlecchino).toHaveVariable({ health: 5 });
  c.expect(bond).toHaveVariable({ usage: 3 });
  c.expect(reward).toHaveVariable({ justice: 0 });
  c.expect($.my.typeStatus.def(DistantStorm)).toNotExist();
});

test("Bond of Life at 'when healed': consumes X = min(heal, layers) and reduces the heal by X", async () => {
  // 规则集：受到治疗时：消耗X层【生命之契】->治疗值减少X（X为min（治疗值，生命之契层数））
  // 断言：3 层契受 2 点治疗 → 治疗 0、剩 1 层；1 层契受 2 点治疗 → 治疗 1（生命 +1）、契移除
  const a = ref();
  const b = ref();
  const bondA = ref();
  const bondB = ref();
  const c = setup(
    <State>
      <Character my active health={5} ref={a}>
        <Status def={BondOfLife} usage={3} ref={bondA} />
      </Character>
      <Character my health={5} ref={b}>
        <Status def={BondOfLife} usage={1} ref={bondB} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  c.expect(a).toHaveVariable({ health: 5 });
  c.expect(bondA).toHaveVariable({ usage: 1 });
  await c.me.card(MondstadtHashBrown, b);
  c.expect(b).toHaveVariable({ health: 6 });
  c.expect(bondB).toNotExist();
});

test("Bond of Life consumes by the heal value before the lost-health cap", async () => {
  // 规则集：受到治疗时：【生命之契】 → 治疗值调整：至多为已损失体力值（生命之契先于损失上限结算）
  // 断言：9/10 且 3 层契的角色受 2 点治疗 → X=min(2,3)=2，消耗 2 层（剩 1）而非按已损失的 1 点只消耗 1 层；生命仍 9
  const a = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active health={9} ref={a}>
        <Status def={BondOfLife} usage={3} ref={bond} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  c.expect(a).toHaveVariable({ health: 9 });
  c.expect(bond).toHaveVariable({ usage: 1 });
});

test("Bond of Life does not reduce a distribution heal (Water and Justice)", async () => {
  // 规则集：受到治疗时：若来源不为免于击倒或分配生命值，消耗X层【生命之契】->治疗值减少X
  // 断言：[10,4,4] 平均为 6：b 的分配治疗 2 点不被 3 层契抵消（生命 4→6、契仍 3），随后的常规治疗 1 点被抵消（契 3→2）→ b 生命 6；d 生命 7
  const a = ref();
  const b = ref();
  const d = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active health={10} ref={a} />
      <Character my health={4} ref={b}>
        <Status def={BondOfLife} usage={3} ref={bond} />
      </Character>
      <Character my health={4} ref={d} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(a).toHaveVariable({ health: 7 });
  c.expect(b).toHaveVariable({ health: 6 });
  c.expect(bond).toHaveVariable({ usage: 2 });
  c.expect(d).toHaveVariable({ health: 7 });
});

test("Bond of Life does not reduce an immune-to-defeat heal", async () => {
  // 规则集：受到治疗时：若来源不为免于击倒或分配生命值，消耗X层【生命之契】->治疗值减少X
  // 断言：附属冰晶核心与 3 层契的角色被击倒 → 免于击倒并治疗到 1 点生命值，契不被消耗（仍 3 层）
  const target = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character opp active health={1} ref={target}>
        <Status def={CryoCrystalCore} />
        <Status def={BondOfLife} usage={3} ref={bond} />
      </Character>
      <Character my active def={Xiangling} />
    </State>,
  );
  await c.me.skill(DoughFu);
  c.expect(target).toHaveVariable({ health: 1, alive: 1 });
  c.expect(bond).toHaveVariable({ usage: 3 });
});

test("heal amount is capped at the lost health", async () => {
  // 规则集：治疗值调整：至多为已损失体力值；生命值变化，增加等量的治疗值
  // 断言：9/10 的角色受 2 点治疗 → 生命 10；海祇之冠记录的治疗量为 1 而非 2
  const a = ref();
  const crown = ref();
  const c = setup(
    <State>
      <Character my active health={9} ref={a}>
        <Equipment def={CrownOfWatatsumi} ref={crown} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, a);
  c.expect(a).toHaveVariable({ health: 10 });
  c.expect(crown).toHaveVariable({ healedPts: 1, bubble: 0 });
});

test("heal on a full-health character still generates 'after healed'", async () => {
  // 规则集：注：生命之契防止治疗、或未损失体力值治疗的场合，仍能生成【受到治疗后】时机
  // 断言：满血香菱装备海染砗磲（入场治疗 2 点）→ 生命仍 10；公义的酬报「公义之理」+1，清籁岛使其附属悠远雷暴
  const xiangling = ref();
  const reward = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} health={10} ref={xiangling}>
        <Equipment def={RightfulReward} ref={reward} />
      </Character>
      <Support my def={SeiraiIsland} />
      <Card my def={OceanhuedClam} />
    </State>,
  );
  await c.me.card(OceanhuedClam, xiangling);
  c.expect(xiangling).toHaveVariable({ health: 10 });
  c.expect(reward).toHaveVariable({ justice: 1 });
  c.expect($.my.typeStatus.def(DistantStorm)).toBeExist();
});

test("heal fully offset by Bond of Life still generates 'after healed'", async () => {
  // 规则集：生命之契防止治疗……仍能生成【受到治疗后】时机；生命之契降治疗减至0后仍会继续结算（仍会生成受到治疗后 时机）
  // 断言：2 层契的香菱（5/10）吃蒙德土豆饼 → 生命仍 5、契移除；公义之理 +1，附属悠远雷暴（对比夜巡：终止结算则不生成）
  const xiangling = ref();
  const reward = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} health={5} ref={xiangling}>
        <Equipment def={RightfulReward} ref={reward} />
        <Status def={BondOfLife} usage={2} />
      </Character>
      <Support my def={SeiraiIsland} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, xiangling);
  c.expect(xiangling).toHaveVariable({ health: 5 });
  c.expect($.my.typeStatus.def(BondOfLife)).toNotExist();
  c.expect(reward).toHaveVariable({ justice: 1 });
  c.expect($.my.typeStatus.def(DistantStorm)).toBeExist();
});

test("Oceanhued Clam records the final heal value (after Bond of Life and lost-health cap)", async () => {
  // 规则集：【海染砗磲】计算最终的治疗值
  // 断言：8/10 且 1 层契的角色装备海染砗磲：入场治疗 2 被契抵消 1 → 记录 1 点；再吃土豆饼治疗 2 但仅损失 1 → 记录 1 点，共 2 点、无泡沫（若按预期值记录会得到 4 点 → 1 泡沫余 1）
  const a = ref();
  const clam = ref();
  const c = setup(
    <State>
      <Character my active health={8} ref={a}>
        <Status def={BondOfLife} usage={1} />
      </Character>
      <Card my def={OceanhuedClam} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(OceanhuedClam, a);
  c.expect(a).toHaveVariable({ health: 9 });
  c.expect($.my.typeEquipment.def(OceanhuedClam)).toHaveVariable({
    healedPts: 1,
    bubble: 0,
  });
  await c.me.card(MondstadtHashBrown, a);
  c.expect(a).toHaveVariable({ health: 10 });
  c.expect($.my.typeEquipment.def(OceanhuedClam)).toHaveVariable({
    healedPts: 2,
    bubble: 0,
  });
});

test("Hunter's Vigil with 0 Bond of Life: heals 0 (generates 'after healed') and deals no damage even with a weapon", async () => {
  // 规则集：使用战技时，若生命之契为0层，也能治疗0点，生成【受到治疗后】的时机（但不能造成伤害，即使有武器）
  // 断言：无契的克洛琳德装备旅行剑使用狩夜之巡 → 对方生命仍 10；克洛琳德附属夜巡，且清籁岛使其附属悠远雷暴（治疗 0 点也生成受到治疗后）
  const target = ref();
  const clorinde = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target} />
      <Character my active def={Clorinde} health={10} ref={clorinde}>
        <Equipment def={TravelersHandySword} />
      </Character>
      <Support my def={SeiraiIsland} />
    </State>,
  );
  await c.me.skill(HuntersVigil);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.typeStatus.def(NightVigil)).toBeExist();
  c.expect($.def(DistantStorm).at($.id(clorinde.id))).toBeExist();
});
