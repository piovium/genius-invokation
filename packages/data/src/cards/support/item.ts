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

import { DamageType, DiceType, card, combatStatus, extension } from "@gi-tcg/core/builder";

/**
 * @id 323001
 * @name 参量质变仪
 * @description
 * 双方角色使用技能后：如果造成了元素伤害，此牌累积1个「质变进度」。如果此牌已累积3个「质变进度」，则弃置此牌并生成3个不同的基础元素骰。
 */
export const ParametricTransformer = card(323001)
  .since("v3.3.0")
  .costVoid(2)
  .support("item")
  .variable("progress", 0)
  .on("useSkill", (c) =>
    c.hasPhaseDamage("all", (e) => e.type !== DamageType.Piercing && e.type !== DamageType.Physical))
  .listenToAll()
  .do((c) => {
    c.addVariable("progress", 1);
    if (c.getVariable("progress") >= 3) {
      c.generateDice("randomElement", 3);
      c.dispose();
      return;
    }
  })
  .done();

/**
 * @id 323002
 * @name 便携营养袋
 * @description
 * 入场时：从牌组中随机抽取1张「料理」事件。
 * 我方打出「料理」事件牌时：从牌组中随机抽取1张「料理」事件牌。（每回合1次）
 */
export const Nre = card(323002)
  .since("v3.3.0")
  .costSame(1)
  .support("item")
  .on("enter")
  .drawCards(1, { withTag: "food" })
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(1)
  .drawCards(1, { withTag: "food" })
  .done();

/**
 * @id 302303
 * @name 红羽团扇（生效中）
 * @description
 * 本回合中，我方执行的下次「切换角色」行动视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。
 */
export const RedFeatherFanStatus = combatStatus(302303)
  .oneDuration()
  .variable("triggered", 0, { visible: false })
  .on("deductOmniDiceSwitch")
  .deductOmniCost(1)
  .setVariable("triggered", 1)
  .on("beforeFastSwitch")
  .setFastAction()
  .setVariable("triggered", 1)
  .on("switchActive", (c) => c.getVariable("triggered"))
  .dispose()
  .done();

/**
 * @id 323003
 * @name 红羽团扇
 * @description
 * 我方切换角色后：本回合中，我方执行的下次「切换角色」行动视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。（每回合1次）
 */
export const RedFeatherFan = card(323003)
  .since("v3.7.0")
  .costSame(2)
  .support("item")
  .on("switchActive")
  .usagePerRound(1)
  .combatStatus(RedFeatherFanStatus)
  .done();

/**
 * @id 323004
 * @name 寻宝仙灵
 * @description
 * 我方角色使用技能后：此牌累积1个「寻宝线索」。如果此牌已累积3个「寻宝线索」，则弃置此牌并抓3张牌。
 */
export const TreasureseekingSeelie = card(323004)
  .since("v3.7.0")
  .costSame(1)
  .support("item")
  .variable("clue", 0)
  .on("useSkill")
  .do((c) => {
    c.addVariable("clue", 1);
    if (c.getVariable("clue") >= 3) {
      c.drawCards(3);
      c.dispose();
    }
  })
  .done();

/**
 * @id 323005
 * @name 化种匣
 * @description
 * 我方打出当前元素骰费用至少为2的支援牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
export const SeedDispensary = card(323005)
  .since("v4.3.0")
  .support("item")
  .on("deductOmniDiceCard", (c, e) => e.currentDiceCostSize() >= 2 && e.action.skill.caller.definition.type === "support")
  .usagePerRound(1)
  .usage(2)
  .deductOmniCost(1)
  .done();

const CardPlayedExtension = extension(323006, { played: "pair<number[]>" })
  .initialState({ played: [[], []] })
  .description("记录本场对局中双方曾经打出过的行动牌")
  .mutateWhen("onAction", (st, e) => {
    if (e.isPlayCard()) {
      const defId = e.action.skill.caller.definition.id;
      if (!st.played[e.who].includes(defId)) {
        st.played[e.who].push(defId);
      }
    }
  })
  .done();

/**
 * @id 323006
 * @name 留念镜
 * @description
 * 我方打出「武器」/「圣遗物」/「场地」/「伙伴」手牌时：如果本场对局中我方曾经打出过所打出牌的同名卡牌，则少花费2个元素骰。（每回合1次）
 * 可用次数：2
 */
export const MementoLens = card(323006)
  .since("v4.3.0")
  .costSame(1)
  .support("item")
  .associateExtension(CardPlayedExtension)
  .variable("totalUsage", 2)
  .on("deductOmniDiceCard", (c, e) => {
    if (!e.hasOneOfCardTag("weapon", "artifact", "place", "ally")) {
      return false;
    }
    return c.getExtensionState().played[c.self.who].includes(e.action.skill.caller.definition.id);
  })
  .usagePerRound(1)
  .do((c, e) => {
    e.deductOmniCost(2);
    c.addVariable("totalUsage", -1);
    if (c.getVariable("totalUsage") <= 0) {
      c.dispose();
    }
  })
  .done();

/**
 * @id 323007
 * @name 流明石触媒
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
export const LumenstoneAdjuvant = card(323007)
  .since("v4.5.0")
  .costVoid(3)
  .support("item")
  .variable("playedCard", 0, { visible: false })
  .replaceDescription("[GCG_TOKEN_COUNTER]", (st, self) => self.variables.playedCard)
  .on("playCard", (c, e) => e.card.id !== c.self.id)
  .addVariable("playedCard", 1)
  .on("playCard", (c, e) => c.getVariable("playedCard") === 3)
  .usagePerRound(1)
  .usage(3)
  .drawCards(1)
  .generateDice(DiceType.Omni, 1)
  .on("actionPhase")
  .setVariable("playedCard", 0)
  .done();

/**
 * @id 323008
 * @name 苦舍桓
 * @description
 * 行动阶段开始时：舍弃最多2张当前元素骰费用最高的手牌，每舍弃1张，此牌就累积1点「记忆和梦」。（最多2点）
 * 我方角色使用技能时：如果我方本回合未打出过行动牌，则消耗1点「记忆和梦」，以使此技能少花费1个元素骰。
 */
export const Kusava = card(323008)
  .since("v4.7.0")
  .costSame(1)
  .support("item")
  .variable("memory", 0)
  .variable("cardPlayed", 0, { visible: false })
  .on("actionPhase")
  .do((c) => {
    const memory = c.getVariable("memory");
    if (memory < 2) {
      const disposed = c.disposeMaxCostHands(2 - memory);
      const count = disposed.length;
      c.addVariableWithMax("memory", count, 2);
    }
    c.setVariable("cardPlayed", 0);
  })
  .on("playCard")
  .setVariable("cardPlayed", 1)
  .on("deductOmniDiceSkill", (c, e) => !c.getVariable("cardPlayed") && c.getVariable("memory") > 0)
  .deductOmniCost(1)
  .addVariable("memory", -1)
  .done();

/**
 * @id 133096
 * @name 流明媒触石
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
export const Lumenarystone = card(133096) // 骗骗花
  .reserve();
