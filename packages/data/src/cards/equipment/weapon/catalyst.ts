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

import { DamageType, DiceType, card, status } from "@gi-tcg/core/builder";
import { BondOfLife } from "../../../commons";

/**
 * @id 311101
 * @name 魔导绪论
 * @description
 * 角色造成的伤害+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const MagicGuide = card(311101)
  .since("v3.3.0")
  .costSame(2)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311102
 * @name 祭礼残章
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const SacrificialFragments = card(311102)
  .since("v3.3.0")
  .costSame(3)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .do((c) => {
    c.generateDice(c.self.master.element(), 1);
  })
  .done();

/**
 * @id 311103
 * @name 天空之卷
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardAtlas = card(311103)
  .since("v3.3.0")
  .costSame(3)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usagePerRound(1)
  .increaseDamage(1)
  .done();

/**
 * @id 311104
 * @name 千夜浮梦
 * @description
 * 角色造成的伤害+1。
 * 我方角色引发元素反应时：造成的伤害+1。（每回合最多触发2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const AThousandFloatingDreams = card(311104)
  .since("v3.7.0")
  .costSame(3)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.getReaction())
  .listenToPlayer()
  .usagePerRound(2)
  .increaseDamage(1)
  .done();

/**
 * @id 311105
 * @name 盈满之实
 * @description
 * 角色造成的伤害+1。
 * 入场时：抓2张牌。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const FruitOfFulfillment = card(311105)
  .since("v3.8.0")
  .costVoid(3)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .drawCards(2)
  .done();

/**
 * @id 311106
 * @name 四风原典
 * @description
 * 此牌每有1点「伤害加成」，角色造成的伤害+1。
 * 结束阶段：此牌累积1点「伤害加成」。（最多累积到2点）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const LostPrayerToTheSacredWinds = card(311106)
  .since("v4.3.0")
  .costSame(3)
  .weapon("catalyst")
  .variable("extraDamage", 0)
  .on("increaseSkillDamage")
  .do((c, e) => {
    e.increaseDamage(c.getVariable("extraDamage"));
  })
  .on("endPhase")
  .addVariableWithMax("extraDamage", 1, 2)
  .done();

/**
 * @id 311107
 * @name 图莱杜拉的回忆
 * @description
 * 角色造成的伤害+1。
 * 角色进行重击时：少花费1个无色元素。（每回合最多触发2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const TulaytullahsRemembrance = card(311107)
  .since("v4.3.0")
  .costSame(3)
  .weapon("catalyst")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("deductVoidDiceSkill", (c, e) => e.isChargedAttack())
  .usagePerRound(2)
  .deductVoidCost(1)
  .done();

/**
 * @id 301108
 * @name 万世的浪涛
 * @description
 * 角色在本回合中，下次造成的伤害+2。
 */
export const AeonWave = status(301108)
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(2)
  .done();

/**
 * @id 311108
 * @name 万世流涌大典
 * @description
 * 角色造成的伤害+1。
 * 角色受到伤害或治疗后：如果本回合已受到伤害或治疗累计2次，则角色本回合中下次造成的伤害+2。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const TomeOfTheEternalFlow = card(311108)
  .since("v4.5.0")
  .costSame(3)
  .weapon("catalyst")
  .variable("count", 0)
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("damagedOrHealed")
  .addVariable("count", 1)
  .on("damagedOrHealed", (c) => c.getVariable("count") === 2)
  .usagePerRound(1)
  .characterStatus(AeonWave, "@master")
  .on("roundEnd")
  .setVariable("count", 0)
  .done();

/**
 * @id 301111
 * @name 金流监督（生效中）
 * @description
 * 本回合中，角色下一次「普通攻击」少花费1个无色元素，且造成的伤害+1。
 */
export const CashflowSupervisionInEffect = status(301111)
  .oneDuration()
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(1)
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();

/**
 * @id 311109
 * @name 金流监督
 * @description
 * 角色受到伤害或治疗后：使角色本回合中下一次「普通攻击」少花费1个无色元素，且造成的伤害+1。（每回合至多2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const CashflowSupervision = card(311109)
  .since("v4.7.0")
  .costSame(2)
  .weapon("catalyst")
  .on("damagedOrHealed")
  .usagePerRound(2)
  .characterStatus(CashflowSupervisionInEffect, "@master")
  .done();

/**
 * @id 133099
 * @name 万世涌流大典
 * @description
 * 角色造成的伤害+1。
 * 角色受到伤害或治疗后：如果本回合已受到伤害或治疗累计2次，则角色本回合中下次造成的伤害+2。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const TombOfTheEternalFlow = card(133099) // 骗骗花
  .reserve();

/**
 * @id 301112
 * @name 纯水流华（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
export const FlowingPurityInEffect = status(301112)
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311110
 * @name 纯水流华
 * @description
 * 入场时和回合结束时：角色附属1层生命之契。
 * 双方选择行动前：所附属角色如果未附属生命之契，则生成1个随机基础元素骰，并且角色下次造成的伤害+1。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const FlowingPurity = card(311110)
  .since("v5.2.0")
  .costSame(1)
  .weapon("catalyst")
  .on("enter")
  .characterStatus(BondOfLife, "@master")
  .on("endPhase") // 实为结束阶段时
  .characterStatus(BondOfLife, "@master")
  .on("beforeAction", (c) => !c.self.master.hasStatus(BondOfLife))
  .listenToAll()
  .usagePerRound(1)
  .generateDice("randomElement", 1)
  .characterStatus(FlowingPurityInEffect, "@master")
  .done();

/**
 * @id 311111
 * @name 不灭月华
 * @description
 * 所附属角色生命值至少为11时：造成的伤害+2。
 * 入场时：所附属角色获得1点最大生命值。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const EverlastingMoonglow = card(311111)
  .since("v6.1.0")
  .costSame(2)
  .weapon("catalyst")
  .on("increaseSkillDamage", (c) => c.self.master.health >= 11)
  .increaseDamage(2)
  .on("enter")
  .increaseMaxHealth(1, "@master")
  .done();

/**
 * @id 301113
 * @name 祭星者之望（生效中）
 * @description
 * 每层使所附属角色下次造成的伤害+1。（可叠加，最多叠加到2）
 */
export const StarcallersWatchInEffect = status(301113)
  .variableCanAppend("increaseDmg", 1, 2)
  .once("increaseSkillDamage")
  .do((c, e) => {
    e.increaseDamage(c.getVariable("increaseDmg"));
  })
  .done();

/**
 * @id 311112
 * @name 祭星者之望
 * @description
 * 我方每回合首次打出名称不属于初始牌组的牌时：少花费1个元素骰，所附属角色下次造成的伤害+1。（可叠加，最多叠加到2）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
export const StarcallersWatch = card(311112)
  .since("v6.3.0")
  .costSame(1)
  .weapon("catalyst")
  .on("deductOmniDiceCard", (c, e) => !c.isInInitialPile(e.action.skill.caller))
  .usagePerRound(1)
  .deductOmniCost(1)
  .characterStatus(StarcallersWatchInEffect, "@master")
  .done();
