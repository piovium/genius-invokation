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
 * @id 111111
 * @name 寒烈的惩裁
 * @description
 * 所附属角色进行普通攻击时：造成的伤害+1。如果角色生命至少为6，则此技能少花费1个冰元素。
 * 技能结算后，如果角色生命至少为6，则对角色造成1点穿透伤害；如果角色生命不多于5，则治疗角色2点。
 * 可用次数：2
 */
export const ChillingPenalty = status(111111)
  .on("deductElementDiceSkill", (c, e) => c.self.master.health >= 6 &&
    e.isSkillType("normal") &&
    e.canDeductCostOfType(DiceType.Cryo))
  .deductCost(DiceType.Cryo, 1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(2)
  .if((c) => c.self.master.health >= 6)
  .damage(DamageType.Piercing, 1, "@master")
  .else()
  .heal(2, "@master")
  .done();

/**
 * @id 111112
 * @name 余威冰锥
 * @description
 * 我方选择行动前：造成2点冰元素伤害。
 * 可用次数：1
 */
export const LingeringIcicles = combatStatus(111112)
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Cryo, 2)
  .done();

/**
 * @id 11111
 * @name 迅烈倾霜拳
 * @description
 * 造成1点冰元素伤害。
 */
export const ForcefulFistsOfFrost = skill(11111)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 11112
 * @name 冰牙突驰
 * @description
 * 造成2点冰元素伤害，本角色附属寒烈的惩裁。
 */
export const IcefangRush = skill(11112)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .characterStatus(ChillingPenalty)
  .done();

/**
 * @id 11113
 * @name 黑金狼噬
 * @description
 * 造成2点冰元素伤害，生成余威冰锥。
 * 本角色在本回合中受到伤害或治疗每累计到2次时：此技能少花费1个元素骰（最多少花费2个）。
 */
export const DarkgoldWolfbite = skill(11113)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .damage(DamageType.Cryo, 2)
  .combatStatus(LingeringIcicles)
  .done();

/**
 * @id 11114
 * @name
 * @description
 *
 */
export const Skill11114 = skill(11114)
  .type("passive")
  .reserve();

/**
 * @id 11115
 * @name
 * @description
 *
 */
export const Skill11115 = skill(11115)
  .type("passive")
  .reserve();

/**
 * @id 11116
 * @name 黑金狼噬
 * @description
 * 本角色在本回合中受到伤害或治疗每累计到2次时：元素爆发少花费1个元素骰（最多少花费2个）。
 */
export const DarkgoldWolfbite01 = skill(11116)
  .type("passive")
  .variable("damageOrHealCount", 0)
  .on("roundEnd")
  .setVariable("damageOrHealCount", 0)
  .on("damagedOrHealed")
  .addVariable("damageOrHealCount", 1)
  .on("deductOmniDiceSkill", (c, e) => e.isSkillType("burst"))
  .do((c, e) => {
    const cnt = c.getVariable("damageOrHealCount");
    const deducted = Math.min(Math.floor(cnt / 2), 2);
    e.deductOmniCost(deducted);
  })
  .done();

/**
 * @id 1111
 * @name 莱欧斯利
 * @description
 * 罪囚于斯，深水无漪。
 */
export const Wriothesley = character(1111)
  .since("v4.7.0")
  .tags("cryo", "catalyst", "fontaine", "pneuma")
  .health(11)
  .energy(3)
  .skills(ForcefulFistsOfFrost, IcefangRush, DarkgoldWolfbite, DarkgoldWolfbite01)
  .done();

/**
 * @id 211111
 * @name 予行恶者以惩惧
 * @description
 * 战斗行动：我方出战角色为莱欧斯利时，装备此牌。
 * 莱欧斯利装备此牌后，立刻使用一次迅烈倾霜拳。
 * 装备有此牌的莱欧斯利受到伤害或治疗后，此牌累积1点「惩戒计数」。
 * 装备有此牌的莱欧斯利使用技能时：如果已有3点「惩戒计数」，则消耗3点使此技能伤害+1。
 * （牌组中包含莱欧斯利，才能加入牌组）
 */
export const TerrorForTheEvildoers = card(211111)
  .since("v4.7.0")
  .costCryo(1)
  .costVoid(2)
  .talent(Wriothesley)
  .variable("count", 0)
  .on("enter")
  .useSkill(ForcefulFistsOfFrost)
  .on("damagedOrHealed")
  .addVariable("count", 1)
  .on("increaseSkillDamage", (c) => c.getVariable("count") >= 3)
  .addVariable("count", -3)
  .increaseDamage(1)
  .done();
