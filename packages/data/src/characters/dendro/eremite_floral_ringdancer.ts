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

import { character, skill, status, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 127030
 * @name 增殖生命体·活跃
 * @description
 * 回合开始时：舍弃1张唤醒眷属，治疗该角色1点生命值。
 */
const ProliferatedOrganismAnimated = void 0; // PVE 从阿佩普那边挤过来的编号

/**
 * @id 127031
 * @name 增殖生命体·暴走
 * @description
 * 回合开始时：舍弃1张唤醒眷属，治疗该角色1点生命值，生成1张唤醒眷属，随机置入我方牌库。
 */
const ProliferatedOrganismBerserk = void 0; // PVE 从阿佩普那边挤过来的编号

/**
 * @id 127033
 * @name 灵蛇祝福
 * @description
 * 我方使用厄灵·草之灵蛇的特技时：此特技造成的伤害+1，并且不消耗厄灵·草之灵蛇的可用次数。
 * 可用次数：1（可叠加，没有上限）
 */
export const SpiritserpentsBlessing = combatStatus(127033)
  .since("v5.1.0")
  .on("increaseTechniqueDamage", (c, e) => e.via.definition.id === 1230311)
  .usageCanAppend(1, Infinity)
  .increaseDamage(1)
  .done();

/**
 * @id 127032
 * @name 厄灵·草之灵蛇
 * @description
 * 特技：藤蔓锋鳞
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1270321: 藤蔓锋鳞] (1*Aligned, 1*Energy) 造成1点草元素伤害。
 * [2270312: ] ()
 */
export const SpiritOfOmenDendroSpiritserpent = card(127032)
  .since("v5.1.0")
  .undiscoverable()
  .technique()
  .provideSkill(1270321)
  .costSame(1)
  .costEnergy(1)
  .usage(2, { autoDecrease: false })
  .damage(DamageType.Dendro, 1)
  .if((c) => !c.$(`my combat status with definition id ${SpiritserpentsBlessing}`))
  .consumeUsage(1)
  .done();

/**
 * @id 27031
 * @name 叶轮轻扫
 * @description
 * 造成2点物理伤害。
 */
export const FloralringCaress = skill(27031)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 27032
 * @name 蔓延旋舞
 * @description
 * 造成3点草元素伤害，生成1层灵蛇祝福。
 */
export const SpiralingWhirl = skill(27032)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 3)
  .combatStatus(SpiritserpentsBlessing)
  .done();

/**
 * @id 27033
 * @name 厄灵苏醒·草之灵蛇
 * @description
 * 造成4点草元素伤害。整场牌局限制1次，将1张厄灵·草之灵蛇加入我方手牌。
 * （装备有厄灵·草之灵蛇的角色可以使用特技：藤蔓锋鳞）
 */
export const SpiritOfOmensAwakeningDendroSpiritserpent = skill(27033)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 4)
  .done();

/**
 * @id 27034
 * @name 厄灵之能
 * @description
 * 【被动】此角色受到伤害后：如果此角色生命值不多于7，则获得1点充能。（每回合1次）
 */
export const SpiritOfOmensPower = skill(27034)
  .type("passive")
  .on("damaged", (c) => c.self.health <= 7)
  .usagePerRound(1, { name: "usagePerRound1" })
  .gainEnergy(1, "@self")
  .on("useSkill", (c, e) => e.skill.definition.id === SpiritOfOmensAwakeningDendroSpiritserpent)
  .usage(1, { name: "createCardUsage" })
  .createHandCard(SpiritOfOmenDendroSpiritserpent)
  .done();

/**
 * @id 2703
 * @name 镀金旅团·叶轮舞者
 * @description
 * 「沙之民有音乐与舞蹈的传统，起初是对神的礼赞，后来则是讨取王者欢心的演艺与战斗的技术。」
 */
export const EremiteFloralRingdancer = character(2703)
  .since("v5.1.0")
  .tags("dendro", "eremite")
  .health(10)
  .energy(2)
  .skills(FloralringCaress, SpiralingWhirl, SpiritOfOmensAwakeningDendroSpiritserpent, SpiritOfOmensPower)
  .done();

/**
 * @id 227031
 * @name 灵蛇旋嘶
 * @description
 * 战斗行动：我方出战角色为镀金旅团·叶轮舞者时，装备此牌。
 * 镀金旅团·叶轮舞者装备此牌后，立刻使用一次蔓延旋舞。
 * 装备有此牌的镀金旅团·叶轮舞者在场，我方装备了厄灵·草之灵蛇的角色切换至出战时：造成1点草元素伤害。（每回合1次）
 * （牌组中包含镀金旅团·叶轮舞者，才能加入牌组）
 */
export const SpiritSerpentsSwirl = card(227031)
  .since("v5.1.0")
  .costDendro(3)
  .talent(EremiteFloralRingdancer)
  .on("enter")
  .useSkill(SpiralingWhirl)
  .on("switchActive", (c, e) => e.switchInfo.to.hasTechnique()?.definition.id === SpiritOfOmenDendroSpiritserpent)
  .listenToPlayer()
  .usagePerRound(1)
  .damage(DamageType.Dendro, 1)
  .done();
