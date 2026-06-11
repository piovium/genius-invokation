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

import { character, skill, status, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115042
 * @name 降魔·忿怒显相
 * @description
 * 所附属角色使用风轮两立时：少花费1个风元素。
 * 可用次数：2
 * 所附属角色不再附属夜叉傩面时：移除此效果。
 */
export const ConquerorOfEvilWrathDeity = status(115042)
  .on("deductElementDiceSkill", (c, e) => e.action.skill.definition.id === LemniscaticWindCycling && 
    e.canDeductCostOfType(DiceType.Anemo))
  .usage(2)
  .deductCost(DiceType.Anemo, 1)
  .on("dispose", (c, e) => e.entity.definition.id === YakshasMask)
  .dispose()
  .done();

/**
 * @id 115041
 * @name 夜叉傩面
 * @description
 * 所附属角色造成的物理伤害变为风元素伤害，且角色造成的风元素伤害+1。
 * 所附属角色进行下落攻击时：伤害额外+2。
 * 所附属角色为出战角色，我方执行「切换角色」行动时：少花费1个元素骰。（每回合1次）
 * 持续回合：2
 */
export const YakshasMask = status(115041)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Anemo)
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Anemo)
  .increaseDamage(1)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(2)
  .on("deductOmniDiceSwitch", (c) => c.self.master.isActive())
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 15041
 * @name 卷积微尘
 * @description
 * 造成2点物理伤害。
 */
export const WhirlwindThrust = skill(15041)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15042
 * @name 风轮两立
 * @description
 * 造成3点风元素伤害。
 */
export const LemniscaticWindCycling = skill(15042)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 3)
  .done();

/**
 * @id 15043
 * @name 靖妖傩舞
 * @description
 * 造成4点风元素伤害，本角色附属夜叉傩面。
 */
export const BaneOfAllEvil: SkillHandle = skill(15043)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 4)
  .characterStatus(YakshasMask)
  .if((c) => c.self.hasEquipment(ConquerorOfEvilGuardianYaksha))
  .characterStatus(ConquerorOfEvilWrathDeity)
  .done();

/**
 * @id 1504
 * @name 魈
 * @description
 * 护法夜叉，靖妖降魔。
 */
export const Xiao = character(1504)
  .since("v3.7.0")
  .tags("anemo", "pole", "liyue")
  .health(10)
  .energy(2)
  .skills(WhirlwindThrust, LemniscaticWindCycling, BaneOfAllEvil)
  .done();

/**
 * @id 215041
 * @name 降魔·护法夜叉
 * @description
 * 战斗行动：我方出战角色为魈时，装备此牌。
 * 魈装备此牌后，立刻使用一次靖妖傩舞。
 * 装备有此牌的魈附属夜叉傩面期间，使用风轮两立时少花费1个风元素。（每附属1次夜叉傩面，可触发2次）
 * （牌组中包含魈，才能加入牌组）
 */
export const ConquerorOfEvilGuardianYaksha = card(215041)
  .since("v3.7.0")
  .costAnemo(3)
  .costEnergy(2)
  .talent(Xiao)
  .on("enter")
  .useSkill(BaneOfAllEvil)
  .done();
