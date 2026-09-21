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
} from "#test";
import { Aura } from "@gi-tcg/typings";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import {
  AllReprisalsAndArrearsMineToBear,
  Arlecchino,
  BalemoonRising,
  InvitationToABeheading,
} from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import { test } from "vitest";

test("arlecchino: Invitation to a Beheading deals 2+X physical damage", async () => {
  // 规则集：斩首之邀 造成2+X点物理伤害（X为目标【生命之契】层数且最大为3）
  // 目标 2 层生命之契 => 2+2=4 点物理伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Cryo}>
        <Status def={BondOfLife} usage={2} />
      </Character>
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  // 物理伤害不触发元素反应，冰附着保留
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.Cryo });
});

test("arlecchino: X of Invitation to a Beheading is capped at 3", async () => {
  // 规则集：X为目标【生命之契】层数且最大为3
  // 目标 5 层生命之契 => X 取 3 => 2+3=5 点物理伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10}>
        <Status def={BondOfLife} usage={5} />
      </Character>
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  c.expect(target).toHaveVariable({ health: 5 });
});

test("arlecchino: physical damage becomes pyro while she has Bond of Life", async () => {
  // 规则集：唯厄月可知晓 ②造成物理伤害时：若附属【生命之契】->改为火元素伤害
  // 自身带 1 层生命之契，普攻（目标无生命之契 => 2 点物理）转为火元素伤害，对冰附着目标触发融化 +2
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Cryo} />
      <Character my active def={Arlecchino}>
        <Status def={BondOfLife} usage={1} />
      </Character>
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  // 2 火 + 融化 2 = 4；融化清除冰附着
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.None });
});

test("arlecchino: physical damage stays physical without Bond of Life", async () => {
  // 规则集：②造成物理伤害时：若附属【生命之契】->改为火元素伤害
  // 未附属生命之契 => 仍为物理伤害，不触发融化、不清除冰附着
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Cryo} />
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  c.expect(target).toHaveVariable({ health: 8, aura: Aura.Cryo });
});

test("arlecchino: talent + Bond of Life reduces incoming damage by 1 and removes 1 stack", async () => {
  // 规则集：③受到伤害时：若装备天赋且附属【生命之契】->移除1层【生命之契】，伤害值-1
  const arle = ref();
  const bond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Arlecchino} ref={arle} health={10}>
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
    </State>,
  );
  await c.opp.skill(TemperedSword);

  // 迪卢克普攻 2 点物理 - 1 = 1 点
  c.expect(arle).toHaveVariable({ health: 9 });
  c.expect(bond).toHaveVariable({ usage: 1 });
});

test("arlecchino: damage is not reduced without the talent equipped", async () => {
  // 规则集：③受到伤害时：若装备天赋且附属【生命之契】->移除1层【生命之契】，伤害值-1
  // 未装备天赋 => 不减伤、不移除生命之契
  const arle = ref();
  const bond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Arlecchino} ref={arle} health={10}>
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
    </State>,
  );
  await c.opp.skill(TemperedSword);

  c.expect(arle).toHaveVariable({ health: 8 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});

test("arlecchino: talent without Bond of Life does not reduce damage", async () => {
  // 规则集：③受到伤害时：若装备天赋且附属【生命之契】->移除1层【生命之契】，伤害值-1
  // 装备天赋但未附属生命之契 => 条件不同时满足，不减伤
  const arle = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Arlecchino} ref={arle} health={10}>
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
      </Character>
    </State>,
  );
  await c.opp.skill(TemperedSword);

  // 迪卢克普攻 2 点物理，未减伤
  c.expect(arle).toHaveVariable({ health: 8 });
});

test("arlecchino: rules example, 3-1=2 damage on a talented Arlecchino with 1 Bond of Life", async () => {
  // 规则集：例如：仆人对装备天赋1层【生命之契】的仆人使用普通攻击的场合，造成3-1=2点伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active def={Arlecchino} ref={target} health={10}>
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
        <Status def={BondOfLife} usage={1} />
      </Character>
      <Character my active def={Arlecchino} />
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  // 2+1=3，受到伤害时天赋减伤 1 => 2
  c.expect(target).toHaveVariable({ health: 8 });
});

test("arlecchino: healing from a source other than Balemoon Rising is cancelled", async () => {
  // 规则集：唯厄月可知晓 ①受到来源不为【厄月将升】的治疗前：终止治疗结算
  const arle = ref();
  const c = setup(
    <State>
      <Character my active def={Arlecchino} ref={arle} health={5} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, arle);

  // 治疗被终止，生命值不变
  c.expect(arle).toHaveVariable({ health: 5 });
});

test("arlecchino: healing from Balemoon Rising is not cancelled", async () => {
  // 规则集：①受到来源不为【厄月将升】的治疗前：终止治疗结算
  // 来源为【厄月将升】时治疗正常结算：移除全部生命之契，每移除 1 层治疗 1 点
  const arle = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Arlecchino} ref={arle} health={4} energy={3}>
        <Status def={BondOfLife} usage={2} />
      </Character>
    </State>,
  );
  await c.me.skill(BalemoonRising);

  c.expect(arle).toHaveVariable({ health: 6 });
  c.expect($.typeStatus.def(BondOfLife).at($.my.active)).toNotExist();
});
