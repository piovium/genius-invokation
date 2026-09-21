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
  State,
  Status,
  Card,
  Equipment,
  CombatStatus,
  Support,
  $,
} from "#test";
import { Aura } from "@gi-tcg/core/data";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import { VourukashasGlow } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { BloomBlessingOvergrow } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import {
  FrostOperative,
  OnslaughtStance,
} from "@gi-tcg/data/internal/characters/cryo/frost_operative.gts";
import {
  AllReprisalsAndArrearsMineToBear,
  Arlecchino,
  BlooddebtDirective,
  InvitationToABeheading,
} from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import {
  OdeOfResurrection,
  WaterAndJustice,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { test } from "vitest";

test("bond of life decrease the heal", async () => {
  const active = ref();
  const c = setup(
    <State>
      <Character my health={5} maxHealth={6} ref={active}>
        <Status def={BondOfLife} usage={2} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, active);
  c.expect($.my.active).toHaveVariable({ health: 5 });
});

// https://github.com/piovium/genius-invokation/issues/544#issuecomment-5652483208
test("bond of life & FrostOperative", async () => {
  const active = ref();
  const bond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={FrostOperative}>
        <Status def={OnslaughtStance} />
      </Character>
      <Character my active ref={active} health={10}>
        {/* 花海先附属，生命之契后附属，以此顺序响应结束阶段 */}
        <Equipment def={VourukashasGlow} />
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
    </State>,
  );
  await c.opp.end();
  await c.me.end();

  // 花海响应时尚未受伤，不应治疗或消耗生命之契
  c.expect(active).toHaveVariable({ health: 9 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});

// https://github.com/piovium/genius-invokation/issues/544#issuecomment-5653003291
test("bond of life & Arlecchino", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Hydro}>
        <Status def={BondOfLife} usage={1} />
      </Character>
      <CombatStatus opp def={BlooddebtDirective} usage={2} />
      <Support my def={BloomBlessingOvergrow} />
      <Character my active def={Arlecchino}>
        <Status def={BondOfLife} usage={1} />
      </Character>
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  // 普攻 2 + 生命之契增伤 1 + 蒸发 2； 蔓生水伤 1
  c.expect(target).toHaveVariable({ health: 4 });
  c.expect($.opp.combatStatus.def(BlooddebtDirective)).toNotExist();
  // 伤害后：
  // +-- 蔓生：1水伤
  // |   伤害后：
  // |    \-- 血偿：契数 1 → 3
  // +-- 契：契数 3 → 0
  // \-- 血偿：契数 0 → 2
  c.expect($.typeStatus.def(BondOfLife).at($.opp.active)).toHaveVariable({ usage: 2 });
});

// 规则集：受到治疗时…消耗X层【生命之契】->治疗值减少X（X为min（治疗值，生命之契层数））
test("bond of life consumes min(heal, layers)", async () => {
  const one = ref();
  const three = ref();
  const bondOne = ref();
  const bondThree = ref();
  const c = setup(
    <State>
      <Character my active health={5} ref={one}>
        <Status def={BondOfLife} usage={1} ref={bondOne} />
      </Character>
      <Character my health={5} ref={three}>
        <Status def={BondOfLife} usage={3} ref={bondThree} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  // 治疗 2、契 1 层：X=1，治疗 1 点，契耗尽移除
  await c.me.card(MondstadtHashBrown, one);
  c.expect(one).toHaveVariable({ health: 6 });
  c.expect(bondOne).toNotExist();
  // 治疗 2、契 3 层：X=2，治疗 0 点，契剩 1 层
  await c.me.card(MondstadtHashBrown, three);
  c.expect(three).toHaveVariable({ health: 5 });
  c.expect(bondThree).toHaveVariable({ usage: 1 });
});

// 规则集（治疗结算）：受到治疗时【生命之契】→ 治疗值调整：至多为已损失体力值
// 生命之契先于「至多为已损失体力值」结算，X 按未调整的治疗值计算
test("bond of life is consumed by the unadjusted heal value", async () => {
  const active = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active health={5} maxHealth={6} ref={active}>
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, active);
  // 治疗值 2（已损失仅 1）→ X=min(2,2)=2，契耗尽
  c.expect(active).toHaveVariable({ health: 5 });
  c.expect(bond).toNotExist();
});

// 规则集：受到治疗时：若来源不为免于击倒或分配生命值，消耗X层【生命之契】
test("bond of life ignores immune-defeated heal", async () => {
  const active = ref();
  const bond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active health={1} ref={active}>
        <Status def={OdeOfResurrection} />
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
    </State>,
  );
  await c.opp.skill(CeremonialBladework);
  // 还魂诗免于击倒并治疗到 1 点：不消耗生命之契
  c.expect(active).toHaveVariable({ health: 1, alive: 1 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});

// 规则集：受到治疗时：若来源不为免于击倒或分配生命值，消耗X层【生命之契】
test("bond of life ignores health distribution heal", async () => {
  const third = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active health={10} />
      <Character my health={10} />
      <Character my health={1} ref={third}>
        <Status def={BondOfLife} usage={3} ref={bond} />
      </Character>
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  // 分配生命值 1 → 7 不消耗契；随后的常规治疗 1 被契抵消（3 → 2）
  c.expect(third).toHaveVariable({ health: 7 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});

// 规则集：注：移除生命之契是生命之契的受到伤害后的效果
// 例如：仆人对装备天赋1层【生命之契】的仆人使用普通攻击的场合，造成3-1=2点伤害
test("bond of life removal by Invitation to a Beheading is an after-damage effect", async () => {
  const target = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character opp active def={Arlecchino} health={10} ref={target}>
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
        <Status def={BondOfLife} usage={1} ref={bond} />
      </Character>
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);
  // 2+1 点伤害；受到伤害时契仍在，天赋消耗 1 层抵消 1 点 → 2 点
  c.expect(target).toHaveVariable({ health: 8 });
  c.expect(bond).toNotExist();
});

// 规则集：斩首之邀 造成2+X点物理伤害（X为目标【生命之契】层数且最大为3）
// 受到【斩首之邀】的伤害后：移除3层生命之契
test("Invitation to a Beheading caps bonus at 3 and removes 3 layers", async () => {
  const target = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target}>
        <Status def={BondOfLife} usage={5} ref={bond} />
      </Character>
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);
  // 5 层 → X=3，2+3=5 点伤害；伤害后移除 3 层，剩 2 层
  c.expect(target).toHaveVariable({ health: 5 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});
