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

import { ref, setup, Character, State, Status, Equipment, Card, Summon, DeclaredEnd, $ } from "#test";
import { Collei, CuileinAnbar, FloralBrush, SupplicantsBowmanship } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import {
  Emilie,
  LingeringFragranceInEffect,
  LumidouceCaseLevel1,
  LumidouceCaseLevel2,
  ShadowhuntingSpearCustom,
} from "@gi-tcg/data/internal/characters/dendro/emilie.gts";
import { BurningFlame } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("emillie: lumidouce upgrade at end phase", async () => {
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} aura={Aura.Pyro} />
      <Character my active def={Emilie} />
      <Character my def={Collei} />
      <Summon my def={CuileinAnbar} />
      <Summon my def={LumidouceCaseLevel1} />
    </State>,
  );
  await c.me.end();
  // 柯里安巴 -2，燃烧 -1
  // 灯升级，二阶 -2
  c.expect(target).toHaveVariable({ health: 5 });
});

test("emilie: lingering fragrance attaches when burning flame enters", async () => {
  // 规则集：余薰 - 我方燃烧烈焰入场后，角色附属【余薰（生效中）】。每回合2次。
  const emilie = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Emilie} ref={emilie} />
      <Summon my def={CuileinAnbar} />
    </State>,
  );
  // 结束阶段柯里安巴造成草伤引发燃烧反应，燃烧烈焰入场
  // （结束阶段没有角色使用技能，余薰（生效中）不会立刻被消耗）
  await c.me.end();
  c.expect($.my.summon.def(BurningFlame)).toBeExist();
  // 艾梅莉埃附属余薰（生效中）
  c.expect(
    $.my.typeStatus.def(LingeringFragranceInEffect).at($.id(emilie.id)),
  ).toBeExist();
});

test("emilie: lingering fragrance limited to twice per round", async () => {
  // 规则集：余薰 - 我方燃烧烈焰入场后，角色附属【余薰（生效中）】。每回合2次。
  // 与上一个用例同场景，仅本回合次数已耗尽（usagePerRound1 = 0）：燃烧烈焰照常入场，但不再附属
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Emilie} v={{ usagePerRound1: 0 }} />
      <Summon my def={CuileinAnbar} />
    </State>,
  );
  await c.me.end();
  c.expect($.my.summon.def(BurningFlame)).toBeExist();
  c.expect($.my.typeStatus.def(LingeringFragranceInEffect)).toNotExist();
});

test("emilie: lingering fragrance in effect triggers burning flame on opponent's skill", async () => {
  // 规则集：余薰（生效中）- 双方使用技能后：触发我方【燃烧烈焰】的结束阶段效果。可用次数：1
  const oppActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Collei} ref={oppActive} />
      <Character my active def={Emilie}>
        <Status def={LingeringFragranceInEffect} />
      </Character>
      <Summon my def={BurningFlame} />
    </State>,
  );
  // 对方使用技能后同样触发
  await c.opp.skill(SupplicantsBowmanship);
  // 燃烧烈焰结束阶段效果：对对方出战角色造成 1 点火伤（柯莱最大生命值 11）
  c.expect(oppActive).toHaveVariable({ health: 10 });
  c.expect($.my.summon.def(BurningFlame)).toNotExist();
  c.expect($.my.typeStatus.def(LingeringFragranceInEffect)).toNotExist();
});

test("emilie: lingering fragrance in effect is consumed even without burning flame", async () => {
  // 规则集：注：即使使用技能后没有燃烧烈焰，也会消耗【余薰（生效中）】
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Emilie}>
        <Status def={LingeringFragranceInEffect} />
      </Character>
    </State>,
  );
  // 场上没有燃烧烈焰
  c.expect($.my.summon.def(BurningFlame)).toNotExist();
  await c.me.skill(ShadowhuntingSpearCustom);
  // 余薰（生效中）仍被消耗
  c.expect($.my.typeStatus.def(LingeringFragranceInEffect)).toNotExist();
});

test("emilie: lingering fragrance in effect does not trigger the opponent's burning flame", async () => {
  // 规则集：余薰（生效中）- 双方使用技能后：触发**我方**【燃烧烈焰】的结束阶段效果。可用次数：1
  const emilie = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Emilie} ref={emilie}>
        <Status def={LingeringFragranceInEffect} />
      </Character>
      <Summon opp def={BurningFlame} />
    </State>,
  );
  await c.me.skill(ShadowhuntingSpearCustom);
  // 燃烧烈焰属于对方，不被触发（若被触发则对我方出战角色造成 1 点火伤）
  c.expect(emilie).toHaveVariable({ health: 10 });
  c.expect($.opp.summon.def(BurningFlame)).toBeExist();
  c.expect($.my.typeStatus.def(LingeringFragranceInEffect)).toNotExist();
});

test("emilie: lumidouce case transforms into level 2 after our burning damage", async () => {
  // 规则集：柔灯之匣·一阶 ②我方造成燃烧反应伤害后：此牌变形为柔灯之匣·二阶
  const c = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Collei} />
      <Summon my def={LumidouceCaseLevel1} />
    </State>,
  );
  await c.me.skill(FloralBrush);
  c.expect($.my.summon.def(LumidouceCaseLevel1)).toNotExist();
  c.expect($.my.summon.def(LumidouceCaseLevel2)).toBeExist();
});

test("emilie: lumidouce case not transformed by opponent's burning damage", async () => {
  // 规则集：柔灯之匣·一阶 ②**我方**造成燃烧反应伤害后：此牌变形为柔灯之匣·二阶
  // 燃烧反应伤害由对方造成时不变形
  const c = setup(
    <State currentTurn="opp">
      <Character my active aura={Aura.Pyro} />
      <Character opp active def={Collei} />
      <Summon my def={LumidouceCaseLevel1} />
    </State>,
  );
  await c.opp.skill(FloralBrush);
  c.expect($.my.summon.def(LumidouceCaseLevel1)).toBeExist();
  c.expect($.my.summon.def(LumidouceCaseLevel2)).toNotExist();
});

test.fails("emilie: lumidouce case transformed during end phase cannot act", async () => {
  // 规则集：注：变形视为新实体重新入场，结束阶段变形的场合无法发动。
  // 当前引擎：结束阶段中途升级为二阶后，柔灯之匣仍在本次结束阶段发动并造成 2 点草伤
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} aura={Aura.Pyro} />
      <Character my active def={Emilie} />
      <Summon my def={CuileinAnbar} />
      <Summon my def={LumidouceCaseLevel1} />
    </State>,
  );
  await c.me.end();
  // 柯里安巴 2 点草伤 + 燃烧反应 1 点 = 3 点；柔灯之匣于结束阶段变形，不应再发动
  c.expect(target).toHaveVariable({ health: 7 });
});
