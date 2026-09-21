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
  Attachment,
  Card,
  Character,
  ref,
  setup,
  State,
  Support,
} from "#test";
import { FortressOfMeropide } from "@gi-tcg/data/internal/cards/support/place.gts";
import { IneffectiveWhenPlayed } from "@gi-tcg/data/internal/commons.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Strategize,
  TheBestestTravelCompanion,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  Chevreuse,
  OverchargedBall,
  ShortrangeRapidInterdictionFire,
} from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { expect, test } from "vitest";

// 规则集写的点数是 5（上限 5、满 5 消耗），当前数据版本为 6；
// 该差异由文件末尾的 test.fails 单独记录，其余用例都在当前数据版本上验证与点数无关的细则。

test("fortress of meropide: active character damaged or healed each adds one forbidden point", async () => {
  // 规则集：我方出战角色受到伤害或治疗后：此牌累积1点【禁令】
  const myActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active ref={myActive} />
      <Support my def={FortressOfMeropide} v={{ forbidden: 0 }} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );

  // 受到伤害：+1
  await c.opp.skill(TemperedSword);
  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 1,
  });

  // 受到治疗：再 +1
  await c.me.card(MondstadtHashBrown, myActive);
  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 2,
  });
});

test("fortress of meropide: reaching the point cap with an opponent hand card consumes the points and makes one card ineffective", async () => {
  // 规则集：然后若点数为5且对方有手牌，消耗5点->赋予对方1张手牌无效化（当前数据版本的点数为 6）
  const oppCard = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active />
      <Support my def={FortressOfMeropide} v={{ forbidden: 5 }} />
      <Card opp def={Strategize} ref={oppCard} />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  // 点数被消耗归零
  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 0,
  });
  const hand = c.state.players[1].hands.find((card) => card.id === oppCard.id)!;
  expect(hand.attachments.map((a) => a.definition.id)).toContain(
    IneffectiveWhenPlayed,
  );
});

test("fortress of meropide: an already ineffective hand card is not chosen as the target", async () => {
  // 规则集：无效化：已无效化的卡牌不会成为无效化的目标
  const marked = ref();
  const fresh = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active />
      <Support my def={FortressOfMeropide} v={{ forbidden: 5 }} />
      <Card opp def={Strategize} ref={marked}>
        <Attachment def={IneffectiveWhenPlayed} />
      </Card>
      <Card opp def={TheBestestTravelCompanion} ref={fresh} />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  const hands = c.state.players[1].hands;
  const markedCard = hands.find((card) => card.id === marked.id)!;
  const freshCard = hands.find((card) => card.id === fresh.id)!;
  // 未被无效化的那张才是目标
  expect(freshCard.attachments.map((a) => a.definition.id)).toContain(
    IneffectiveWhenPlayed,
  );
  // 已无效化的那张没有被重复附加
  expect(
    markedCard.attachments.filter(
      (a) => a.definition.id === IneffectiveWhenPlayed,
    ),
  ).toBeArrayOfSize(1);
});

test("fortress of meropide: forbidden points are not consumed while the opponent has no hand cards", async () => {
  // 规则集：对方没手牌不会消耗禁令
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active />
      <Support my def={FortressOfMeropide} v={{ forbidden: 5 }} />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  // 点数照常累积，但没有被消耗
  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 6,
  });
});

test("fortress of meropide: points are still consumed when every opponent hand card is already ineffective", async () => {
  // 规则集：对方有手牌但均已无效化，也会消耗禁令，但无效果
  const marked = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active />
      <Support my def={FortressOfMeropide} v={{ forbidden: 5 }} />
      <Card opp def={Strategize} ref={marked}>
        <Attachment def={IneffectiveWhenPlayed} />
      </Card>
    </State>,
  );

  await c.opp.skill(TemperedSword);

  // 禁令被消耗
  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 0,
  });
  // 但没有产生任何额外效果
  const markedCard = c.state.players[1].hands.find(
    (card) => card.id === marked.id,
  )!;
  expect(
    markedCard.attachments.filter(
      (a) => a.definition.id === IneffectiveWhenPlayed,
    ),
  ).toBeArrayOfSize(1);
});

test("fortress of meropide: an ineffective card loses its play effect but is still a combat action", async () => {
  // 规则集：只无效打出效果。战斗行动和弃置效果不受影响
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} />
      <Character my active def={Chevreuse} />
      <Card my def={OverchargedBall} notInitial>
        <Attachment def={IneffectiveWhenPlayed} />
      </Card>
    </State>,
  );

  await c.me.card(OverchargedBall);

  // 打出效果（1 点火元素伤害）无效
  c.expect(oppActive).toHaveVariable({ health: 10 });
  c.expect($.my.hand).toNotExist();
  // 但它仍然是战斗行动：行动权转移给对方
  expect(c.state.currentTurn).toBe(1);
});

test("fortress of meropide: an ineffective card keeps its discard effect", async () => {
  // 规则集：只无效打出效果。战斗行动和弃置效果不受影响
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} />
      <Character my active def={Chevreuse} health={8} />
      <Card my def={OverchargedBall} notInitial>
        <Attachment def={IneffectiveWhenPlayed} />
      </Card>
    </State>,
  );

  // 近迫式急促拦射会舍弃手牌中的超量装药弹头
  await c.me.skill(ShortrangeRapidInterdictionFire);

  // 技能 2 点 + 被舍弃的弹头 1 点，弃置效果未被无效化影响
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toNotExist();
});

test.fails("fortress of meropide: five forbidden points consume and make a card ineffective", async () => {
  // 规则集：此牌累积1点【禁令】（可叠加，上限为5），然后若点数为5且对方有手牌，消耗5点->赋予对方1张手牌无效化
  // 当前引擎（当前数据版本）：上限与阈值均为 6，累积到 5 点既不触发无效化也不消耗禁令
  const oppCard = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active />
      <Support my def={FortressOfMeropide} v={{ forbidden: 4 }} />
      <Card opp def={Strategize} ref={oppCard} />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  c.expect($.my.support.def(FortressOfMeropide)).toHaveVariable({
    forbidden: 0,
  });
  const hand = c.state.players[1].hands.find((card) => card.id === oppCard.id)!;
  expect(hand.attachments.map((a) => a.definition.id)).toContain(
    IneffectiveWhenPlayed,
  );
});
