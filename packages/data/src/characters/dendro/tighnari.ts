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

import { character, skill, summon, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 117022
 * @name 藏蕴花矢
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const ClusterbloomArrow = summon(117022)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usageCanAppend(1, 2)
  .done();

/**
 * @id 117021
 * @name 通塞识
 * @description
 * 所附属角色进行重击时：造成的物理伤害变为草元素伤害，并且会在技能结算后召唤藏蕴花矢。
 * 可用次数：2
 */
export const VijnanaSuffusion = status(117021)
  .on("modifySkillDamageType", (c, e) => e.viaChargedAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Dendro)
  .on("useSkill", (c, e) => e.isChargedAttack())
  .usage(2)
  .summon(ClusterbloomArrow)
  .done();

/**
 * @id 17021
 * @name 藏蕴破障
 * @description
 * 造成2点物理伤害。
 */
export const KhandaBarrierbuster = skill(17021)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 17022
 * @name 识果种雷
 * @description
 * 造成2点草元素伤害，本角色附属通塞识。
 */
export const VijnanaphalaMine = skill(17022)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 2)
  .characterStatus(VijnanaSuffusion)
  .done();

/**
 * @id 17023
 * @name 造生缠藤箭
 * @description
 * 造成4点草元素伤害，对所有敌方后台角色造成1点穿透伤害。
 */
export const FashionersTanglevineShaft = skill(17023)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Dendro, 4)
  .done();

/**
 * @id 1702
 * @name 提纳里
 * @description
 * 从某种角度来说，经验并不等同于智慧。
 */
export const Tighnari = character(1702)
  .since("v3.6.0")
  .tags("dendro", "bow", "sumeru")
  .health(10)
  .energy(2)
  .skills(KhandaBarrierbuster, VijnanaphalaMine, FashionersTanglevineShaft)
  .done();

/**
 * @id 217021
 * @name 眼识殊明
 * @description
 * 战斗行动：我方出战角色为提纳里时，装备此牌。
 * 提纳里装备此牌后，立刻使用一次识果种雷。
 * 装备有此牌的提纳里在附属通塞识状态期间，进行重击时少花费1个无色元素。
 * （牌组中包含提纳里，才能加入牌组）
 */
export const KeenSight = card(217021)
  .since("v3.6.0")
  .costDendro(3)
  .talent(Tighnari)
  .on("enter")
  .useSkill(VijnanaphalaMine)
  .on("deductVoidDiceSkill", (c, e) => 
    c.self.master.hasStatus(VijnanaSuffusion) && 
    e.isChargedAttack())
  .deductVoidCost(1)
  .done();
