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
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Status,
  Support,
} from "#test";
import { WitchsScorchingHat } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { TulaytullahsRemembrance } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import {
  MintyMeatRollsInEffect,
  NorthernSmokedChicken,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  ChinjuForest,
  SumeruCity,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 北地烟熏鸡（生效中）为 private 句柄，按定义 id 查询
const NORTHERN_SMOKED_CHICKEN_IN_EFFECT = 303304;

// 规则集：对于需要X个火元素骰，Y个无色骰的消耗：先减免元素骰，再减免无色骰
// 断言：魔女帽减掉火元素骰部分、烟熏鸡减掉无色部分，剩余 1 无色费用由草骰支付，火骰保留
test("dice deduction order: element part is deducted before void part", async () => {
  const diluc = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} ref={diluc}>
        <Equipment def={WitchsScorchingHat} />
      </Character>
      <Card my def={NorthernSmokedChicken} />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, diluc);
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toEqual([DiceType.Pyro]);
  c.expect($.my.typeEquipment.def(WitchsScorchingHat)).toHaveVariable({
    usagePerRound: 0,
  });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
});

// 规则集：先减免元素骰，再减免无色骰；【少花费元素骰】（如 须弥城）
// 断言：须弥城单独存在时减掉的是火元素骰部分，剩余 2 无色费用由两个草骰支付，火骰保留
test("dice deduction order: generic reducer (sumeru city) deducts the elemental die first", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} />
      <Support my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Dendro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toEqual([DiceType.Pyro]);
  c.expect($.my.support.def(SumeruCity)).toHaveVariable({ usagePerRound: 0 });
});

// 规则集：对于元素骰，按以下优先级依次发动：【少花费火元素骰】（焦灼的魔女帽）>【少花费元素骰】（须弥城）
// 断言：无色部分被烟熏鸡+薄荷卷占满后，火元素骰由魔女帽减免（优先级更高），须弥城无处减免、不消耗次数
test("dice deduction order: element part, pyro reducer (hat) acts before generic reducer (sumeru city)", async () => {
  const diluc = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} ref={diluc}>
        <Equipment def={WitchsScorchingHat} />
        <Status def={MintyMeatRollsInEffect} />
      </Character>
      <Support my def={SumeruCity} />
      <Card my def={NorthernSmokedChicken} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Dendro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, diluc);
  // 须弥城条件：骰子数(3) 不多于 手牌数(3)
  expect(c.state.players[0].hands).toBeArrayOfSize(3);
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  c.expect($.my.typeEquipment.def(WitchsScorchingHat)).toHaveVariable({
    usagePerRound: 0,
  });
  c.expect($.my.support.def(SumeruCity)).toHaveVariable({ usagePerRound: 1 });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
  c.expect($.my.typeStatus.def(MintyMeatRollsInEffect)).toHaveVariable({
    usage: 2,
  });
});

// 规则集：对于无色骰，按以下优先级依次发动：…【少花费火元素骰】（如 焦灼的魔女帽）
// 断言：非火角色（凯亚）装备魔女帽时，火元素骰减免可用于无色骰部分，1 冰 + 2 无色 变为 1 冰 + 1 无色
test("dice deduction order: pyro reducer (hat) can deduct a void die", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya}>
        <Equipment def={WitchsScorchingHat} />
      </Character>
      <DiceCount my dice={[DiceType.Cryo, DiceType.Dendro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toEqual([DiceType.Dendro]);
  c.expect($.my.typeEquipment.def(WitchsScorchingHat)).toHaveVariable({
    usagePerRound: 0,
  });
});

// 规则集：对于无色骰，按以下优先级依次发动：【少花费无色元素骰】（北地烟熏鸡）>【少花费火元素骰】（焦灼的魔女帽）
// 断言：凯亚（无火元素骰需求）的 2 无色由烟熏鸡+薄荷卷减免，魔女帽轮不到、不消耗次数，剩余 1 冰费用
test("dice deduction order: void part, void reducer (chicken) acts before pyro reducer (hat)", async () => {
  const kaeya = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} ref={kaeya}>
        <Equipment def={WitchsScorchingHat} />
        <Status def={MintyMeatRollsInEffect} />
      </Character>
      <Card my def={NorthernSmokedChicken} />
      <DiceCount my dice={[DiceType.Cryo, DiceType.Pyro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, kaeya);
  await c.me.skill(CeremonialBladework);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Pyro,
    DiceType.Dendro,
  ]);
  c.expect($.my.typeEquipment.def(WitchsScorchingHat)).toHaveVariable({
    usagePerRound: 1,
  });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
  c.expect($.my.typeStatus.def(MintyMeatRollsInEffect)).toHaveVariable({
    usage: 2,
  });
});

// 规则集：对于无色骰，按以下优先级依次发动：…【少花费火元素骰】（焦灼的魔女帽）>【少花费元素骰】（须弥城）
// 断言：凯亚 1 冰 + 2 无色：冰由须弥城①减免；无色由烟熏鸡、魔女帽减免；须弥城②无处减免、不消耗次数
test("dice deduction order: void part, pyro reducer (hat) acts before generic reducer (sumeru city)", async () => {
  const kaeya = ref();
  const sumeru1 = ref();
  const sumeru2 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} ref={kaeya}>
        <Equipment def={WitchsScorchingHat} />
      </Character>
      <Support my def={SumeruCity} ref={sumeru1} />
      <Support my def={SumeruCity} ref={sumeru2} />
      <Card my def={NorthernSmokedChicken} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <DiceCount my dice={[DiceType.Cryo, DiceType.Dendro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, kaeya);
  expect(c.state.players[0].hands).toBeArrayOfSize(3);
  await c.me.skill(CeremonialBladework);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  c.expect($.my.typeEquipment.def(WitchsScorchingHat)).toHaveVariable({
    usagePerRound: 0,
  });
  c.expect(sumeru1).toHaveVariable({ usagePerRound: 0 });
  c.expect(sumeru2).toHaveVariable({ usagePerRound: 1 });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
});

// 规则集：对于同一优先级，按【同时机】顺序发动（同区域：先入场>后入场）
// 断言：两个须弥城同为【少花费元素骰】，火元素骰只需减免 1 个：先入场的须弥城①发动，须弥城②不消耗次数
test("dice deduction order: same priority, earlier-entered support acts first", async () => {
  const diluc = ref();
  const sumeru1 = ref();
  const sumeru2 = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} ref={diluc}>
        <Status def={MintyMeatRollsInEffect} />
      </Character>
      <Support my def={SumeruCity} ref={sumeru1} />
      <Support my def={SumeruCity} ref={sumeru2} />
      <Card my def={NorthernSmokedChicken} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <Card my def={SumeruCity} />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Dendro, DiceType.Dendro]} />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, diluc);
  expect(c.state.players[0].hands).toBeArrayOfSize(3);
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  c.expect(sumeru1).toHaveVariable({ usagePerRound: 0 });
  c.expect(sumeru2).toHaveVariable({ usagePerRound: 1 });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
  c.expect($.my.typeStatus.def(MintyMeatRollsInEffect)).toHaveVariable({
    usage: 2,
  });
});

// 规则集：对于同一优先级，按【同时机】顺序发动（同玩家：出战角色区>…>支援区）
// 断言：重击的 2 无色由出战角色的两个角色状态（烟熏鸡、薄荷卷）减免，支援区的镇守之森轮不到、不消耗次数
test("dice deduction order: same priority, active character zone acts before support zone", async () => {
  const diluc = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} ref={diluc}>
        <Status def={MintyMeatRollsInEffect} />
      </Character>
      <Support my def={ChinjuForest} />
      <Card my def={NorthernSmokedChicken} />
      <DiceCount
        my
        dice={[
          DiceType.Pyro,
          DiceType.Dendro,
          DiceType.Dendro,
          DiceType.Dendro,
        ]}
      />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, diluc);
  // 骰子数为偶数，普通攻击视为重击
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  expect(c.state.players[0].dice).toEqual([
    DiceType.Dendro,
    DiceType.Dendro,
    DiceType.Dendro,
  ]);
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 4 });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toNotExist();
  c.expect($.my.typeStatus.def(MintyMeatRollsInEffect)).toHaveVariable({
    usage: 2,
  });
});

// 规则集：对于同一优先级，按【同时机】顺序发动（同区域：先入场>后入场；角色区含装备与角色状态）
// 断言：重击的 2 无色由先入场的装备 图莱杜拉的回忆 与 薄荷卷 减免，后附着的烟熏鸡轮不到、保持存在
test("dice deduction order: same priority, earlier-entered entity in character zone acts first", async () => {
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Sucrose} ref={sucrose}>
        <Equipment def={TulaytullahsRemembrance} />
        <Status def={MintyMeatRollsInEffect} />
      </Character>
      <Card my def={NorthernSmokedChicken} />
      <DiceCount
        my
        dice={[
          DiceType.Anemo,
          DiceType.Dendro,
          DiceType.Dendro,
          DiceType.Dendro,
        ]}
      />
    </State>,
  );
  await c.me.card(NorthernSmokedChicken, sucrose);
  // 骰子数为偶数，普通攻击视为重击（图莱杜拉的回忆仅在重击时减免）
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.players[0].dice).toEqual([
    DiceType.Dendro,
    DiceType.Dendro,
    DiceType.Dendro,
  ]);
  c.expect($.my.typeEquipment.def(TulaytullahsRemembrance)).toHaveVariable({
    usagePerRound: 1,
  });
  c.expect($.my.typeStatus.def(MintyMeatRollsInEffect)).toHaveVariable({
    usage: 2,
  });
  c.expect($.my.typeStatus.def(NORTHERN_SMOKED_CHICKEN_IN_EFFECT)).toBeExist();
});
