
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

import { ref, setup, Character, State, Equipment, CombatStatus, Card, DeclaredEnd, DiceCount, $ } from "#test";
import { CryoElementalInfusion, CryoElementalInfusion01, KamisatoArtHyouka, KamisatoArtKabuki, KamisatoArtSenhoStatus, KamisatoAyaka, KantenSenmyouBlessing } from "@gi-tcg/data/internal/characters/cryo/kamisato_ayaka.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("a talent dup-equip test", async () => {
  const ayaka = ref();
  const c = setup(
    <State>
      <Character my active def={KamisatoAyaka} ref={ayaka} />
      <Card my def={KantenSenmyouBlessing} />
      <Card my def={KantenSenmyouBlessing} />
    </State>,
  );
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
});

test("KamisatoArtSenho02: usage not consumed when status still attached", async () => {
  const ayaka = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Kaeya} ref={kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
    </State>,
  );
  const hasStatus = () =>
    c.state.players[0].characters
      .flatMap((ch) => ch.entities)
      .some((e) => e.definition.id === KamisatoArtSenhoStatus);
  const usage = () =>
    c.state.players[0].characters.find(
      (ch) => ch.definition.id === KamisatoAyaka,
    )!.variables.usagePerRound1;

  // 第一次切出：附属状态并消耗可用次数（2 -> 1）
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(1);

  // 不普攻，切走再切回来：状态仍在，不重复触发，剩余次数仍为 1
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(1);

  // 普攻用掉状态
  await c.me.skill(KamisatoArtKabuki);
  expect(hasStatus()).toBe(false);
  expect(usage()).toBe(1);

  // 再切走再切回来：重新附属并消耗可用次数（1 -> 0）
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(0);
});

test("kamisato art senho status: +1 damage on the next normal attack only", async () => {
  // 规则：神里流·霰步（角色状态）普通攻击造成伤害时：伤害+1；可用次数：1
  const ayaka = ref();
  const opp = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={opp} health={10} />
      <Character my active def={Kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
    </State>,
  );
  await c.me.switch(ayaka);
  // 2 点物理被冰元素附魔转为冰元素伤害，再由霰步状态 +1
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 7 });
  // 状态可用次数 1，第二次普通攻击不再 +1
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 5 });
});

test("kamisato art senho: effect 2 is capped at two switch-ins per round", async () => {
  // 规则：①切换到出战角色后：附属【冰元素附魔】
  // 规则：②切换到出战角色后：若未附属【神里流·霰步（角色状态）】->附属……。每回合限2次。
  const ayaka = ref();
  const kaeya = ref();
  const opp = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={opp} health={10} />
      <Character my active def={Kaeya} ref={kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
      <DiceCount my count={16} />
    </State>,
  );
  await c.me.switch(ayaka);
  // ①的冰元素附魔把 2 点物理伤害变为冰元素伤害（故目标附着冰元素），②的角色状态再 +1
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 7, aura: Aura.Cryo });
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 4 });
  // 本回合第 3 次切入：②的每回合 2 次已用尽，不再附属角色状态，普通攻击少 1 点伤害
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toNotExist();
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 2 });
});

test("kamisato art senho: effect 1 has no per-round limit", async () => {
  // 规则：①切换到出战角色后：附属【冰元素附魔】（没有每回合次数限制，与②的「每回合限2次」相对）
  // 冰元素附魔持续到回合结束，同回合内重复附属不可见；故先装备天赋，
  // 让①改为附属互斥的另一种【冰元素附魔】，以此观察①是否仍然发动。
  const ayaka = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Kaeya} ref={kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
      <Card my def={KantenSenmyouBlessing} />
      <DiceCount my count={16} />
    </State>,
  );
  // 两次切入各附属一次角色状态并被普通攻击消耗，用尽②的每回合 2 次
  await c.me.switch(ayaka);
  await c.me.skill(KamisatoArtKabuki);
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  await c.me.skill(KamisatoArtKabuki);
  // 装备天赋本身不会替换已在场的冰元素附魔
  await c.me.card(KantenSenmyouBlessing, ayaka);
  c.expect($.my.typeStatus.def(CryoElementalInfusion)).toBeExist();
  c.expect($.my.typeStatus.def(CryoElementalInfusion01)).toNotExist();
  // 本回合第 3 次切入：②已用尽不再附属角色状态，①仍发动并换上天赋版冰元素附魔
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toNotExist();
  c.expect($.my.typeStatus.def(CryoElementalInfusion01)).toBeExist();
  c.expect($.my.typeStatus.def(CryoElementalInfusion)).toNotExist();
});

test("kamisato art senho status: lasts one round, per-round limit resets", async () => {
  // 规则：神里流·霰步（角色状态）持续回合：1；②每回合限2次
  const ayaka = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kaeya} ref={kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
    </State>,
  );
  const usage = () =>
    c.state.players[0].characters.find(
      (ch) => ch.definition.id === KamisatoAyaka,
    )!.variables.usagePerRound1;

  await c.me.switch(ayaka);
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toBeExist();
  expect(usage()).toBe(1);
  await c.opp.end();
  await c.me.end();
  // 新回合：状态因持续回合 1 而消失，每回合 2 次限制重置
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toNotExist();
  expect(usage()).toBe(2);
  await c.opp.end();
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toBeExist();
  expect(usage()).toBe(1);
});

test("kamisato art senho status: only normal attacks get the +1", async () => {
  // 规则：神里流·霰步（角色状态）普通攻击造成伤害时：伤害+1；可用次数：1
  const ayaka = ref();
  const opp = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={opp} health={10} />
      <Character my active def={Kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
      <DiceCount my count={16} />
    </State>,
  );
  await c.me.switch(ayaka);
  // 元素战技不是普通攻击：伤害不+1，也不消耗角色状态的可用次数
  await c.me.skill(KamisatoArtHyouka);
  c.expect(opp).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toBeExist();
  // 之后的普通攻击（2 点物理经冰元素附魔转冰）才 +1
  await c.me.skill(KamisatoArtKabuki);
  c.expect(opp).toHaveVariable({ health: 4 });
  c.expect($.my.typeStatus.def(KamisatoArtSenhoStatus)).toNotExist();
});
