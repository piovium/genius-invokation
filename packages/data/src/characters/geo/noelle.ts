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

import { character, skill, status, combatStatus, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 116022
 * @name 大扫除
 * @description
 * 角色使用普通攻击时：少花费1个岩元素。（每回合1次）
 * 角色普通攻击造成的伤害+2，造成的物理伤害变为岩元素伤害。
 * 持续回合：2
 */
export const SweepingTimeStatus = status(116022)
  .duration(2)
  .on("deductElementDiceSkill", (c, e) => e.isSkillType("normal") && e.canDeductCostOfType(DiceType.Geo))
  .usagePerRound(1)
  .deductCost(DiceType.Geo, 1)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Geo)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(2)
  .done();

/**
 * @id 116021
 * @name 护体岩铠
 * @description
 * 为我方出战角色提供2点护盾。
 * 此护盾耗尽前，我方受到的物理伤害减半。（向上取整）
 */
export const FullPlate = combatStatus(116021)
  .shield(2)
  .on("multiplyDamaged", (c, e) => e.type === DamageType.Physical)
  .divideDamage(2)
  .done();

/**
 * @id 16021
 * @name 西风剑术·女仆
 * @description
 * 造成2点物理伤害。
 */
export const FavoniusBladeworkMaid = skill(16021)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 16022
 * @name 护心铠
 * @description
 * 造成1点岩元素伤害，生成护体岩铠。
 */
export const Breastplate = skill(16022)
  .type("elemental")
  .costGeo(3)
  .damage(DamageType.Geo, 1)
  .combatStatus(FullPlate)
  .done();

/**
 * @id 16023
 * @name 大扫除
 * @description
 * 造成4点岩元素伤害，本角色附属大扫除。
 */
export const SweepingTime = skill(16023)
  .type("burst")
  .costGeo(4)
  .costEnergy(2)
  .damage(DamageType.Geo, 4)
  .characterStatus(SweepingTimeStatus)
  .done();

/**
 * @id 1602
 * @name 诺艾尔
 * @description
 * 整理牌桌这种事，真的可以交给她。
 */
export const Noelle = character(1602)
  .since("v3.3.0")
  .tags("geo", "claymore", "mondstadt")
  .health(12)
  .energy(2)
  .skills(FavoniusBladeworkMaid, Breastplate, SweepingTime)
  .done();

/**
 * @id 216021
 * @name 支援就交给我吧
 * @description
 * 战斗行动：我方出战角色为诺艾尔时，装备此牌。
 * 诺艾尔装备此牌后，立刻使用一次护心铠。
 * 诺艾尔普通攻击后：如果此牌和护体岩铠仍在场，则治疗我方所有角色1点。（每回合1次）
 * （牌组中包含诺艾尔，才能加入牌组）
 */
export const IGotYourBack = card(216021)
  .since("v3.3.0")
  .costGeo(3)
  .talent(Noelle)
  .on("enter")
  .useSkill(Breastplate)
  .on("useSkill", (c, e) => e.isSkillType("normal") && c.$(`my combat status with definition id ${FullPlate}`))
  .usagePerRound(1)
  .heal(1, "all my characters")
  .done();
