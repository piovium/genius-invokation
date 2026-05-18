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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { character, skill, combatStatus, card, DamageType, $, Reaction } from "@gi-tcg/core/builder";
import { CostReduction } from "../../commons";

/**
 * @id 117111
 * @name 霜林圣域
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：2
 * 【此卡含描述变量】
 */
export const FrostgroveSanctuary = combatStatus(117111)
  .since("v6.6.0")
  .variable("damageValue", 1, { visible: false })
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, self) => self.variables.damageValue)
  .on("endPhase")
  .usage(2)
  .do((c) => {
    c.damage(DamageType.Dendro, c.getVariable("damageValue"))
  })
  .done();

/**
 * @id 117112
 * @name 「苍色祷歌」
 * @description
 * 我方触发月绽放造成的伤害+1。
 * 可用次数：3
 */
export const PaleHymn = combatStatus(117112)
  .since("v6.6.0")
  .on("increaseDamage", (c, e) => e.getReaction() === Reaction.LunarBloom)
  .usage(3)
  .increaseDamage(1)
  .done();

/**
 * @id 17111
 * @name 林麓旅踏
 * @description
 * 造成1点草元素伤害。
 */
export const PeregrinationOfLinnunrata = skill(17111)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Dendro, 1)
  .done();

/**
 * @id 17112
 * @name 圣言述咏·终宵永眠
 * @description
 * 造成1点草元素伤害，生成霜林圣域。如果我方手牌中存在附着有费用降低的卡牌，则移除随机1张牌的1层费用降低效果并改为生成可造成2点伤害的霜林圣域。
 */
export const RunoDawnlessRestOfKarsikko = skill(17112)
  .type("elemental")
  .costDendro(3)
  .do((c) => {
    c.damage(DamageType.Dendro, 1);
    const reducedCards = c.queryAll($.my.hand.with($.def(CostReduction)));
    const target = c.random(reducedCards);
    if (target) {
      c.combatStatus(FrostgroveSanctuary, "my", {
        overrideVariables: {
          damageValue: 2,
        },
      })
      // 去除一层降低就是加一层提高
      c.attachCostIncrease(target);
    } else {
      c.combatStatus(FrostgroveSanctuary);
    }
  })
  .done();

/**
 * @id 17113
 * @name 圣言述咏·众心为月
 * @description
 * 赋予我方随机3张当前元素骰费用不为0的手牌费用降低。生成3层「苍色祷歌」。
 */
export const RunoAllHeartsBecomeTheBeatingMoon = skill(17113)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .do((c) => {
    const candidates = c.queryAll($.macros.myHandsNotFree);
    const targets = c.randomSubset(candidates, 3);
    for (const target of targets) {
      c.attachCostReduction(target);
    }
    c.combatStatus(PaleHymn);
  })
  .done();

/**
 * @id 17114
 * @name 月兆祝赐·千籁恩宠
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 敌方受到月绽放反应时：使我方牌组中随机1张卡牌附着费用降低。
 */
export const MoonsignBenedictionNaturesChorus = skill(17114)
  .type("passive")
  .on("reaction", (c, e) => e.type === Reaction.LunarBloom && !e.target.isMine())
  .listenToAll()
  .do((c) => {
    const target = c.random(c.queryAll($.macros.myPileNotFree));
    if (target) {
      c.attachCostReduction(target);
    }
  })
  .done();

/**
 * @id 17115
 * @name 月兆祝赐·千籁恩宠
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 敌方受到月绽放反应时：使我方牌组中随机1张卡牌附着费用降低。
 */
export const MoonsignBenedictionNaturesChorus01 = skill(17115)
  .type("passive")
  .reserve();

/**
 * @id 1711
 * @name 菈乌玛
 * @description
 * 镜中有月，月碎水中。
 */
export const Lauma = character(1711)
  .since("v6.6.0")
  .tags("dendro", "catalyst", "nodkrai")
  .health(11)
  .energy(2)
  .skills(PeregrinationOfLinnunrata, RunoDawnlessRestOfKarsikko, RunoAllHeartsBecomeTheBeatingMoon, MoonsignBenedictionNaturesChorus)
  .enableLunarReactions(Reaction.LunarBloom)
  .done();

/**
 * @id 217111
 * @name 「唇啊，为我纺出歌与吟哦」
 * @description
 * 战斗行动：我方出战角色为菈乌玛时，装备此牌。
 * 菈乌玛装备此牌后，立刻使用一次圣言述咏·终宵永眠。
 * 我方触发绽放和月绽放后：治疗我方受伤最多的角色2点。（每回合1次）
 * （牌组中包含菈乌玛，才能加入牌组）
 */
export const OLipsWeaveMeSongsAndPsalms = card(217111)
  .since("v6.6.0")
  .costDendro(3)
  .talent(Lauma)
  .on("enter")
  .useSkill(RunoDawnlessRestOfKarsikko)
  .on("dealReaction", (c, e) => ([Reaction.Bloom, Reaction.LunarBloom] as Reaction[]).includes(e.type))
  .listenToPlayer()
  .usagePerRound(1)
  .heal(2, $.macros.myMostInjured)
  .done();
