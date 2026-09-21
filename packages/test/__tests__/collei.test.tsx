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

import { ref, setup, State, Character, Card, Equipment, DeclaredEnd, DiceCount, $ } from "#test";
import { Collei, FloralSidewinder, FloralBrush, Sprout, SproutCreated } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { Barbara, WhisperOfWater } from "@gi-tcg/data/internal/characters/hydro/barbara.gts";
import { Kaeya, CeremonialBladework } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("collei: talent status won't target on defeated characters", async () => {
  const chosenNext = ref();
  const collei = ref();
  const c = setup(
    <State>
      <Character opp health={1} aura={Aura.Hydro} />
      <Character opp ref={chosenNext} health={10} />
      <Character my def={Collei} ref={collei} />
      <Card my def={FloralSidewinder} />
    </State>
  );
  await c.me.card(FloralSidewinder, collei);
  await c.opp.chooseActive(chosenNext);
  c.expect(chosenNext).toHaveVariable({ health: 9, aura: Aura.Dendro });
});

test("floral brush with talent: creates sprout & sprout created, sprout deals 1 dendro after dendro reaction", async () => {
  // 规则集：若角色装备天赋且我方不存在【新叶（已创建）】->生成【新叶】和【新叶（已创建）】；新叶：我方角色使用技能引发草元素相关反应后：造成1点草元素伤害
  // 断言：3 草 + 绽放 1 = 4，新叶再造成 1 草并附着草；【新叶（已创建）】存在
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Hydro} ref={target} />
      <Character my active def={Collei}>
        <Equipment def={FloralSidewinder} />
      </Character>
    </State>,
  );
  await c.me.skill(FloralBrush);
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(SproutCreated)).toBeExist();
});

test.fails("sprout: usage 1, disposed after triggering once", async () => {
  // 规则集：新叶 可用次数：1；当前引擎：新叶为「每回合 1 次」（usage perRound），触发后不弃置，直到回合结束才因持续回合耗尽而弃置
  // 断言：新叶触发一次后即被弃置
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Hydro} />
      <Character my active def={Collei}>
        <Equipment def={FloralSidewinder} />
      </Character>
    </State>,
  );
  await c.me.skill(FloralBrush);
  c.expect($.my.combatStatus.def(Sprout)).toNotExist();
});

test("sprout: once per round, second floral brush in the same round does not regenerate sprout", async () => {
  // 规则集：注：每回合限一次
  // 断言：同回合第二次拂花偈叶不再生成新叶，之后的草反应不再多 1 点伤害
  const target = ref();
  const barbara = ref();
  const c = setup(
    <State>
      <Character opp active health={20} aura={Aura.Hydro} ref={target} />
      <DeclaredEnd opp />
      <Character my active def={Collei}>
        <Equipment def={FloralSidewinder} />
      </Character>
      <Character my def={Barbara} ref={barbara} />
      <DiceCount my count={16} />
    </State>,
  );
  // 3 草 + 绽放 1 + 新叶 1
  await c.me.skill(FloralBrush);
  c.expect(target).toHaveVariable({ health: 15, aura: Aura.Dendro });
  // 草附着上 3 草，无反应
  await c.me.skill(FloralBrush);
  c.expect(target).toHaveVariable({ health: 12 });
  await c.me.switch(barbara);
  // 1 水 + 绽放 1；若新叶被刷新则会再多 1
  await c.me.skill(WhisperOfWater);
  c.expect(target).toHaveVariable({ health: 10 });
});

test("sprout: once-per-round limit is not refreshed by reviving collei and re-equipping talent", async () => {
  // 规则集：注：每回合限一次无法通过复苏使用天赋刷新
  // 断言：柯莱被击倒 → 复苏 → 重新装备天赋使用拂花偈叶后，不再生成新叶
  const target = ref();
  const collei = ref();
  const barbara = ref();
  const c = setup(
    <State>
      <Character opp active def={Kaeya} health={30} aura={Aura.Hydro} ref={target} />
      <Character my active def={Collei} health={2} ref={collei} />
      <Character my def={Barbara} ref={barbara} />
      <Card my def={FloralSidewinder} />
      <Card my def={FloralSidewinder} />
      <Card my def={TeyvatFriedEgg} />
      <DiceCount my count={16} />
    </State>,
  );
  // 3 草 + 绽放 1 + 新叶 1
  await c.me.card(FloralSidewinder, collei);
  c.expect(target).toHaveVariable({ health: 25, aura: Aura.Dendro });
  // 柯莱被击倒
  await c.opp.skill(CeremonialBladework);
  await c.me.chooseActive(barbara);
  // 复苏柯莱并切回
  await c.me.card(TeyvatFriedEgg, collei);
  c.expect(collei).toHaveVariable({ alive: 1 });
  await c.me.switch(collei);
  await c.opp.end();
  // 再次装备天赋并使用拂花偈叶：3 草无反应
  await c.me.card(FloralSidewinder, collei);
  c.expect(target).toHaveVariable({ health: 22 });
  c.expect($.my.combatStatus.def(SproutCreated)).toBeExist();
  await c.me.switch(barbara);
  // 1 水 + 绽放 1；若新叶被刷新则会再多 1
  await c.me.skill(WhisperOfWater);
  c.expect(target).toHaveVariable({ health: 20 });
});

test("sprout: lasts one round, a new sprout can be generated in the next round", async () => {
  // 规则集：新叶 持续回合：1；注：每回合限一次
  // 断言：未触发的新叶与【新叶（已创建）】在回合结束时弃置；下一回合拂花偈叶可再次生成新叶并正常触发
  const target = ref();
  const barbara = ref();
  const c = setup(
    <State>
      <Character opp active def={Kaeya} health={30} ref={target} />
      <DeclaredEnd opp />
      <Character my active def={Collei}>
        <Equipment def={FloralSidewinder} />
      </Character>
      <Character my def={Barbara} ref={barbara} />
    </State>,
  );
  // 3 草，无反应，新叶未触发
  await c.me.skill(FloralBrush);
  c.expect(target).toHaveVariable({ health: 27, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(Sprout)).toBeExist();
  await c.me.end();
  // 第 2 回合，对方先手
  await c.opp.end();
  c.expect($.my.combatStatus.def(Sprout)).toNotExist();
  c.expect($.my.combatStatus.def(SproutCreated)).toNotExist();
  // 草附着上 3 草，无反应；重新生成新叶
  await c.me.skill(FloralBrush);
  c.expect(target).toHaveVariable({ health: 24 });
  c.expect($.my.combatStatus.def(Sprout)).toBeExist();
  await c.me.switch(barbara);
  // 1 水 + 绽放 1 + 新叶 1
  await c.me.skill(WhisperOfWater);
  c.expect(target).toHaveVariable({ health: 21 });
});
