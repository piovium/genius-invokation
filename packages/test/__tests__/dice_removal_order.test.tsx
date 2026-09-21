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
  DeclaredEnd,
  DiceCount,
  ref,
  setup,
  State,
  Summon,
  Support,
} from "#test";
import { Liben } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Vanarana } from "@gi-tcg/data/internal/cards/support/place.gts";
import { Oz } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 观测手法：我方先宣布结束，对方后宣布结束，结束阶段我方支援牌先结算；
// 随后对方奥兹击倒我方 1 血出战角色，引擎暂停等待选人，此时可读取移除后的剩余骰子。

test("dice removal order: elemental dice removed before omni (Liben)", async () => {
  // 规则集：元素骰 优先于 万能骰
  // 立本 X=2，骰子 [万,万,火,水] → 弃置火、水，剩余 [万,万]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} v={{ collected: 1 }} />
      <DiceCount
        my
        dice={[DiceType.Omni, DiceType.Omni, DiceType.Pyro, DiceType.Hydro]}
      />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Omni,
    DiceType.Omni,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("dice removal order: more numerous dice removed before fewer (Liben)", async () => {
  // 规则集：数量多的骰子 优先于 数量少的骰子
  // 立本 X=1，骰子 [冰,风,风] → 风有 2 个，先于顺序靠前但只有 1 个的冰被弃置，剩余 [冰,风]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} v={{ collected: 2 }} />
      <DiceCount my dice={[DiceType.Cryo, DiceType.Anemo, DiceType.Anemo]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Cryo,
    DiceType.Anemo,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("dice removal order: same count follows Cryo-Hydro-Pyro-Electro-Geo order (Liben)", async () => {
  // 规则集：冰水火雷岩草风
  // 立本 X=3，骰子各 1 个 [岩,雷,火,水,冰] → 弃置冰、水、火，剩余 [雷,岩]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} />
      <DiceCount
        my
        dice={[
          DiceType.Geo,
          DiceType.Electro,
          DiceType.Pyro,
          DiceType.Hydro,
          DiceType.Cryo,
        ]}
      />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Electro,
    DiceType.Geo,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("dice removal order: same count follows Electro-Geo-Dendro order (Liben)", async () => {
  // 规则集：冰水火雷岩草风
  // 立本 X=2，骰子各 1 个 [草,岩,雷] → 弃置雷、岩，剩余 [草]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} v={{ collected: 1 }} />
      <DiceCount my dice={[DiceType.Dendro, DiceType.Geo, DiceType.Electro]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([DiceType.Dendro]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test.fails("dice removal order: same count follows Geo-Dendro-Anemo order (Liben)", async () => {
  // 规则集：「元素骰是有序的，会按照以下顺序排列……冰水火雷岩草风」
  // 立本 X=2，骰子 [风,草,岩] → 应弃置岩、草，剩余 [风]
  // 当前引擎：core/src/runtime/skill_context.ts absorbDice 同数量时按 DiceType 编号升序
  // （Anemo=5 < Geo=6 < Dendro=7，即 冰水火雷风岩草），弃置风、岩，剩余 [草]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} v={{ collected: 1 }} />
      <DiceCount my dice={[DiceType.Anemo, DiceType.Dendro, DiceType.Geo]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([DiceType.Anemo]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("Liben: non-omni dice must be distinct, omni dice may repeat", async () => {
  // 规则集：弃置至多X个（不同的非万能骰）和万能骰，累积等量点【货】
  // 立本 X=3，骰子 [火,火,火,万,万] → 火只取 1 个，万能骰可重复取 → 弃置火、万、万，剩余 [火,火]，货 3
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} />
      <DiceCount
        my
        dice={[
          DiceType.Pyro,
          DiceType.Pyro,
          DiceType.Pyro,
          DiceType.Omni,
          DiceType.Omni,
        ]}
      />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Pyro,
    DiceType.Pyro,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("Liben: collects fewer than X when distinct non-omni dice run out", async () => {
  // 规则集：弃置至多X个（不同的非万能骰）和万能骰，累积等量点【货】
  // 立本 X=3，骰子 [火,火,火] → 只能弃置 1 个火，剩余 [火,火]，货 1
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Pyro, DiceType.Pyro]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Pyro,
    DiceType.Pyro,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 1 });
});

test("Liben: X equals 3 minus cargo", async () => {
  // 规则集：X为 3-【货】的数量
  // 货 2 → X=1，骰子 [万,万,万] → 只弃置 1 个，剩余 [万,万]，货 3
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Liben} v={{ collected: 2 }} />
      <DiceCount my dice={[DiceType.Omni, DiceType.Omni, DiceType.Omni]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Omni,
    DiceType.Omni,
  ]);
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 3 });
});

test("Liben: at action phase with 3 cargo draws 2, generates 2 omni and disposes", async () => {
  // 规则集：行动阶段开始时：若【货】达到3，抓2张牌，生成2个万能元素，弃置此牌
  // 结束阶段收集 [冰,水,火] 达到 3 货 → 下回合行动阶段开始：手牌 2（节末抓）+2，骰子 8（投掷）+2 万能，立本弃置
  const c = setup(
    <State>
      <Support my def={Liben} />
      <DiceCount my dice={[DiceType.Cryo, DiceType.Hydro, DiceType.Pyro]} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.support.def(Liben)).toNotExist();
  expect(c.state.players[0].hands).toBeArrayOfSize(4);
  expect(c.state.players[0].dice).toEqual(Array(10).fill(DiceType.Omni));
});

test("Liben: does not trigger at action phase when cargo is below 3", async () => {
  // 规则集：行动阶段开始时：若【货】达到3，…（未达到 3 则不触发）
  // 货 2、结束阶段无骰子可收集 → 下回合立本仍在场，手牌只有节末抓的 2 张，骰子仍为 8
  const c = setup(
    <State>
      <Support my def={Liben} v={{ collected: 2 }} />
      <DiceCount my count={0} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
      <Card my pile def={Liben} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.support.def(Liben)).toHaveVariable({ collected: 2 });
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
});

test("Vanarana: picks two dice of the most numerous color", async () => {
  // 规则集：桓纳兰那：同色元素骰数量大于1的场合，会选择数量最多的两个同色骰
  // 骰子 [冰,冰,水,水,水,火] → 收集水、水，剩余 [冰,冰,水,火]；下回合拿回 2 个水
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Vanarana} />
      <DiceCount
        my
        dice={[
          DiceType.Cryo,
          DiceType.Cryo,
          DiceType.Hydro,
          DiceType.Hydro,
          DiceType.Hydro,
          DiceType.Pyro,
        ]}
      />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Cryo,
    DiceType.Cryo,
    DiceType.Hydro,
    DiceType.Pyro,
  ]);
  c.expect($.my.support.def(Vanarana)).toHaveVariable({
    count: 2,
    d1: DiceType.Hydro,
    d2: DiceType.Hydro,
  });
  await c.me.chooseActive(myNext);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    ...Array(8).fill(DiceType.Omni),
    DiceType.Hydro,
    DiceType.Hydro,
  ]);
});

test("Vanarana: elemental dice are picked before omni dice", async () => {
  // 规则集：元素骰 优先于 万能骰
  // 骰子 [万,万,火] → 收集火、万，剩余 [万]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Vanarana} />
      <DiceCount my dice={[DiceType.Omni, DiceType.Omni, DiceType.Pyro]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([DiceType.Omni]);
  c.expect($.my.support.def(Vanarana)).toHaveVariable({
    count: 2,
    d1: DiceType.Pyro,
    d2: DiceType.Omni,
  });
});

test("Vanarana: same count follows Cryo-Hydro-Pyro-Electro order", async () => {
  // 规则集：冰水火雷岩草风
  // 骰子各 1 个 [雷,火,水,冰] → 收集冰、水，剩余 [火,雷]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Vanarana} />
      <DiceCount
        my
        dice={[DiceType.Electro, DiceType.Pyro, DiceType.Hydro, DiceType.Cryo]}
      />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Pyro,
    DiceType.Electro,
  ]);
  c.expect($.my.support.def(Vanarana)).toHaveVariable({
    count: 2,
    d1: DiceType.Cryo,
    d2: DiceType.Hydro,
  });
});

test.fails("Vanarana: same count follows Geo-Dendro-Anemo order", async () => {
  // 规则集：「元素骰是有序的，会按照以下顺序排列……冰水火雷岩草风」
  // 骰子 [风,草,岩] → 应收集岩、草，剩余 [风]
  // 当前引擎：core/src/runtime/skill_context.ts absorbDice 同数量时按 DiceType 编号升序
  // （Anemo=5 < Geo=6 < Dendro=7），收集风、岩，剩余 [草]
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <DeclaredEnd my />
      <Character my active health={1} />
      <Character my ref={myNext} />
      <Support my def={Vanarana} />
      <DiceCount my dice={[DiceType.Anemo, DiceType.Dendro, DiceType.Geo]} />
      <Summon opp def={Oz} />
    </State>,
  );
  await c.opp.end();
  expect(c.state.players[0].dice).toIncludeSameMembers([DiceType.Anemo]);
  c.expect($.my.support.def(Vanarana)).toHaveVariable({
    count: 2,
    d1: DiceType.Geo,
    d2: DiceType.Dendro,
  });
});
