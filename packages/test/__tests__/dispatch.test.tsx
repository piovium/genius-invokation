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

import { $, Card, Character, ref, setup, State } from "#test";
import {
  NatureAndWisdom,
  TaroumarusSavings,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  ChangTheNinth,
  Liben,
  Paimon,
  Timaeus,
  Timmie,
} from "@gi-tcg/data/internal/cards/support/ally.gts";
import { SmallBolsteringBubblebalm } from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import { SourcewaterDroplet } from "@gi-tcg/data/internal/characters/hydro/neuvillette.gts";
import { expect, test } from "vitest";

// 数据层中只有草与智慧使用 :switchCards()，所有调度场景都由它触发；它先抓 1 张牌库顶的牌，再调度。
const handDefs = (c: ReturnType<typeof setup>, who: 0 | 1 = 0) =>
  c.state.players[who].hands.map((h) => h.definition.id);
const pileDefs = (c: ReturnType<typeof setup>, who: 0 | 1 = 0) =>
  c.state.players[who].pile.map((h) => h.definition.id);
const pileIds = (c: ReturnType<typeof setup>, who: 0 | 1 = 0) =>
  c.state.players[who].pile.map((h) => h.id);

test("dispatch: choosing zero cards changes nothing", async () => {
  // 规则集：调度「选择任意数量手牌」
  // 断言：选 0 张时 x=0，手牌与牌库均不变（不放回也不抓牌）
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} />
      <Card my pile def={Paimon} />
      <Card my pile def={Liben} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  await c.me.switchHands([]);
  expect(handDefs(c)).toEqual([Timmie, Paimon]);
  expect(pileDefs(c)).toEqual([Liben]);
});

test("dispatch: blacklist skips same-name cards, drawn top to bottom", async () => {
  // 规则集：记录这些牌的牌名，称为黑名单；从牌库顶到牌堆底，抓至多X张不在黑名单的牌
  // 断言：换入 2 张蒂玛乌斯后，跳过牌库里所有同名牌（含原本就在牌库里的），按从上到下顺序抓到立本、常九爷
  const t1 = ref();
  const t2 = ref();
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} ref={t1} />
      <Card my def={Timmie} ref={t2} />
      <Card my pile def={Paimon} />
      <Card my pile def={Timmie} />
      <Card my pile def={Liben} />
      <Card my pile def={Timmie} />
      <Card my pile def={ChangTheNinth} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  expect(handDefs(c)).toEqual([Timmie, Timmie, Paimon]);
  await c.me.switchHands([t1, t2]);
  expect(handDefs(c)).toEqual([Paimon, Liben, ChangTheNinth]);
  expect(pileDefs(c)).toEqual([Timmie, Timmie, Timmie, Timmie]);
});

test("dispatch: blacklist only records the chosen cards' names", async () => {
  // 规则集：记录这些牌的数量x，记录这些牌的牌名，称为黑名单
  // 断言：黑名单只含被选中的蒂玛乌斯；未被选中的手牌派蒙不进黑名单，
  //       故牌库顶第 2 张的派蒙仍被抓到（若把整个手牌都当黑名单则会改抓常九爷）
  const t1 = ref();
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} ref={t1} />
      <Card my def={Paimon} />
      <Card my pile def={Liben} />
      <Card my pile def={Paimon} />
      <Card my pile def={ChangTheNinth} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  expect(handDefs(c)).toEqual([Timmie, Paimon, Liben]);
  await c.me.switchHands([t1]);
  expect(handDefs(c)).toEqual([Paimon, Liben, Paimon]);
  expect(pileDefs(c)).toEqual([Timmie, ChangTheNinth]);
});

test("dispatch: non-blacklisted card at pile bottom is always drawn", async () => {
  // 规则集：从上到下抽取。满足数量必定能抽到太郎丸的宝藏等
  // 断言：牌库里唯一不同名的太郎丸的存款位于牌底，仍然被抓到
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} />
      <Card my pile def={Paimon} />
      <Card my pile def={Timmie} />
      <Card my pile def={Timmie} />
      <Card my pile def={Timmie} />
      <Card my pile def={TaroumarusSavings} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  await c.me.switchHands([Timmie]);
  expect(handDefs(c)).toEqual([Paimon, TaroumarusSavings]);
  expect(pileDefs(c)).toEqual([Timmie, Timmie, Timmie, Timmie]);
  c.expect($.my.hand.def(TaroumarusSavings)).toBeExist();
});

test("dispatch: if x > y, draw the remaining x - y cards from top", async () => {
  // 规则集：记抽牌数为y；如果x>y，抓（x-y）张牌
  // 断言：换入 3 张蒂玛乌斯（x=3），牌库中只有立本不在黑名单（y=1）→ 先抓立本，再从牌顶补抓 2 张同名牌
  const t1 = ref();
  const t2 = ref();
  const t3 = ref();
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} ref={t1} />
      <Card my def={Timmie} ref={t2} />
      <Card my def={Timmie} ref={t3} />
      <Card my pile def={Paimon} />
      <Card my pile def={Liben} />
      <Card my pile def={Timmie} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  await c.me.switchHands([t1, t2, t3]);
  // 立本先于补抓的同名牌入手，补抓的两张取自牌顶
  expect(handDefs(c)).toEqual([Paimon, Liben, Timmie, Timmie]);
  expect(pileDefs(c)).toEqual([Timmie, Timmie]);
});

test("dispatch: cards are put back before drawing", async () => {
  // 规则集：先放回再抽取
  // 断言：牌库为空时换入 1 张，仍能抓回 1 张（即刚放回的那张）；若先抽再放回则抓不到牌
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my def={Timmie} />
      <Card my pile def={Paimon} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  expect(pileDefs(c)).toEqual([]);
  await c.me.switchHands([Timmie]);
  expect(handDefs(c)).toEqual([Paimon, Timmie]);
  expect(pileDefs(c)).toEqual([]);
});

test("dispatch: cards are inserted one by one at random positions", async () => {
  // 规则集：将这些牌依次、随机置入牌库
  // 断言：插入位置随随机数变化（minstd：种子 0 → 恒插到牌顶；种子 1 → 恒插到牌底），
  //       且第二张以插入后的牌库长度取位置（种子 1 下 t2 落在 t1 之下），可见是逐张插入而非一次性置入
  const run = async (random: number) => {
    const t1 = ref();
    const t2 = ref();
    const c = setup(
      <State random={random}>
        <Character my active />
        <Card my def={NatureAndWisdom} />
        <Card my def={Timmie} ref={t1} />
        <Card my def={Timmie} ref={t2} />
        <Card my pile def={Paimon} />
        <Card my pile def={Liben} />
        <Card my pile def={ChangTheNinth} />
        <Card my pile def={Timaeus} />
      </State>,
    );
    await c.me.card(NatureAndWisdom);
    const timaeusId = c.state.players[0].pile[2].id;
    await c.me.switchHands([t1, t2]);
    // 两种种子下抓到的都是最靠上的两张非同名牌，原有牌相对顺序不变
    expect(handDefs(c)).toEqual([Paimon, Liben, ChangTheNinth]);
    return { ids: pileIds(c), t1: t1.id, t2: t2.id, timaeusId };
  };
  const r0 = await run(0);
  expect(r0.ids).toEqual([r0.t2, r0.t1, r0.timaeusId]);
  const r1 = await run(1);
  expect(r1.ids).toEqual([r1.timaeusId, r1.t1, r1.t2]);
});

test("NatureAndWisdom: draws first, then dispatch after invocation", async () => {
  // 规则集：草与智慧「祈求：调度，抓一张牌」；注：实际执行顺序为先抓牌，再在【祈求后】执行调度效果
  // 断言：调度请求到来时，手牌里已有刚抓到的牌，且可以把它换回牌库
  const c = setup(
    <State>
      <Character my active />
      <Card my def={NatureAndWisdom} />
      <Card my pile def={Paimon} />
      <Card my pile def={Liben} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  // 先抓牌：派蒙已在手牌，牌库只剩立本
  expect(handDefs(c)).toEqual([Paimon]);
  expect(pileDefs(c)).toEqual([Liben]);
  // 后调度：把刚抓到的派蒙换回去，抓到不同名的立本
  await c.me.switchHands([Paimon]);
  expect(handDefs(c)).toEqual([Liben]);
  expect(pileDefs(c)).toEqual([Paimon]);
});

test.fails("NatureAndWisdom: drawn card shuffled back still triggers its on-hand effect", async () => {
  // 规则集：抓到牌后再洗回牌库的场合，那张牌的【进入手牌后】效果可以发动
  // 当前引擎：调度（requestSwitchHands，归入 otherEvents）先于抓牌产生的 onHandCardInserted 结算；
  //          结算时 runtime/skill_context.ts:487-497 判定该牌已不在手牌区，直接丢弃该事件，
  //          （即使不丢弃，runtime/skill.ts:483-487 的 selfHandCardInserted 也要求 callerArea.type !== "pile"）
  //          于是水球的效果完全不发动：三名角色仍为 5 点生命值，也没有源水之滴
  // 断言：草与智慧抓到激愈水球·小后立刻用调度把它换回牌库，其「抓到此牌时」效果
  //       （治疗我方全体 1 点、生成源水之滴）仍然发动
  const c = setup(
    <State>
      <Character my active health={5} />
      <Character my health={5} />
      <Character my health={5} />
      <Card my def={NatureAndWisdom} />
      <Card my pile notInitial def={SmallBolsteringBubblebalm} />
      <Card my pile def={Paimon} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  expect(handDefs(c)).toEqual([SmallBolsteringBubblebalm]);
  await c.me.switchHands([SmallBolsteringBubblebalm]);
  // 调度抓到的是不同名的派蒙，水球已被洗回牌库
  expect(handDefs(c)).toEqual([Paimon]);
  expect(pileDefs(c)).toEqual([SmallBolsteringBubblebalm]);
  // 水球的【进入手牌后】效果仍然发动
  c.expect($.my.character.var("health", "=", 6)).toBeCount(3);
  c.expect($.my.combatStatus.def(SourcewaterDroplet)).toBeExist();
});
