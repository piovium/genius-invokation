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

import { character, skill, status, combatStatus, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 12074
 * @name 苍鹭震击
 * @description
 * （需准备1个行动轮）
 * 造成3点水元素伤害。
 */
export const HeronStrike = skill(12074)
  .type("elemental")
  .prepared()
  .do((c) => {
    c.$(`status with definition id ${HeronShield} at @self`)?.dispose();
  })
  .damage(DamageType.Hydro, 3)
  .done();

/**
 * @id 112071
 * @name 苍鹭护盾
 * @description
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
export const HeronShield = status(112071)
  .shield(2)
  .done();

/**
 * @id 112074
 * @name 苍鹭震击
 * @description
 * 本角色将在下次行动时，直接使用技能：苍鹭震击。
 */
export const HeronStrikeStatus = status(112074)
  .prepare(HeronStrike)
  .done();

/**
 * @id 112073
 * @name 赤冕祝祷
 * @description
 * 我方角色普通攻击造成的伤害+1。
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为水元素伤害。
 * 我方切换角色后：造成1点水元素伤害。（每回合1次）
 * 我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * 持续回合：2
 */
export const PrayerOfTheCrimsonCrown01 = combatStatus(112073)
  .conflictWith(112072)
  .duration(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("modifySkillDamageType", (c, e) => {
    if (e.type !== DamageType.Physical) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .changeDamageType(DamageType.Hydro)
  .on("switchActive")
  .usagePerRound(1)
  .damage(DamageType.Hydro, 1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usagePerRound(1)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 112072
 * @name 赤冕祝祷
 * @description
 * 我方角色普通攻击造成的伤害+1。
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为水元素伤害。
 * 我方切换角色后：造成1点水元素伤害。（每回合1次）
 * 持续回合：2
 */
export const PrayerOfTheCrimsonCrown = combatStatus(112072)
  .conflictWith(112073)
  .duration(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("modifySkillDamageType", (c, e) => {
    if (e.type !== DamageType.Physical) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .changeDamageType(DamageType.Hydro)
  .on("switchActive")
  .usagePerRound(1)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12071
 * @name 流耀枪术·守势
 * @description
 * 造成2点物理伤害。
 */
export const GleamingSpearGuardianStance = skill(12071)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12072
 * @name 圣仪·苍鹭庇卫
 * @description
 * 本角色附属苍鹭护盾并准备技能：苍鹭震击。
 */
export const SacredRiteHeronsSanctum = skill(12072)
  .type("elemental")
  .costHydro(3)
  .characterStatus(HeronShield)
  .characterStatus(HeronStrikeStatus)
  .done();

/**
 * @id 12073
 * @name 圣仪·灰鸰衒潮
 * @description
 * 造成2点水元素伤害，生成赤冕祝祷。
 */
export const SacredRiteWagtailsTide: SkillHandle = skill(12073)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .if((c) => c.self.hasEquipment(TheOverflow))
  .combatStatus(PrayerOfTheCrimsonCrown01)
  .else()
  .combatStatus(PrayerOfTheCrimsonCrown)
  .done();

/**
 * @id 1207
 * @name 坎蒂丝
 * @description
 * 赤沙浮金，恪誓戍御。
 */
export const Candace = character(1207)
  .since("v3.8.0")
  .tags("hydro", "pole", "sumeru")
  .health(11)
  .energy(2)
  .skills(GleamingSpearGuardianStance, SacredRiteHeronsSanctum, SacredRiteWagtailsTide, HeronStrike)
  .done();

/**
 * @id 212071
 * @name 衍溢的汐潮
 * @description
 * 战斗行动：我方出战角色为坎蒂丝时，装备此牌。
 * 坎蒂丝装备此牌后，立刻使用一次圣仪·灰鸰衒潮。
 * 装备有此牌的坎蒂丝生成的赤冕祝祷额外具有以下效果：我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * （牌组中包含坎蒂丝，才能加入牌组）
 */
export const TheOverflow = card(212071)
  .since("v3.8.0")
  .costHydro(3)
  .costEnergy(2)
  .talent(Candace)
  .on("enter")
  .useSkill(SacredRiteWagtailsTide)
  .done();
