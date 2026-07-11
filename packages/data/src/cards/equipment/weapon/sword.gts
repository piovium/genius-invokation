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

import { DiceType, card, status } from "@gi-tcg/core/builder";

/**
 * @id 311501
 * @name 旅行剑
 * @description
 * 角色造成的伤害+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const TravelersHandySword = card(311501)
  .since("v3.3.0")
  .costSame(2)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311502
 * @name 祭礼剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SacrificialSword = card(311502)
  .since("v3.3.0")
  .costSame(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .do((c) => {
    c.generateDice(c.self.master.element(), 1);
  })
  .done();

/**
 * @id 311503
 * @name 风鹰剑
 * @description
 * 角色造成的伤害+1。
 * 对方使用技能后：如果所附属角色为「出战角色」，则治疗该角色1点。（每回合至多2次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const AquilaFavonia = card(311503)
  .since("v3.3.0")
  .costSame(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => !e.skill.caller.isMine() && c.self.master.isActive())
  .listenToAll()
  .usagePerRound(2)
  .heal(1, "@master")
  .done();

/**
 * @id 311504
 * @name 天空之刃
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardBlade = card(311504)
  .since("v3.7.0")
  .costSame(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usagePerRound(1)
  .increaseDamage(1)
  .done();

/**
 * @id 311505
 * @name 西风剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：角色额外获得1点充能。（每回合1次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const FavoniusSword = card(311505)
  .since("v3.6.0")
  .costSame(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .gainEnergy(1, "@master")
  .done();

/**
 * @id 311506
 * @name 裁叶萃光
 * @description
 * 角色造成的伤害+1。
 * 角色使用「普通攻击」后：生成1个随机基础元素骰。（每回合最多触发2次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const LightOfFoliarIncision = card(311506)
  .since("v4.3.0")
  .costSame(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usagePerRound(2)
  .generateDice("randomElement", 1)
  .done();

/**
 * @id 301107
 * @name 原木刀（生效中）
 * @description
 * 角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 */
export const SapwoodBladeStatus = status(301107)
  .oneDuration()
  .once("useSkill", (c, e) => e.isSkillType("normal"))
  .do((c) => {
    c.generateDice(c.self.master.element(), 2);
  })
  .done();

/**
 * @id 311507
 * @name 原木刀
 * @description
 * 角色造成的伤害+1。
 * 入场时：所附属角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SapwoodBlade = card(311507)
  .since("v4.4.0")
  .costVoid(3)
  .weapon("sword")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .characterStatus(SapwoodBladeStatus, "@master")
  .done();

/**
 * @id 311508
 * @name 静水流涌之辉
 * @description
 * 我方角色受到伤害或治疗后：此牌累积1点「湖光」。
 * 角色进行普通攻击时：如果已有12点「湖光」，则消耗12点，使此技能少花费2个无色元素且造成的伤害+1，并且治疗所附属角色1点（每回合1次）。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SplendorOfTranquilWaters = card(311508)
  .since("v4.7.0")
  .costSame(2)
  .weapon("sword")
  .variable("lake", 0)
  .on("damagedOrHealed")
  .addVariable("lake", 1)
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal") && c.getVariable("lake") >= 12)
  .usagePerRound(1)
  .deductVoidCost(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal") && c.getVariable("lake") >= 12)
  .usagePerRound(1)
  .addVariable("lake", -12)
  .increaseDamage(1)
  .heal(1, "@master")
  .done();

/**
 * @id 133089
 * @name 天空之刀
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardSword = card(133089) // 骗骗花
  .reserve();

/**
 * @id 311509
 * @name 船坞长剑
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「团结」。（每回合1次）
 * 角色造成伤害时：如果此牌已有「团结」，则消耗所有「团结」，使此伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const TheDockhandsAssistant = card(311509)
  .since("v5.7.0")
  .costSame(2)
  .weapon("sword")
  .tags("barrier")
  .variable("barrierUsage", 0) // no io hint for now
  .variable("solidarity", 0)
  .on("decreaseDamaged", (c, e) => c.player.hands.length > 0)
  .usagePerRound(1)
  .disposeMaxCostHands(1)
  .decreaseDamage(1)
  .addVariable("solidarity", 1)
  .on("increaseSkillDamage", (c) => c.getVariable("solidarity") > 0)
  .do((c, e) => {
    e.increaseDamage(1);
    c.drawCards(c.getVariable("solidarity"));
    c.setVariable("solidarity", 0);
  })
  .done();
