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

import { character, skill, status, combatStatus, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113062
 * @name 爆裂火花
 * @description
 * 所附属角色进行重击时：少花费1个火元素，并且伤害+1。
 * 可用次数：2
 */
export const ExplosiveSpark01 = status(113062)
  .conflictWith(113061)
  .on("deductElementDiceSkill", (c, e) => e.isChargedAttack() && e.canDeductCostOfType(DiceType.Pyro))
  .deductCost(DiceType.Pyro, 1)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack())
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 113061
 * @name 爆裂火花
 * @description
 * 所附属角色进行重击时：少花费1个火元素，并且伤害+1。
 * 可用次数：1
 */
export const ExplosiveSpark = status(113061)
  .conflictWith(113062)
  .on("deductElementDiceSkill", (c, e) => e.isChargedAttack() && e.canDeductCostOfType(DiceType.Pyro))
  .deductCost(DiceType.Pyro, 1)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack())
  .usage(1)
  .increaseDamage(1)
  .done();

/**
 * @id 113063
 * @name 轰轰火花
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成2点火元素伤害。
 * 可用次数：2
 */
export const SparksNSplashStatus = combatStatus(113063)
  .on("useSkill")
  .usage(2)
  .damage(DamageType.Pyro, 2, "my active")
  .done();

/**
 * @id 13061
 * @name 砰砰
 * @description
 * 造成1点火元素伤害。
 */
export const Kaboom = skill(13061)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 13062
 * @name 蹦蹦炸弹
 * @description
 * 造成3点火元素伤害，本角色附属爆裂火花。
 */
export const JumpyDumpty: SkillHandle = skill(13062)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .if((c) => c.self.hasEquipment(PoundingSurprise))
  .characterStatus(ExplosiveSpark01)
  .else()
  .characterStatus(ExplosiveSpark)
  .done();

/**
 * @id 13063
 * @name 轰轰火花
 * @description
 * 造成3点火元素伤害，在对方场上生成轰轰火花。
 */
export const SparksNSplash = skill(13063)
  .type("burst")
  .costPyro(3)
  .costEnergy(3)
  .damage(DamageType.Pyro, 3)
  .combatStatus(SparksNSplashStatus, "opp")
  .done();

/**
 * @id 1306
 * @name 可莉
 * @description
 * 每一次抽牌，都可能带来一次「爆炸性惊喜」。
 */
export const Klee = character(1306)
  .since("v3.4.0")
  .tags("pyro", "catalyst", "mondstadt")
  .health(10)
  .energy(3)
  .skills(Kaboom, JumpyDumpty, SparksNSplash)
  .done();

/**
 * @id 213061
 * @name 砰砰礼物
 * @description
 * 战斗行动：我方出战角色为可莉时，装备此牌。
 * 可莉装备此牌后，立刻使用一次蹦蹦炸弹。
 * 装备有此牌的可莉生成的爆裂火花的可用次数+1。
 * （牌组中包含可莉，才能加入牌组）
 */
export const PoundingSurprise = card(213061)
  .since("v3.4.0")
  .costPyro(3)
  .talent(Klee)
  .on("enter")
  .useSkill(JumpyDumpty)
  .done();
