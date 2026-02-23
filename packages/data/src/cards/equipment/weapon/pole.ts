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
 * @id 311401
 * @name 白缨枪
 * @description
 * 角色造成的伤害+1。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const WhiteTassel = card(311401)
  .since("v3.3.0")
  .costSame(2)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 301101
 * @name 千岩之护
 * @description
 * 根据「璃月」角色的数量提供护盾，保护所附属的角色。
 */
export const LithicGuard = status(301101)
  .shield(0, 3)
  .done();

/**
 * @id 311402
 * @name 千岩长枪
 * @description
 * 角色造成的伤害+1。
 * 入场时：我方队伍中每有1名「璃月」角色，此牌就为附属的角色提供1点护盾。（最多3点）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const LithicSpear = card(311402)
  .since("v3.3.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .do((c) => {
    const liyueCount = c.$$(`my characters include defeated with tag (liyue)`).length;
    if (liyueCount > 0) {
      c.characterStatus(LithicGuard, "@master", {
        overrideVariables: {
          shield: Math.min(liyueCount, 3)
        }
      });
    }
  })
  .done();

/**
 * @id 311403
 * @name 天空之脊
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardSpine = card(311403)
  .since("v3.3.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usagePerRound(1)
  .increaseDamage(1)
  .done();

/**
 * @id 311404
 * @name 贯虹之槊
 * @description
 * 角色造成的伤害+1。
 * 角色如果在护盾角色状态或护盾出战状态的保护下，则造成的伤害额外+1。
 * 角色使用「元素战技」后：如果我方存在提供「护盾」的出战状态，则为一个此类出战状态补充1点「护盾」。（每回合1次）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const VortexVanquisher = card(311404)
  .since("v3.7.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => {
    return !!c.$("(my combat statuses with tag (shield)) or status with tag (shield) at @master");
  })
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental") && c.$("my combat status with tag (shield)"))
  .usagePerRound(1)
  .do((c) => {
    c.$("my combat status with tag (shield)")?.addVariable("shield", 1)
  })
  .done();

/**
 * @id 311405
 * @name 薙草之稻光
 * @description
 * 角色造成的伤害+1。
 * 每回合自动触发1次：如果所附属角色没有充能，就使其获得1点充能。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const EngulfingLightning = card(311405)
  .since("v3.7.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter", (c) => c.self.master.energy === 0)
  .gainEnergy(1, "@master")
  .on("actionPhase", (c) => c.self.master.energy === 0)
  .gainEnergy(1, "@master")
  .done();

/**
 * @id 301104
 * @name 贯月矢（生效中）
 * @description
 * 在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时：少花费2个元素骰。
 */
export const MoonpiercerStatus = status(301104)
  .oneDuration()
  .once("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "elemental"))
  .deductOmniCost(2)
  .done();

/**
 * @id 311406
 * @name 贯月矢
 * @description
 * 角色造成的伤害+1。
 * 入场时：在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时，少花费2个元素骰。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const Moonpiercer = card(311406)
  .since("v4.1.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .characterStatus(MoonpiercerStatus, "@master")
  .done();

/**
 * @id 311407
 * @name 和璞鸢
 * @description
 * 角色造成的伤害+1。
 * 角色使用技能后：直到回合结束前，此牌所提供的伤害加成值额外+1。（最多累积到+2）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const PrimordialJadeWingedspear = card(311407)
  .since("v4.3.0")
  .costSame(3)
  .weapon("pole")
  .variable("extraDamage", 1)
  .on("roundEnd")
  .setVariable("extraDamage", 1)
  .on("increaseSkillDamage")
  .do((c, e) => {
    e.increaseDamage(c.getVariable("extraDamage"));
  })
  .on("useSkill")
  .addVariableWithMax("extraDamage", 1, 3)
  .done();

/**
 * @id 311408
 * @name 公义的酬报
 * @description
 * 角色使用「元素爆发」造成的伤害+2。
 * 我方出战角色受到伤害或治疗后：累积1点「公义之理」。如果此牌已累积3点「公义之理」，则消耗3点「公义之理」，使角色获得1点充能。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const RightfulReward = card(311408)
  .since("v4.6.0")
  .costSame(2)
  .weapon("pole")
  .variable("justice", 0)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(2)
  .on("damagedOrHealed", (c, e) => e.target.isActive())
  .listenToPlayer()
  .do((c) => {
    c.addVariable("justice", 1);
    if (c.getVariable("justice") >= 3) {
      c.addVariable("justice", -3);
      c.gainEnergy(1, "@master");
    }
  })
  .done();

/**
 * @id 311409
 * @name 勘探钻机
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「团结」。（每回合1次）
 * 角色造成伤害时：如果此牌已有「团结」，则消耗所有「团结」，使此伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
export const ProspectorsDrill = card(311409)
  .since("v4.8.0")
  .costSame(2)
  .weapon("pole")
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
