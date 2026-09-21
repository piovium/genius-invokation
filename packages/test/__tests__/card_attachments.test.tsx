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
  setup,
  State,
  Character,
  Support,
  CombatStatus,
  Equipment,
  Card,
  Attachment,
  DeclaredEnd,
  $,
} from "#test";
import {
  AnAdventureThroughTheMorningMist,
  Strategize,
  ThePowerOfResearchInEffect,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  Dunyarzad,
  Paimon,
  Seymour,
} from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  FrostmoonEnclave,
  NashaTown,
  SilvermoonHall,
  TidesealStone,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  ArtfulGrapple,
  Yumkasaurus,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  ShadowhuntShell,
  ShiningShadowhuntShellPyro,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { Bennett } from "@gi-tcg/data/internal/characters/pyro/bennett.gts";
import {
  CostIncrease,
  CostReduction,
  Empowerment,
} from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test("copy does not copy attachments of the source card", async () => {
  // 规则集：复制：生成原始卡牌的复制，不会复制目标的【附着状态效果】
  // 西摩尔入场复制对方牌库顶 1 张牌；复制品不带费用降低，原牌仍带
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Card opp pile def={Strategize}>
        <Attachment def={CostReduction} />
      </Card>
      <Card my def={Seymour} />
    </State>,
  );
  await c.me.card(Seymour);
  c.expect($.my.hand.def(Strategize)).toBeExist();
  c.expect($.my.attachment.def(CostReduction)).toNotExist();
  c.expect($.opp.attachment.def(CostReduction)).toBeExist();
});

test("transform keeps attachments (Shadowhunt Shell)", async () => {
  // 规则集：转化会保留原卡牌的附着效果状态（逐影弹）
  // 追影弹加入手牌时因出战角色为火而转化为火属性版本，费用降低仍附着其上
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={Bennett} />
      <Card my pile def={ShadowhuntShell}>
        <Attachment def={CostReduction} />
      </Card>
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect($.my.hand.def(ShiningShadowhuntShellPyro)).toBeExist();
  c.expect($.my.hand.def(ShadowhuntShell)).toNotExist();
  const shell = c.state.players[0].hands.find(
    (card) => card.definition.id === ShiningShadowhuntShellPyro,
  );
  expect(shell?.attachments.map((a) => a.definition.id)).toEqual([
    CostReduction,
  ]);
});

test("attachment kept when card is stolen from opponent's hand", async () => {
  // 规则集：【附着状态效果】在敌我手牌、牌库之间移动时保留
  // 钩物巧技窃取对方手牌后，费用降低随卡牌一起进入我方手牌
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active>
        <Equipment def={Yumkasaurus} />
      </Character>
      <Card opp def={Paimon}>
        <Attachment def={CostReduction} />
      </Card>
    </State>,
  );
  await c.me.skill(ArtfulGrapple);
  c.expect($.my.hand.def(Paimon)).toBeExist();
  c.expect($.opp.hand.def(Paimon)).toNotExist();
  const paimon = c.state.players[0].hands.find(
    (card) => card.definition.id === Paimon,
  );
  expect(paimon?.attachments.map((a) => a.definition.id)).toEqual([
    CostReduction,
  ]);
});

test("attachment kept when card moves from hand to pile", async () => {
  // 规则集：【附着状态效果】在敌我手牌、牌库之间移动时保留
  // 「穿越晨霭的冒险」把手牌置入牌库底，费用增加随卡牌进入牌库
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Card my pile def={Strategize} />
      <Card my pile def={Strategize} />
      <Card my def={AnAdventureThroughTheMorningMist} />
      <Card my def={Paimon}>
        <Attachment def={CostIncrease} />
      </Card>
    </State>,
  );
  await c.me.card(AnAdventureThroughTheMorningMist);
  c.expect($.my.pile.def(Paimon)).toBeExist();
  c.expect($.my.hand.def(Paimon)).toNotExist();
  const paimon = c.state.players[0].pile.find(
    (card) => card.definition.id === Paimon,
  );
  expect(paimon?.attachments.map((a) => a.definition.id)).toEqual([
    CostIncrease,
  ]);
});

test("attachment kept when card is drawn from pile to hand", async () => {
  // 规则集：【附着状态效果】在敌我手牌、牌库之间移动时保留
  // 抓牌把牌库中的牌移入手牌，费用降低仍附着
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Card my pile def={Paimon}>
        <Attachment def={CostReduction} />
      </Card>
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.card(Strategize);
  c.expect($.my.hand.def(Paimon)).toBeExist();
  const paimon = c.state.players[0].hands.find(
    (card) => card.definition.id === Paimon,
  );
  expect(paimon?.attachments.map((a) => a.definition.id)).toEqual([
    CostReduction,
  ]);
});

test("attachment removed after card enters play or is used", async () => {
  // 规则集：入场/使用后移除【附着状态效果】
  // 支援牌入场、事件牌使用后，其上的附着都不再存在
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Card my def={Paimon}>
        <Attachment def={CostReduction} />
      </Card>
      <Card my def={Strategize}>
        <Attachment def={CostReduction} />
      </Card>
    </State>,
  );
  await c.me.card(Paimon);
  c.expect($.my.support.def(Paimon)).toBeExist();
  c.expect($.my.attachment.def(CostReduction)).toBeCount(1);
  await c.me.card(Strategize);
  c.expect($.my.attachment.def(CostReduction)).toNotExist();
});

test("cost increase applied on cost reduction subtracts layers", async () => {
  // 规则集：费用增加/降低两者会互相抵消：已经附着另一种状态的场合，会改为扣减对方相应层数
  // 手牌已有 2 层费用降低，汐印石赋予费用增加后，变为 1 层费用降低而非新增费用增加
  const c = setup(
    <State>
      <Support opp def={TidesealStone} />
      <Card my def={Paimon}>
        <Attachment def={CostReduction} v={{ layer: 2 }} />
      </Card>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.attachment.def(CostIncrease)).toNotExist();
  c.expect($.my.attachment.def(CostReduction)).toHaveVariable({ layer: 1 });
  expect(c.state.roundNumber).toBe(2);
});

test("cost reduction applied on cost increase removes it when layers are equal", async () => {
  // 规则集：费用增加/降低两者会互相抵消：已经附着另一种状态的场合，会改为扣减对方相应层数
  // 手牌已有 1 层费用增加，霜月之坊赋予费用降低后，费用增加被扣至 0 层而移除，且不会新附着费用降低
  const c = setup(
    <State>
      <Support my def={FrostmoonEnclave} />
      <Card my def={Paimon}>
        <Attachment def={CostIncrease} />
      </Card>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  c.expect($.my.attachment.def(CostIncrease)).toNotExist();
  c.expect($.my.attachment.def(CostReduction)).toNotExist();
});

test("empowered card is not targeted by empowerment again", async () => {
  // 规则集：已赋能卡牌不会成为赋能的目标
  // 那夏镇结束阶段只赋能未赋能的那张牌，银月之庭仅计 1 点
  const c = setup(
    <State>
      <Support my def={NashaTown} />
      <Support my def={SilvermoonHall} />
      <Card my def={Paimon}>
        <Attachment def={Empowerment} />
      </Card>
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.attachment.def(Empowerment)).toBeCount(2);
  c.expect($.my.support.def(SilvermoonHall)).toHaveVariable({ count: 1 });
});

test("all cards empowered: Nasha Town does not trigger Silvermoon Hall", async () => {
  // 规则集：例如，所有卡牌已赋能，结束阶段那夏镇不能触发银月之庭的效果
  // 手牌全部已赋能，结束阶段那夏镇无目标，银月之庭计数保持 0
  const c = setup(
    <State>
      <Support my def={NashaTown} />
      <Support my def={SilvermoonHall} />
      <Card my def={Paimon}>
        <Attachment def={Empowerment} />
      </Card>
      <Card my def={Paimon}>
        <Attachment def={Empowerment} />
      </Card>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.my.attachment.def(Empowerment)).toBeCount(2);
  c.expect($.my.support.def(SilvermoonHall)).toHaveVariable({ count: 0 });
});

test("current dice cost counts attachments", async () => {
  // 规则集：当前元素骰费用仅计算【附着效果状态】计算后的元素骰费用
  // 派蒙原费 3，附着费用降低后当前费用为 2，打出时不触发「科研的动力」（≥3）
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <CombatStatus my def={ThePowerOfResearchInEffect} usage={3} />
      <Card my def={Paimon}>
        <Attachment def={CostReduction} />
      </Card>
    </State>,
  );
  await c.me.card(Paimon);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.combatStatus.def(ThePowerOfResearchInEffect)).toHaveVariable({
    usage: 3,
  });
});

test("play-time cost deduction does not change current dice cost", async () => {
  // 规则集：【打出时】费用降低，不会改变【当前元素骰费用】，仅在【打出时】才生效
  // 迪娜泽黛使派蒙打出时少花 1 骰，但当前费用仍为 3，触发「科研的动力」生成 1 骰
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Support my def={Dunyarzad} />
      <CombatStatus my def={ThePowerOfResearchInEffect} usage={3} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.card(Paimon);
  // 8 - 2（实付）+ 1（生成）
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect($.my.combatStatus.def(ThePowerOfResearchInEffect)).toHaveVariable({
    usage: 2,
  });
});
