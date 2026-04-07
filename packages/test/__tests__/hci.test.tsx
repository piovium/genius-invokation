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

import {
  ref,
  setup,
  Character,
  State,
  Equipment,
  Card,
  Status,
  Support,
  Attachment,
  CombatStatus,
  $,
} from "#test";
import { describe, test, expect } from "bun:test";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore";
import { CountdownToTheShow2, NatureAndWisdom, Strategize, TheNarzissenkreuzAdventure, UnderseaTreasure } from "@gi-tcg/data/internal/cards/event/other";
import {
  Chasca,
  ShadowhuntShell,
} from "@gi-tcg/data/internal/characters/anemo/chasca";
import {
  LargeBolsteringBubblebalm,
  MediumBolsteringBubblebalm,
  Sigewinne,
} from "@gi-tcg/data/internal/characters/hydro/sigewinne";
import {
  SweepingFervor,
  Xinyan,
} from "@gi-tcg/data/internal/characters/pyro/xinyan";
import { Aura } from "@gi-tcg/typings";
import { PuffPopsInEffect } from "@gi-tcg/data/internal/cards/event/food";
import { Keqing } from "@gi-tcg/data/internal/characters/electro/keqing";
import { Nahida } from "@gi-tcg/data/internal/characters/dendro/nahida";
import {
  GluttonousYumkasaurMountainKing,
  TheAlldevourer,
} from "@gi-tcg/data/internal/characters/dendro/gluttonous_yumkasaur_mountain_king";
import { TheMausoleumOfKingDeshret, TheMausoleumOfKingDeshretInEffect } from "@gi-tcg/data/internal/cards/support/place";
import { CrystalShrapnel, Navia } from "@gi-tcg/data/internal/characters/geo/navia";
import { CostIncrease } from "@gi-tcg/data/internal/commons";
import { Baizhu, SeamlessShield } from "@gi-tcg/data/internal/characters/dendro/baizhu";
import { Jean } from "@gi-tcg/data/internal/characters/anemo/jean";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { YaeMiko } from "@gi-tcg/data/internal/characters/electro/yae_miko";
import { TowerOfIpsissimus } from "@gi-tcg/data/internal/cards/support/adventure";

describe("HCI stuff", () => {
  test("HCI event should be handled after other events", async () => {
    const myNext = ref();
    const c = setup(
      <State>
        <Character my active def={Jean} health={1}>
          <Status def={PuffPopsInEffect} usage={1} />
        </Character>
        <Character my def={Kaeya} ref={myNext} />
        <Character my def={YaeMiko} />
        <Card my pile notInitial def={UnderseaTreasure} />
        <Card my def={TheNarzissenkreuzAdventure} />
      </State>
    );
    await c.me.card(TheNarzissenkreuzAdventure);
    // 事件列表 [HCI, 请求冒险]，重排后 HCI 在请求冒险之后
    await c.me.selectCard(TowerOfIpsissimus);
    c.expect($.my.active).toNotExist();
    // 请求冒险选塔把琴打死，此时 HCI 不会再生效
    await c.me.chooseActive(myNext);
  });

  test("sigewinne and yumkasaur interaction", async () => {
    const yumkasaur = ref();
    const oppActive = ref();
    const myPuffPopsActive = ref();
    const oppPuffPopsActive = ref();
    const c = setup(
      <State>
        <Card opp pile def={CountdownToTheShow2} notInitial />
        <Character opp active def={Keqing} ref={oppActive} health={7}>
          <Status def={PuffPopsInEffect} usage={3} ref={oppPuffPopsActive} />
        </Character>

        <Character
          my
          def={GluttonousYumkasaurMountainKing}
          ref={yumkasaur}
          health={5}
        >
          <Status def={PuffPopsInEffect} usage={3} ref={myPuffPopsActive} />
        </Character>
        <Card my def={TheAlldevourer} />
      </State>,
    );

    // 打出山王天赋
    await c.me.card(TheAlldevourer, yumkasaur);

    // 确认偷到牌了
    expect(c.state.players[0].hands.length).toBe(1);
    expect(c.state.players[0].hands[0].definition.id).toBe(CountdownToTheShow2);
    expect(c.state.players[1].hands.length).toBe(0);

    // 山王方的咚咚嘭嘭触发
    c.expect(yumkasaur).toHaveVariable({ health: 6 });
    c.expect(myPuffPopsActive).toHaveVariable({ usage: 2 });

    // 被偷牌方的咚咚嘭嘭不触发
    c.expect(oppActive).toHaveVariable({ health: 7 });
    c.expect(oppPuffPopsActive).toHaveVariable({ usage: 3 });
  });

  test("NatureAndWisdom with TheMausoleumOfKingDeshret", async () => {
    const myActive = ref();
    const myPuffPopsActive = ref();
    const oppMausoleum = ref();
    const c = setup(
      <State>
        <Character my active def={Nahida} ref={myActive} health={6}>
          <Status def={PuffPopsInEffect} usage={3} ref={myPuffPopsActive} />
        </Character>

        <Support opp def={TheMausoleumOfKingDeshret} ref={oppMausoleum} />

        <Card my pile def={CountdownToTheShow2} notInitial />
        <Card my def={NatureAndWisdom} />
      </State>,
    );

    // 打出草与智慧
    await c.me.card(NatureAndWisdom);

    // 调度换走抽到的这张牌，然后重新抽上来同一张牌
    await c.me.switchHands([CountdownToTheShow2]);

    // 咚咚嘭嘭触发2次
    c.expect(myPuffPopsActive).toHaveVariable({ usage: 1 });
    c.expect(myActive).toHaveVariable({ health: 8 });

    // 赤王陵触发2次
    c.expect(oppMausoleum).toHaveVariable({ drawnCardCount: 2 });
  });

  test("do not trigger transform of chasca's shell if immediately dispose", async () => {
    const oppStandby = ref();
    const c = setup(
      <State>
        <Character opp active />
        <Character opp ref={oppStandby} health={10} />
        <Character my def={Chasca} />
        <Character my active def={Xinyan}>
          <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
        </Character>
        <Card my pile def={ShadowhuntShell} />
      </State>,
    );
    await c.me.skill(SweepingFervor);
    // E 2 火伤，动力锯+1；洽斯卡弹头 1 风伤扩散消元素
    c.expect($.opp.active).toHaveVariable({ health: 6, aura: Aura.None });
    // 后台 1 扩散火伤
    c.expect(oppStandby).toHaveVariable({ health: 9, aura: Aura.Pyro });
  });

  test("a complex method of PuffPops & Bubblebalm", async () => {
    const oppActive = ref();
    const myActive = ref();
    const c = setup(
      <State>
        <Character opp active ref={oppActive} health={10} />
        <Character my active def={Navia} ref={myActive} health={1}>
          <Equipment def={VeteransVisage} v={{ count: 1 }} />
          <Equipment def={PortablePowerSaw} />
          <Status my def={PuffPopsInEffect} usage={2} />
        </Character>
        <Character my def={Sigewinne} />
        <Character my def={Chasca} />
        <Card my def={Strategize} />
        <Card my pile notInitial def={LargeBolsteringBubblebalm} />
        <Card my pile notInitial def={ShadowhuntShell} />
        <Card my pile notInitial def={MediumBolsteringBubblebalm} />
      </State>,
    );
    await c.me.card(Strategize);
    // 心海：抽上来大水泡、弹头
    // > 进入手牌后：
    // --- ddpp：治疗我方出战 1->2
    // --- > 治疗后：
    // --- --- 老兵：抽中水泡
    // --- --- > 进入手牌后：
    // --- --- --- ddpp：治疗我方出战 2->3
    // --- --- --- 中水泡：对我方出战打1水伤 3->2
    // --- --- --- > 其中内联地舍弃弹头
    // --- 大水泡：治疗我方出战 2->5
    c.expect($.my.typeEquipment.def(PortablePowerSaw)).toHaveVariable({ stoic: 1 });
    c.expect(oppActive).toHaveVariable({ health: 9 });
    c.expect(myActive).toHaveVariable({ health: 5 });
    c.expect($.my.hand).toBeCount(0);
    c.expect($.my.pile.limit(1)).toBeDefinition(ShadowhuntShell);
    // console.dir(c.game.detailLog, { depth: null });
  });

  
  test("Bubblebalm will trigger if its dispose is inside belonging HCI's handling", async () => {
    const oppActive = ref();
    const myActive = ref();
    const c = setup(
      <State>
        <Character opp active ref={oppActive} health={10} />
        <Character my active def={Navia} ref={myActive} health={1}>
          <Equipment def={VeteransVisage} v={{ count: 1 }} />
          <Equipment def={PortablePowerSaw} />
          <Status my def={PuffPopsInEffect} usage={2} />
        </Character>
        <Character my def={Sigewinne} />
        <Character my def={Chasca} />
        <Card my def={Strategize} />
        <Card my pile notInitial def={LargeBolsteringBubblebalm} >
          {/* 和上一个用例完全一样，但是这里给大水泡加到 4 费从而让锯子弃它 */}
          <Attachment def={CostIncrease} v={{ layer: 4 }} />
        </Card>
        <Card my pile notInitial def={ShadowhuntShell} />
        <Card my pile notInitial def={MediumBolsteringBubblebalm} />
      </State>,
    );
    await c.me.card(Strategize);
    // 心海：抽上来大水泡、弹头
    // > 进入手牌后：
    // --- ddpp：治疗我方出战 1->2
    // --- > 治疗后：
    // --- --- 老兵：抽中水泡
    // --- --- > 进入手牌后：
    // --- --- --- ddpp：治疗我方出战 2->3
    // --- --- --- 中水泡：对我方出战打1水伤 3->2
    // --- --- --- > 其中内联地舍弃大水泡
    // --- 大水泡：治疗我方出战 2->5
    c.expect($.my.typeEquipment.def(PortablePowerSaw)).toHaveVariable({ stoic: 1 });
    c.expect(oppActive).toHaveVariable({ health: 10 });
    c.expect(myActive).toHaveVariable({ health: 5 });
    c.expect($.my.hand.limit(1)).toBeDefinition(ShadowhuntShell);
  });

  test("Bubblebalm/PuffPops behavior with discard between HCI events emission and handling", async () => {
    const c = setup(
      <State>
        <Character opp active def={Baizhu} />
        <CombatStatus opp def={SeamlessShield} />
        <Character my active def={Navia} health={5} >
          <Equipment def={PortablePowerSaw} />
          <Status my def={PuffPopsInEffect} />
        </Character>
        <CombatStatus my def={TheMausoleumOfKingDeshretInEffect} />
        <Card my def={CrystalShrapnel} />
        <Card my pile notInitial def={LargeBolsteringBubblebalm} />
      </State>
    );
    await c.me.card(CrystalShrapnel);
    // 弹片：出伤 & 抓牌
    // > 内联伤害时：盾弃置
    // > 盾弃置后：
    // --- 对我方出战打 1->0 草
    // --- > 内联伤害时：舍弃大水泡
    // --- > 舍弃后：
    // > 抓牌后
    // --- 大水泡不触发、ddpp 触发、赤王陵不触发
    c.expect($.union($.my.hand, $.my.pile)).toBeCount(0);
    c.expect($.my.active).toHaveVariable({ health: 6, aura: Aura.Dendro });
    c.expect($.my.typeStatus.def(PuffPopsInEffect)).toHaveVariable({ usage: 2 });
  })

});
