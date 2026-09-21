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
  CombatStatus,
  Support,
  Equipment,
  Card,
  Attachment,
  DeclaredEnd,
  $,
} from "#test";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { PuffPopsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  ForbiddenKnowledge,
  NatureAndWisdom,
  Strategize,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  TheMausoleumOfKingDeshret,
  TheMausoleumOfKingDeshretInEffect,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  GluttonousYumkasaurMountainKing,
  TheAlldevourer,
} from "@gi-tcg/data/internal/characters/dendro/gluttonous_yumkasaur_mountain_king.gts";
import {
  Keqing,
  LightningStiletto,
  StellarRestoration,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { DeepDevourersDomain } from "@gi-tcg/data/internal/characters/hydro/alldevouring_narwhal.gts";
import {
  LargeBolsteringBubblebalm,
  MediumBolsteringBubblebalm,
} from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import {
  SweepingFervor,
  Xinyan,
} from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { CostIncrease } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test("large bubblebalm: resolves when still in hand at trigger time", async () => {
  // 规则集：时机触发时在手牌就能发动；在对方牌库顶第2张生成【激愈水球·中】，然后弃置此牌
  // 断言：抓到水球后治疗出战角色 3 点，中水球插入对方牌库第 2 张，水球自身离开手牌
  const myActive = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={5} />
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
      <Card opp pile def={Paimon} />
      <Card opp pile def={Paimon} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[1].pile.map((card) => card.definition.id)).toEqual([
    Paimon,
    MediumBolsteringBubblebalm,
    Paimon,
  ]);
});

test("large bubblebalm: medium bubble goes to top when opp pile is empty", async () => {
  // 规则集：对方牌库没牌的场合会放置在牌库顶
  const myActive = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={5} />
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect(myActive).toHaveVariable({ health: 8 });
  expect(c.state.players[1].pile.map((card) => card.definition.id)).toEqual([
    MediumBolsteringBubblebalm,
  ]);
});

test("large bubblebalm: self-dispose is not a discard", async () => {
  // 规则集：不属于舍弃，不能触发鲸鱼被动
  // 断言：水球效果结算后，深噬之域的吞噬计数不增加
  const myActive = ref();
  const domain = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={5} />
      <CombatStatus my def={DeepDevourersDomain} ref={domain} />
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(0);
  c.expect(domain).toHaveVariable({ cardCount: 0 });
});

test("draw-card timing: opp mausoleum does not count a bubble disposed by its own effect", async () => {
  // 规则集：若实体进入手牌后在结算【抓牌后】时已被弃置，则无法执行【抓牌后】的效果（如：赤王陵）
  // 规则集：对方场上有赤王陵（支援牌），当前轮次为我方，抽到【激愈水球·大】，先结算水球效果并弃置，此时水球不再在手牌，对方赤王陵（支援牌）无法生效
  const myActive = ref();
  const mausoleum = ref();
  const c = setup(
    <State>
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active ref={myActive} health={5} />
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
    </State>,
  );
  await c.me.card(Strategize);
  // 水球先结算并弃置
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(0);
  // 对方赤王陵不计入这次抓牌
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 0 });
});

test("draw-card timing: a drawn card stolen before resolution is not counted as drawn", async () => {
  // 规则集：抓1张牌后 等价于 一个实体移动后，若（方式为抓牌且实体在你的手牌）
  // 断言：我方山王天赋令对方抓 1 张并立即偷走，结算时该牌已在我方手牌，我方赤王陵不计入对方抓牌
  const king = ref();
  const mausoleum = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Card opp pile def={Paimon} />
      <Character my active def={GluttonousYumkasaurMountainKing} ref={king} />
      <Support my def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Card my def={TheAlldevourer} />
    </State>,
  );
  await c.me.card(TheAlldevourer, king);
  c.expect($.my.hand.def(Paimon)).toBeCount(1);
  c.expect($.opp.hand).toBeCount(0);
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 0 });
});

test("draw-card timing: my mausoleum-in-effect (combat status) resolves before the bubble", async () => {
  // 规则集：我方有赤王陵（出战状态），抽到【激愈水球·大】，先结算赤王陵（出战状态），再结算水球
  // 断言：出战状态先于手牌中的水球结算，故此时水球仍在手牌，赤王陵生成 1 张禁忌知识；随后水球正常结算
  const myActive = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={5} />
      <CombatStatus my def={TheMausoleumOfKingDeshretInEffect} />
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect($.my.pile.def(ForbiddenKnowledge)).toBeCount(1);
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[1].pile.map((card) => card.definition.id)).toEqual([
    MediumBolsteringBubblebalm,
  ]);
});

test.fails("hand-card-inserted timing: not triggered on overflowed draw, while draw-card timing is", async () => {
  // 规则集：加入手牌后……爆牌时无法发动；当前引擎：爆牌的牌进入本方墓地后仍视为「本方的牌」，咚咚嘭嘭对每张爆牌各发动 1 次（usage 3 -> 1）
  // 规则集：抓1张牌后 等价于 一个实体移动后，若（方式为抓牌且实体在你的手牌）或（方式为爆牌）
  // 断言：手牌满时结束阶段抓 2 张爆牌，咚咚嘭嘭不发动，对方赤王陵（抓牌后）仍计 2 次
  const myActive = ref();
  const puffPops = ref();
  const mausoleum = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active ref={myActive} health={5}>
        <Status def={PuffPopsInEffect} usage={3} ref={puffPops} />
      </Character>
      <Card my pile notInitial def={Strategize} />
      <Card my pile notInitial def={Strategize} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.end();
  c.expect($.my.hand).toBeCount(10);
  c.expect($.my.pile).toBeCount(0);
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 2 });
  c.expect(puffPops).toHaveVariable({ usage: 3 });
  c.expect(myActive).toHaveVariable({ health: 5 });
});

test("hand-card-inserted vs draw-card: a card created into hand is inserted but not drawn", async () => {
  // 规则集：加入手牌后 等价于 一个实体移动后，若移动目标为手牌，且为你的牌；抓1张牌后……方式为抓牌
  // 断言：刻晴生成雷楔进入手牌，咚咚嘭嘭（加入手牌后）发动，对方赤王陵（抓牌后）不计数
  const keqing = ref();
  const puffPops = ref();
  const mausoleum = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active def={Keqing} ref={keqing} health={5}>
        <Status def={PuffPopsInEffect} usage={3} ref={puffPops} />
      </Character>
    </State>,
  );
  await c.me.skill(StellarRestoration);
  c.expect($.my.hand.def(LightningStiletto)).toBeCount(1);
  c.expect(keqing).toHaveVariable({ health: 6 });
  c.expect(puffPops).toHaveVariable({ usage: 2 });
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 0 });
});

test("stolen card: only the stealer's side resolves hand-card-inserted", async () => {
  // 规则集：被山王天赋偷走的场合，不再是你的牌，不能发动
  // 规则集：我方山王使用天赋，抽取对方牌库顶的水泡。对方结算【水泡移动到手牌后】时，水泡已不在手牌区，不进行结算。只结算我方【水泡移动到手牌后】
  const king = ref();
  const myPuffPops = ref();
  const oppActive = ref();
  const oppPuffPops = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={5}>
        <Status def={PuffPopsInEffect} usage={3} ref={oppPuffPops} />
      </Character>
      <Card opp pile notInitial def={LargeBolsteringBubblebalm} />
      <Character
        my
        active
        def={GluttonousYumkasaurMountainKing}
        ref={king}
        health={3}
      >
        <Status def={PuffPopsInEffect} usage={3} ref={myPuffPops} />
      </Character>
      <Card my def={TheAlldevourer} />
    </State>,
  );
  await c.me.card(TheAlldevourer, king);
  // 对方：水球已被偷走，不再是对方的牌，对方的咚咚嘭嘭与水球效果均不结算
  c.expect(oppActive).toHaveVariable({ health: 5 });
  c.expect(oppPuffPops).toHaveVariable({ usage: 3 });
  // 我方：咚咚嘭嘭 +1，水球 +3，中水球置于对方牌库
  c.expect(king).toHaveVariable({ health: 7 });
  c.expect(myPuffPops).toHaveVariable({ usage: 2 });
  c.expect($.my.hand).toBeCount(0);
  expect(c.state.players[1].pile.map((card) => card.definition.id)).toEqual([
    MediumBolsteringBubblebalm,
  ]);
});

test("queue start: post-move timing removed when the card already left the hand (xinyan + power saw)", async () => {
  // 规则集：【时机队列结算开始时】：若队列中有【移动后】且移动事件的卡牌已不在目标区域->移除此【移动后】时机（不进行结算）
  // 规则集：装备动力锯的辛炎使用战技，抽取牌库顶的水泡并弃置。结算【水泡移动后】时，水泡已不在手牌区，不进行结算。
  // 断言：水球效果、我方咚咚嘭嘭、对方赤王陵均不结算
  const xinyan = ref();
  const puffPops = ref();
  const mausoleum = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active def={Xinyan} ref={xinyan} health={5}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
        <Status def={PuffPopsInEffect} usage={3} ref={puffPops} />
      </Character>
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  // 水球已抓上手并被战技舍弃
  c.expect($.my.pile).toBeCount(0);
  c.expect($.my.hand).toBeCount(0);
  c.expect(xinyan).toHaveVariable({ health: 5 });
  c.expect(puffPops).toHaveVariable({ usage: 3 });
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 0 });
  c.expect($.opp.pile).toBeCount(0);
});

test("nature and wisdom: bubble shuffled back into pile, puff pops triggers but bubble does not", async () => {
  // 规则集：使用草与智慧将水泡抽上手再洗入牌库。依次执行【调度】和【移动后】，咚咚嘭嘭，可以发动。
  // 规则集：只需要曾移动到手牌即可触发，不需要执行时也在手牌；效果结算时……在牌库不能发动
  const myActive = ref();
  const puffPops = ref();
  const c = setup(
    <State>
      <Character my active ref={myActive} health={5}>
        <Status def={PuffPopsInEffect} usage={3} ref={puffPops} />
      </Character>
      <Card my def={NatureAndWisdom} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm} />
      <Card my pile def={Paimon} />
    </State>,
  );
  await c.me.card(NatureAndWisdom);
  // 调度：把抓到的水球换回牌库，换上来派蒙（初始牌组中的牌，不触发咚咚嘭嘭）
  await c.me.switchHands([LargeBolsteringBubblebalm]);
  c.expect($.my.pile.def(LargeBolsteringBubblebalm)).toBeCount(1);
  c.expect($.my.hand.def(Paimon)).toBeCount(1);
  // 咚咚嘭嘭仍发动 1 次
  c.expect(myActive).toHaveVariable({ health: 6 });
  c.expect(puffPops).toHaveVariable({ usage: 2 });
  // 水球在牌库中，不发动
  c.expect($.opp.pile).toBeCount(0);
});

test("bubble discarded during its own post-move handling still resolves from the graveyard", async () => {
  // 规则集：我方使用抽取水泡后，先触发【咚咚嘭嘭】的效果，导致水泡被弃置，墓地的水泡依然能正常发动效果
  // 规则集：效果结算时，在手牌或墓地可以发动
  // 链路：咚咚嘭嘭治疗 -> 老兵的容颜抓到中水球 -> 中水球对出战角色造成伤害 -> 动力锯舍弃（费用最高的）大水球 -> 大水球在墓地仍结算
  const xinyan = ref();
  const puffPops = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Xinyan} ref={xinyan} health={1}>
        <Equipment def={VeteransVisage} v={{ count: 1 }} />
        <Equipment def={PortablePowerSaw} />
        <Status def={PuffPopsInEffect} usage={3} ref={puffPops} />
      </Character>
      <Card my def={Strategize} />
      <Card my pile notInitial def={LargeBolsteringBubblebalm}>
        <Attachment def={CostIncrease} v={{ layer: 4 }} />
      </Card>
      <Card my pile def={Paimon} />
      <Card my pile notInitial def={MediumBolsteringBubblebalm} />
    </State>,
  );
  await c.me.card(Strategize);
  // 1 ->2（咚咚嘭嘭）->3（咚咚嘭嘭，中水球）->2（中水球 2 水伤，锯子减 1 并舍弃大水球）->5（墓地大水球治疗 3）
  c.expect(xinyan).toHaveVariable({ health: 5 });
  c.expect(puffPops).toHaveVariable({ usage: 1 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.hand.def(Paimon)).toBeCount(1);
  c.expect($.opp.pile.def(MediumBolsteringBubblebalm)).toBeCount(1);
});
