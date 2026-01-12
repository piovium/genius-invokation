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

import { card, combatStatus, extension, pair, status } from "@gi-tcg/core/builder";

/**
 * @id 311301
 * @name 白铁大剑
 * @description
 * 角色造成的伤害+1。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const WhiteIronGreatsword = card(311301)
  .since("v3.3.0")
  .costSame(2)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311302
 * @name 祭礼大剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SacrificialGreatsword = card(311302)
  .since("v3.3.0")
  .costSame(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .do((c) => {
    c.generateDice(c.self.master.element(), 1);
  })
  .done();

/**
 * @id 311303
 * @name 狼的末路
 * @description
 * 角色造成的伤害+1。
 * 攻击剩余生命值不多于6的目标时，伤害额外+2。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const WolfsGravestone = card(311303)
  .since("v3.3.0")
  .costSame(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .do((c, e) => {
    if (e.target.health <= 6) {
      e.increaseDamage(3);
    } else {
      e.increaseDamage(1);
    }
  })
  .done();

/**
 * @id 311304
 * @name 天空之傲
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const SkywardPride = card(311304)
  .since("v3.7.0")
  .costSame(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usagePerRound(1)
  .increaseDamage(1)
  .done();

/**
 * @id 121013
 * @name 叛逆的守护
 * @description
 * 提供1点护盾，保护我方出战角色。（可叠加，最多叠加到2点）
 */
const RebelliousShield = combatStatus(121013)
  .shield(1, 2)
  .done();

/**
 * @id 311305
 * @name 钟剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用技能后：为我方出战角色提供1点护盾。（每回合1次，可叠加到2点）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const TheBell = card(311305)
  .since("v3.7.0")
  .costSame(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill")
  .combatStatus(RebelliousShield)
  .done();

/**
 * @id 301105
 * @name 沙海守望·主动出击
 * @description
 * 本回合内，所附属角色下次造成的伤害额外+1。
 */
const DesertWatchTakeTheInitiative = status(301105)
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 301106
 * @name 沙海守望·攻势防御
 * @description
 * 本回合内，所附属角色下次造成的伤害额外+1。
 */
const DesertWatchOffensiveDefense = status(301106)
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 311306
 * @name 苇海信标
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：本回合内，角色下次造成的伤害额外+1。（每回合1次）
 * 角色受到伤害后：本回合内，角色下次造成的伤害额外+1。（每回合1次）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const BeaconOfTheReedSea = card(311306)
  .since("v4.3.0")
  .costSame(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("useSkill")
  .characterStatus(DesertWatchTakeTheInitiative, "@master")
  .on("damaged")
  .characterStatus(DesertWatchOffensiveDefense, "@master")
  .done();

/**
 * @id 301109
 * @name 森林王器（生效中）
 * @description
 * 角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 */
export const ForestRegaliaInEffect = status(301109)
  .oneDuration()
  .once("useSkill", (c, e) => e.isSkillType("normal"))
  .do((c) => {
    c.generateDice(c.self.master.element(), 2);
  })
  .done();

/**
 * @id 311307
 * @name 森林王器
 * @description
 * 角色造成的伤害+1。
 * 入场时：所附属角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const ForestRegalia = card(311307)
  .since("v4.7.0")
  .costVoid(3)
  .weapon("claymore")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .characterStatus(ForestRegaliaInEffect, "@master")
  .done();

export const NonInitialPlayedCardExtension = extension(311308, { defIds: pair(new Set<number>()) })
  .description("记录双方打出过的名称不存在于本局最初牌组中的不同名的行动牌")
  .mutateWhen("onPlayCard", (c, e) => {
    if (e.onTimeState.players[e.who].initialPile.every((card) => card.id !== e.card.definition.id)) {
      c.defIds[e.who].add(e.card.definition.id);
    }
  })
  .done();

/**
 * @id 311308
 * @name 「究极霸王超级魔剑」
 * @description
 * 此牌会记录本局游戏中你打出过的名称不存在于本局最初牌组中的不同名的行动牌数量，称为「声援」。
 * 如果此牌的「声援」至少为2/4/9，则角色造成的伤害+1/2/3。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 * 【此卡含描述变量】
 */
export const UltimateOverlordsMegaMagicSword = card(311308)
  .since("v4.8.0")
  .costSame(2)
  .weapon("claymore")
  .variable("supp", 0)
  .associateExtension(NonInitialPlayedCardExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.defIds[area.who].size)
  .on("enter")
  .do((c) => {
    c.setVariable("supp", c.getExtensionState().defIds[c.self.who].size);
  })
  .on("playCard")
  .do((c) => {
    c.setVariable("supp", c.getExtensionState().defIds[c.self.who].size);
  })
  .on("increaseSkillDamage")
  .do((c, e) => {
    const supp = c.getVariable("supp");
    if (supp >= 9) {
      e.increaseDamage(3);
    } else if (supp >= 4) {
      e.increaseDamage(2);
    } else if (supp >= 2) {
      e.increaseDamage(1);
    }
  })
  .done();

/**
 * @id 311309
 * @name 便携动力锯
 * @description
 * 所附属角色受到伤害时：如可能，舍弃原本元素骰费用最高的1张手牌，以抵消1点伤害，然后累积1点「坚忍标记」。（每回合1次）
 * 角色造成伤害时：如果此牌已有「坚忍标记」，则消耗所有「坚忍标记」，使此伤害+1，并且每消耗1点「坚忍标记」就抓1张牌。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const PortablePowerSaw = card(311309)
  .since("v5.1.0")
  .costSame(2)
  .weapon("claymore")
  .tags("barrier")
  .variable("barrierUsage", 0) // no io hint for now
  .variable("stoic", 0)
  .on("decreaseDamaged", (c, e) => c.player.hands.length > 0)
  .usagePerRound(1)
  .disposeMaxCostHands(1)
  .decreaseDamage(1)
  .addVariable("stoic", 1)
  .on("increaseSkillDamage", (c) => c.getVariable("stoic") > 0)
  .do((c, e) => {
    e.increaseDamage(1);
    c.drawCards(c.getVariable("stoic"));
    c.setVariable("stoic", 0);
  })
  .done();

/**
 * @id 311310
 * @name 拾慧铸熔
 * @description
 * 角色使用「元素爆发」造成的伤害+2。
 * 我方引发元素反应时：累计1层盛放的思绪，当盛放的思绪不低于2层时，消耗2层盛放的思绪使所附属角色获得1点充能。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
export const FlameforgedInsight = card(311310)
  .since("v6.3.0")
  .costVoid(2)
  .weapon("claymore")
  .variable("thought", 0)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(2)
  .on("increaseSkillDamage", (c, e) => e.getReaction())
  .increaseDamage(1)
  .on("dealReaction")
  .listenToPlayer()
  .do((c) => {
    c.addVariable("thought", 1);
    if (c.getVariable("thought") >= 2) {
      c.addVariable("thought", -2);
      c.gainEnergy(1, "@master");
    }
  })
  .done();
