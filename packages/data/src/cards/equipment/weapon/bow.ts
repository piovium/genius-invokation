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

import { DiceType, card, combatStatus, status } from "@gi-tcg/core/builder";

/**
 * @id 311201
 * @name 鸦羽弓
 * @description
 * 角色造成的伤害+1。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const RavenBow = card(311201)
  .since("v3.3.0")
  .costSame(2)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311202
 * @name 祭礼弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const SacrificialBow = card(311202)
  .since("v3.3.0")
  .costSame(3)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .do((c) => {
    c.generateDice(c.self.master.element(), 1);
  })
  .done();

/**
 * @id 311203
 * @name 天空之翼
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardHarp = card(311203)
  .since("v3.3.0")
  .costSame(3)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usagePerRound(1)
  .increaseDamage(1)
  .done();

/**
 * @id 311204
 * @name 阿莫斯之弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用原本元素骰费用+充能费用至少为5的技能时，伤害额外+2。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const AmosBow = card(311204)
  .since("v3.7.0")
  .costSame(3)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.via.definition.initiativeSkillConfig!.computed$costSize >= 5)
  .usagePerRound(1)
  .increaseDamage(2)
  .done();

/**
 * @id 301102
 * @name 千年的大乐章·别离之歌
 * @description
 * 我方角色造成的伤害+1。
 * 持续回合：2
 */
const MillennialMovementFarewellSong = combatStatus(301102)
  .duration(2)
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311205
 * @name 终末嗟叹之诗
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素爆发」后：生成「千年的大乐章·别离之歌」。（我方角色造成的伤害+1，持续回合：2）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const ElegyForTheEnd = card(311205)
  .since("v3.7.0")
  .costSame(3)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("burst"))
  .combatStatus(MillennialMovementFarewellSong)
  .done();

/**
 * @id 301103
 * @name 王下近侍（生效中）
 * @description
 * 在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时：少花费2个元素骰。
 */
export const KingsSquireStatus = status(301103)
  .oneDuration()
  .once("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "elemental"))
  .deductOmniCost(2)
  .done();

/**
 * @id 311206
 * @name 王下近侍
 * @description
 * 角色造成的伤害+1。
 * 入场时：在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时，少花费2个元素骰。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const KingsSquire = card(311206)
  .since("v4.0.0")
  .costSame(3)
  .weapon("bow")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .characterStatus(KingsSquireStatus, "@master")
  .done();

/**
 * @id 311207
 * @name 竭泽
 * @description
 * 我方打出名称不存在于本局最初牌组中的行动牌后：此牌累积1点「渔猎」。（最多累积2点，每回合最多累积2点）
 * 角色使用技能时：如果此牌已有「渔猎」，则消耗所有「渔猎」，使此技能伤害+1，并且每消耗1点「渔猎」就抓1张牌。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const EndOfTheLine = card(311207)
  .since("v4.7.0")
  .costSame(2)
  .weapon("bow")
  .variable("fishing", 0)
  .variable("additivePerRound", 0, { visible: false })
  .on("roundEnd")
  .setVariable("additivePerRound", 0)
  .on("playCard", (c, e) => !c.isInInitialPile(e.card))
  .do((c) => {
    if (c.getVariable("additivePerRound") < 2) {
      c.addVariableWithMax("fishing", 1, 2);
      c.addVariable("additivePerRound", 1);
    }
  })
  .on("increaseSkillDamage")
  .do((c, e) => {
    const fishing = c.getVariable("fishing");
    if (fishing > 0) {
      e.increaseDamage(1)
      c.drawCards(fishing);
      c.setVariable("fishing", 0);
    }
  })
  .done();

/**
 * @id 133092
 * @name 王下近待
 * @description
 * 角色造成的伤害+1。
 * 入场时：在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时，少花费2个元素骰。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const KingsValet = card(133092) // 骗骗花
  .reserve();

/**
 * @id 133093
 * @name 阿斯莫之弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用原本元素骰费用+充能费用至少为5的技能时，伤害额外+2。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const AsmosBow = card(133093) // 骗骗花
  .reserve();

/**
 * @id 311208
 * @name 若水
 * @description
 * 所附属角色生命值至少为11时：造成的伤害+2。
 * 入场时：所附属角色获得1点最大生命值。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const AquaSimulacra = card(311208)
  .since("v6.0.0")
  .costSame(2)
  .weapon("bow")
  .on("increaseSkillDamage", (c) => c.self.master.health >= 11)
  .increaseDamage(2)
  .on("enter")
  .increaseMaxHealth(1, "@master")
  .done();

/**
 * @id 311209
 * @name 罗网勾针
 * @description
 * 角色使用「元素爆发」造成的伤害+2。
 * 我方引发元素反应时：累计1层矫捷无影，当矫捷无影不低于2层时，消耗2层矫捷无影使所附属角色获得1点充能。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
export const SnareHook = card(311209)
  .since("v6.5.0")
  .costVoid(2)
  .weapon("bow")
  .variable("agile", 0)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(2)
  .on("dealReaction")
  .listenToPlayer()
  .do((c) => {
    c.addVariable("agile", 1);
    if (c.getVariable("agile") >= 2 && c.self.master.energy < c.self.master.maxEnergy) {
      c.addVariable("agile", -2);
      c.gainEnergy(1, c.self.master);
    }
  })
  .done();
