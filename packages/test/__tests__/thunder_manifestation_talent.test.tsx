// Copyright (C) 2024-2025 Guyutongxue
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
  CombatStatus,
  DeclaredEnd,
  State,
  Status,
  Summon,
  Card,
  Equipment,
  $,
} from "#test";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import { test } from "vitest";
import {
  ThunderManifestation,
  GrievingEcho,
  LightningRod,
  LightningStrikeProbe,
  StrifefulLightning,
  ThunderingShacklesSummon,
  ThunderousWingslash,
} from "@gi-tcg/data/internal/characters/electro/thunder_manifestation.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  AncientRiteTheThunderingSands,
  RoyalReedArchery,
  Sethos,
} from "@gi-tcg/data/internal/characters/electro/sethos.gts";

test("thunder manifestation: talent works on 'disposed' status", async () => {
  const target = ref();
  const talent = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp health={10} ref={target}>
        <Status def={LightningRod} />
      </Character>
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} ref={talent} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  c.expect($.my.hand).toBeCount(0);
  await c.me.skill(StrifefulLightning);
  // 雷鸣探知弃置，伤害 +1
  c.expect($.typeStatus.def(LightningRod)).toNotExist();
  c.expect(target).toHaveVariable({ health: 6 });
  // 我方抽牌
  c.expect($.my.hand).toBeCount(1);
  // 我方天赋每回合使用次数归零
  c.expect(talent).toHaveVariable({ usagePerRound: 0 });
});

test("lightning strike probe: attaches lightning rod to the skill caster", async () => {
  // 规则集：雷霆探针 我方角色使用技能后：该角色附属【雷鸣探知】；注：是使用技能角色附属而非出战角色
  const sethos = ref();
  const next = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Sethos} ref={sethos} />
      <Character opp ref={next} />
      <CombatStatus opp def={LightningStrikeProbe} />
      <Character my active def={ThunderManifestation} />
    </State>,
  );
  // 古仪·鸣砂掣雷会在技能内把出战角色切到下一个
  await c.opp.skill(AncientRiteTheThunderingSands);
  c.expect($.opp.active).toBe(next);
  // 雷鸣探知附属给使用技能的赛索斯，而非结算后的出战角色
  c.expect($.opp.character.has($.typeStatus.def(LightningRod))).toBe(sethos);
});

test("lightning strike probe: attaches lightning rod once per round", async () => {
  // 规则集：雷霆探针 我方角色使用技能后：该角色附属【雷鸣探知】（每回合1次）
  const sethos = ref();
  const kaeya = ref();
  const probe = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Sethos} ref={sethos} />
      <Character opp def={Kaeya} ref={kaeya} />
      <CombatStatus opp def={LightningStrikeProbe} ref={probe} />
      <Character my active def={ThunderManifestation} />
      <DeclaredEnd my />
    </State>,
  );
  await c.opp.skill(RoyalReedArchery);
  c.expect($.opp.character.has($.typeStatus.def(LightningRod))).toBe(sethos);
  c.expect(probe).toHaveVariable({ usagePerRound: 0 });
  await c.opp.switch(kaeya);
  await c.opp.skill(CeremonialBladework);
  // 本回合次数已用尽，雷鸣探知不会再附属给凯亚
  c.expect($.opp.character.has($.typeStatus.def(LightningRod))).toBe(sethos);
});

test("grieving echo: draws a card when a lightning rod holder is damaged", async () => {
  // 规则集：悲号回唱①对方角色受到伤害后：若其附属【雷鸣探知】，我方抓一张牌
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target}>
        <Status def={LightningRod} />
      </Character>
      <Character my active def={Kaeya} />
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  // 伤害来源不是雷音权现及其召唤物，雷鸣探知不会被移除
  await c.me.skill(CeremonialBladework);
  c.expect(target).toHaveVariable({ health: 8 });
  c.expect($.opp.typeStatus.def(LightningRod)).toBeExist();
  c.expect($.my.hand).toBeCount(1);
});

test("grieving echo: draws at most once per round in total", async () => {
  // 规则集：悲号回唱 ①和②的效果每回合合计最多发动一次
  const tm = ref();
  const c = setup(
    <State>
      <Character opp active health={10}>
        <Status def={LightningRod} />
      </Character>
      <Character my active def={Kaeya} />
      <Character my def={ThunderManifestation} ref={tm}>
        <Equipment def={GrievingEcho} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
      <Card my pile def={MondstadtHashBrown} />
      <DeclaredEnd opp />
    </State>,
  );
  // ①：凯亚造成伤害，抓 1 张
  await c.me.skill(CeremonialBladework);
  c.expect($.my.hand).toBeCount(1);
  await c.me.switch(tm);
  // ②：雷音权现造成伤害移除雷鸣探知，本回合合计次数已用尽，不再抓牌
  await c.me.skill(ThunderousWingslash);
  c.expect($.opp.typeStatus.def(LightningRod)).toNotExist();
  c.expect($.my.hand).toBeCount(1);
});

test("grieving echo: no draw when the lightning rod is removed by re-creation", async () => {
  // 规则集：悲号回唱②对方移除【雷鸣探知】时：若移除原因不为重复生成，我方抓一张牌
  const sethos = ref();
  const other = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Sethos} ref={sethos} />
      <Character opp ref={other}>
        <Status def={LightningRod} />
      </Character>
      <CombatStatus opp def={LightningStrikeProbe} />
      <Character my active def={Kaeya} />
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  // 探针把雷鸣探知附属给赛索斯，原角色上的一份因「重复生成」被移除
  await c.opp.skill(RoyalReedArchery);
  c.expect($.opp.character.has($.typeStatus.def(LightningRod))).toBe(sethos);
  c.expect($.my.hand).toBeCount(0);
});

test("grieving echo: the summon's damage removes the rod and triggers a draw", async () => {
  // 规则集：注：雷音权现及其召唤物造成伤害会移除状态触发②
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target}>
        <Status def={LightningRod} />
      </Character>
      <Character my active def={Kaeya} />
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} />
      </Character>
      <Summon my def={ThunderingShacklesSummon} usage={1} />
      <Card my pile def={MondstadtHashBrown} />
      <Card my pile def={MondstadtHashBrown} />
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  // 召唤物轰雷禁锢造成 3+1 点伤害并移除雷鸣探知
  c.expect(target).toHaveVariable({ health: 6 });
  c.expect($.opp.typeStatus.def(LightningRod)).toNotExist();
  // ②发动抓 1 张，加上结束阶段固定抓的 2 张共 3 张
  c.expect($.my.hand).toBeCount(3);
});
