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

import { character, skill, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 113081
 * @name 丹火印
 * @description
 * 角色进行重击时：造成的伤害+2。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const ScarletSeal = status(113081)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack())
  .usageCanAppend(1, 2)
  .increaseDamage(2)
  .done();

/**
 * @id 113082
 * @name 灼灼
 * @description
 * 角色进行重击时：少花费1个火元素。（每回合1次）
 * 结束阶段：角色附属丹火印。
 * 持续回合：2
 */
export const Brilliance = status(113082)
  .duration(2)
  .on("deductElementDiceSkill", (c, e) => e.isChargedAttack() && e.canDeductCostOfType(DiceType.Pyro))
  .usagePerRound(1)
  .deductCost(DiceType.Pyro, 1)
  .on("endPhase")
  .characterStatus(ScarletSeal, "@master")
  .done();

/**
 * @id 13081
 * @name 火漆制印
 * @description
 * 造成1点火元素伤害。
 */
export const SealOfApproval = skill(13081)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 13082
 * @name 丹书立约
 * @description
 * 造成3点火元素伤害，本角色附属丹火印。
 */
export const SignedEdict = skill(13082)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .characterStatus(ScarletSeal)
  .done();

/**
 * @id 13083
 * @name 凭此结契
 * @description
 * 造成4点火元素伤害，本角色附属丹火印和灼灼。
 */
export const DoneDeal = skill(13083)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 4)
  .characterStatus(ScarletSeal)
  .characterStatus(Brilliance)
  .done();

/**
 * @id 1308
 * @name 烟绯
 * @description
 * 不期修古，不法常可。
 */
export const Yanfei = character(1308)
  .since("v3.8.0")
  .tags("pyro", "catalyst", "liyue")
  .health(10)
  .energy(2)
  .skills(SealOfApproval, SignedEdict, DoneDeal)
  .done();

/**
 * @id 213081
 * @name 最终解释权
 * @description
 * 战斗行动：我方出战角色为烟绯时，装备此牌。
 * 烟绯装备此牌后，立刻使用一次火漆制印。
 * 装备有此牌的烟绯进行重击时：对生命值不多于6的敌人造成的伤害+1；如果触发了丹火印，则在技能结算后抓1张牌。
 * （牌组中包含烟绯，才能加入牌组）
 */
export const RightOfFinalInterpretation = card(213081)
  .since("v3.8.0")
  .costPyro(1)
  .costVoid(2)
  .talent(Yanfei)
  .variable("triggerSeal", 0)
  .on("enter")
  .useSkill(SealOfApproval)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack() && e.target.health <= 6)
  .increaseDamage(1)
  .if((c) => c.self.master.hasStatus(ScarletSeal))
  .setVariable("triggerSeal", 1)
  .on("useSkill", (c) => c.getVariable("triggerSeal"))
  .drawCards(1)
  .setVariable("triggerSeal", 0)
  .done();
