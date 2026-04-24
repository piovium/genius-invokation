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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import type { EntityDefinition } from "@gi-tcg/core";
import { card, combatStatus, DamageType, extension, status, StatusHandle, $ } from "@gi-tcg/core/builder";

/**
 * @id 313001
 * @name 异色猎刀鳐
 * @description
 * 特技：原海水刃
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130011: 原海水刃] (2*Void) 造成2点物理伤害。
 */
export const XenochromaticHuntersRay = card(313001)
  .since("v5.0.0")
  .technique()
  .provideSkill(3130011)
  .costVoid(2)
  .usage(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 313002
 * @name 匿叶龙
 * @description
 * 特技：钩物巧技
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130021: 钩物巧技] (2*Same) 造成1点物理伤害，窃取1张当前元素骰费用最高的对方手牌，然后对手抓1张牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 * [3130022: ] ()
 */
export const Yumkasaurus = card(313002)
  .since("v5.0.0")
  .costSame(1)
  .technique()
  .on("deductOmniDiceTechnique", (c, e) => e.action.skill.definition.id === 3130021 && c.player.hands.length <= 2)
  .deductOmniCost(1)
  .endOn()
  .provideSkill(3130021)
  .costSame(2)
  .usage(2)
  .damage(DamageType.Physical, 1)
  .do((c) => {
    const [handCard] = c.maxCostHands(1, { who: "opp" });
    if (handCard) {
      c.stealHandCard(handCard);
    }
    c.drawCards(1, { who: "opp" });
  })
  .done();

/**
 * @id 313003
 * @name 鳍游龙
 * @description
 * 特技：游隙灵道
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130031: 游隙灵道] (1*Same) 选择一个我方「召唤物」，立刻触发其「结束阶段」效果。（每回合最多使用1次）
 * [3130032: ] ()
 */
export const Koholasaurus = card(313003)
  .since("v5.0.0")
  .costSame(2)
  .technique()
  .provideSkill(3130031)
  .costSame(1)
  .usage(2)
  .usagePerRound(1)
  .addTarget("my summon")
  .do((c, e) => {
    c.triggerEndPhaseSkill(e.targets[0])
  })
  .done();

/**
 * @id 301301
 * @name 掘进的收获
 * @description
 * 提供2点护盾，保护所附属角色。
 */
const DiggingDownToPaydirt = status(301301)
  .shield(2)
  .done();

/**
 * @id 313004
 * @name 嵴锋龙
 * @description
 * 特技：掘进突击
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130041: 掘进突击] (2*Void) 抓2张牌。然后，如果手牌中存在名称不存在于本局最初牌组中的牌，则提供2点护盾保护所附属角色。
 */
export const Tepetlisaurus = card(313004)
  .since("v5.1.0")
  .costSame(2)
  .technique()
  .provideSkill(3130041)
  .usage(2)
  .costVoid(2)
  .drawCards(2)
  .if((c) => {
    return c.player.hands.some((card) => !c.isInInitialPile(card));
  })
  .characterStatus(DiggingDownToPaydirt, "@master")
  .done();

/**
 * @id 313005
 * @name 暝视龙
 * @description
 * 特技：灵性援护
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130051: 灵性援护] (1*Same) 从「场地」「道具」「料理」中挑选1张加入手牌，并且治疗附属角色1点。
 */
export const Iktomisaurus = card(313005)
  .since("v5.2.0")
  .costSame(2)
  .technique()
  .provideSkill(3130051)
  .usage(2)
  .costSame(1)
  .heal(1, "@master")
  .do((c) => {
    const tags = ["place", "item", "food"] as const;
    const candidates: EntityDefinition[] = [];
    for (const tag of tags) {
      const def = c.random(c.allCardDefinitions(tag));
      candidates.push(def);
    }
    c.selectAndCreateHandCard(candidates);
  })
  .done();

/**
 * @id 301302
 * @name 目标
 * @description
 * 敌方附属有绒翼龙的角色切换至前台时：自身减少1层效果。
 */
export const Target: StatusHandle = status(301302)
  .variableCanAppend("effect", 1, Infinity)
  // 目标本身实际并无效果
  // .on("switchActive", (c, e) => {
  //   const switchTo = e.switchInfo.to;
  //   return !switchTo.isMine() && switchTo.hasEquipment(Qucusaurus);
  // })
  // .listenToAll()
  // .do((c) => {
  //   c.addVariable("effect", -1);
  //   if (c.getVariable("effect") <= 0) {
  //     c.dispose();
  //   }
  // })
  .done();

/**
 * @id 313006
 * @name 绒翼龙
 * @description
 * 入场时：敌方出战角色附属目标。
 * 附属角色切换为出战角色，且敌方出战角色附属目标时：如可能，舍弃1张当前元素骰费用最高的手牌，将此次切换视为「快速行动」而非「战斗行动」，少花费1个元素骰，并移除对方所有角色的目标。
 * 特技：迅疾滑翔
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130061: ] ()
 * [3130062: ] ()
 * [3130063: 迅疾滑翔] (1*Same) 切换到下一名角色，敌方出战角色附属目标。
 */
export const Qucusaurus = card(313006)
  .since("v5.3.0")
  .costSame(1)
  .technique()
  .variable("deductDiceTriggered", 0, { visible: false })
  .on("enter")
  .characterStatus(Target, $.opp.active)
  .on("deductOmniDiceSwitch", (c, e) =>          // 绒翼龙只在可以减费时生效
    c.query($.opp.active.has($.def(Target))) &&  // 敌方出战角色附属目标
    e.action.to.id === c.self.master.id &&       // 附属角色切换为出战角色
    c.player.hands.length > 0)                   // 有手牌（“如可能，舍弃”）
  .do((c, e) => {
    c.setVariable("deductDiceTriggered", 1);
    // 预计算时不触发弃牌
    if (c.skillInfo.environment !== "precalculate") {
      c.disposeMaxCostHands(1);
    }
    for (const st of c.queryAll($.opp.typeStatus.def(Target))) {
      st.dispose();
    }
    e.deductOmniCost(1);
  })
  .on("beforeFastSwitch", (c) => c.getVariable("deductDiceTriggered"))  // 将此次切换视为「快速行动」
  .setVariable("deductDiceTriggered", 0)
  .setFastAction()
  .endOn()
  .provideSkill(3130063)
  .usage(2)
  .costSame(1)
  .switchActive("my next")
  .characterStatus(Target, "opp active")
  .done();

/**
 * @id 301304
 * @name 浪船
 * @description
 * 提供2点护盾，保护所附属角色。
 */
const WaveriderShield = status(301304)
  .shield(2)
  .done();

/**
 * @id 313007
 * @name 浪船
 * @description
 * 入场时：为我方附属角色提供2点护盾。
 * 附属角色切换至后台时：此牌可用次数+1。
 * 特技：浪船·迅击炮
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130071: 浪船·迅击炮] (1*Same) 造成2点物理伤害。
 * [3130072: ] () 附属角色切换至后台时，此牌可用次数+1。
 * [3130073: ] () 使用时，生成2点护盾
 */
export const Waverider = card(313007)
  .since("v5.5.0")
  .costSame(5)
  .technique()
  .provideSkill(3130071)
  .usage(2)
  .costSame(1)
  .damage(DamageType.Physical, 2)
  .endProvide()
  .on("enter")
  .characterStatus(WaveriderShield, "@master")
  .on("switchActive", (c, e) => e.switchInfo.from?.id === c.self.master.id)
  .addVariable("usage", 1)
  .done();

/**
 * @id 301305
 * @name 突角龙（生效中）
 * @description
 * 本角色将在下次行动时，直接使用技能：普通攻击。
 */
export const TatankasaurusStatus02 = status(301305)
  .prepare("normal", { hintCount: 1 })
  .done();

/**
 * @id 301303
 * @name 突角龙（生效中）
 * @description
 * 本角色将在下次行动时，直接使用技能：普通攻击。
 */
export const TatankasaurusStatus01 = status(301303)
  .prepare("normal", {
    hintCount: 2,
    nextStatus: TatankasaurusStatus02,
  })
  .done();

/**
 * @id 313008
 * @name 突角龙
 * @description
 * 特技：昂扬状态
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130081: 昂扬状态] (3*Void) 附属角色准备技能2次「普通攻击」。
 */
export const Tatankasaurus = card(313008)
  .since("v5.6.0")
  .costVoid(4)
  .technique()
  .provideSkill(3130081)
  .usage(2)
  .costVoid(3)
  .characterStatus(TatankasaurusStatus01, "@master")
  .done();

export const TechniquesPlayedCountExtension = extension(301306, { techniquesPlayedCount: "pair<number>" })
  .initialState({ techniquesPlayedCount: [0, 0] })
  .description("记录本场对局中双方打出特技牌的数量")
  .mutateWhen("onPlayCard", (c, e) => {
    if (e.card.definition.tags.includes("technique")) {
      c.techniquesPlayedCount[e.who]++;
    }
  })
  .done();

/**
 * @id 301306
 * @name 呀——
 * @description
 * 我方打出特技牌时：若本局游戏我方累计打出了6张特技牌，我方前台获得3点护盾，然后造成3点物理伤害。
 */
export const Yikes = combatStatus(301306)
  .associateExtension(TechniquesPlayedCountExtension)
  .variable("techniquesPlayedCount", 0)
  .defineSnippet("checkCount", (c) => {
    if (c.getVariable("techniquesPlayedCount") >= 6){
      c.characterStatus(SaurianBuddyCheers, "my active")
      c.damage(DamageType.Physical, 3)
      c.dispose();
    }
  })
  .on("enter")
  .do((c) => {
    c.setVariable("techniquesPlayedCount", c.getExtensionState().techniquesPlayedCount[c.self.who]);
  })
  .callSnippet("checkCount")
  .on("playCard", (c, e) => e.card.definition.tags.includes("technique"))
  .addVariable("techniquesPlayedCount", 1)
  .callSnippet("checkCount")
  .done();

/**
 * @id 301307
 * @name 龙伙伴的声援！
 * @description
 * 提供3点护盾，保护所附属角色。
 */
export const SaurianBuddyCheers = status(301307)
  .shield(3)
  .done();

/**
 * @id 301308
 * @name 龙伙伴的鼓舞！
 * @description
 * 我方下次打出特技牌费用-2。
 */
export const SaurianMoralSupport = combatStatus(301308)
  .once("deductOmniDiceCard", (c, e) => e.hasCardTag("technique"))
  .deductOmniCost(2)
  .done();

/**
 * @id 313009
 * @name 呀！呀！
 * @description
 * 此卡牌入场时：创建呀——！。（我方打出特技牌时：若本局游戏我方累计打出了6张特技牌，我方出战角色获得3点护盾，然后造成3点物理伤害）
 * 特技：呀！呀！
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130091: ] ()
 * [3130092: 呀！呀！] (2*Void) 从牌库中抓1张特技牌，下次我方打出特技牌少花费2个元素骰。
 */
export const RawrRawr = card(313009)
  .since("v5.7.0")
  .costSame(2)
  .technique()
  .on("enter")
  .combatStatus(Yikes)
  .endOn()
  .provideSkill(3130092)
  .usage(2)
  .costVoid(2)
  .drawCards(1, { withTag: "technique" })
  .combatStatus(SaurianMoralSupport)
  .done();

/**
 * @id 313010
 * @name 膨膨兽
 * @description
 * 特技：膨膨音波
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130101: 膨膨音波] (1*Same) 切换到下一个角色，从牌组里随机抓1张当前元素骰费用最高或最低的牌。
 */
export const Blubberbeast = card(313010)
  .since("v6.5.0")
  .costSame(1)
  .technique()
  .provideSkill(3130101)
  .usage(2)
  .costSame(1)
  .abortPreview()
  .do((c) => {
    c.switchActive($.my.next);
    const takeMax = c.random([true, false]);
    const pile = Object.groupBy(c.player.pile, (c) => c.diceCost());
    // ES6 保证从小到大排序，无需再 sort
    const costs = Object.keys(pile).map(Number);
    if (costs.length === 0) {
      return;
    }
    const targetCost = takeMax ? costs[costs.length - 1] : costs[0];
    const candidates = pile[targetCost]!;
    const targetCard = c.random(candidates);
    if (targetCard) {
      c.drawCards(targetCard);
    }
  })
  .done();
