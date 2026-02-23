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

import { character, skill, status, combatStatus, card, DamageType, CombatStatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 111174
 * @name 侦明
 * @description
 * 本回合所附属角色下次「普通攻击」少花费2个无色元素。
 */
export const NAttackCostReduction = status(111174)
  .since("v6.4.0")
  .oneDuration()
  .once("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(2)
  .done();

/**
 * @id 111175
 * @name 爆裂信标
 * @description
 * 本回合所附属角色下次「普通攻击」造成的物理伤害+2。
 */
export const PhysicalDmgIncrease01 = status(111175)
  .since("v6.4.0")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("normal") && e.type === DamageType.Physical)
  .increaseDamage(2)
  .done();

/**
 * @id 111171
 * @name 灵风
 * @description
 * 我方角色「普通攻击」后：该角色本回合下次「普通攻击」少花费2个无色元素。
 * 可用次数：1
 */
export const WindOfBlessing: CombatStatusHandle = combatStatus(111171)
  .since("v6.4.0")
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(1)
  .characterStatus(NAttackCostReduction, "@event.skillCaller")
  .if((c) => c.$(`my equipment with definition id ${CompanionsCounsel}`))
  .characterStatus(PhysicalDmgIncrease01, "@event.skillCaller")
  .done();

/**
 * @id 111172
 * @name 鹰翎心得
 * @description
 * 我方角色「普通攻击」少花费1个元素骰。
 * 可用次数：2
 */
export const Eagleplume = combatStatus(111172)
  .since("v6.4.0")
  .on("deductOmniDiceSkill", (c, e) => e.isSkillType("normal"))
  .usage(2)
  .deductOmniCost(1)
  .done();

/**
 * @id 111173
 * @name 速射牵制（生效中）
 * @description
 * 我方造成的物理伤害+1。
 * 可用次数：1
 */
export const PhysicalDmgIncrease = combatStatus(111173)
  .since("v6.4.0")
  .on("increaseDamage", (c, e) => e.type === DamageType.Physical)
  .usage(1)
  .increaseDamage(1)
  .done();

/**
 * @id 111176
 * @name 鹰翎祝念
 * @description
 * 我方角色「普通攻击」后治疗自身1点。
 * 可用次数：2
 */
export const EagleplumeBlessing = combatStatus(111176)
  .since("v6.4.0")
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(2)
  .heal(1, "@event.skillCaller")
  .done();

/**
 * @id 11171
 * @name 西风枪术·镝传
 * @description
 * 造成2点物理伤害。
 */
export const SpearOfFavoniusArrowsPassage = skill(11171)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11172
 * @name 星霜的流旋
 * @description
 * 造成2点冰元素伤害，生成灵风。
 */
export const StarfrostSwirl = skill(11172)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .combatStatus(WindOfBlessing)
  .done();

/**
 * @id 11173
 * @name 苍翎的颂愿
 * @description
 * 治疗我方全体角色1点，生成鹰翎心得和鹰翎祝念。
 */
export const SkyfeatherSong = skill(11173)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .heal(1, "all my characters")
  .combatStatus(Eagleplume)
  .combatStatus(EagleplumeBlessing)
  .done();

/**
 * @id 11174
 * @name 速射牵制
 * @description
 * 【被动】自身使用技能后：下次我方造成的物理伤害+1。（每回合2次）
 */
export const ReconnaissanceExperience = skill(11174)
  .type("passive")
  .on("useSkill")
  .usagePerRound(2, { name: "usagePerRound1" })
  .combatStatus(PhysicalDmgIncrease)
  .done();

/**
 * @id 1117
 * @name 米卡
 * @description
 * 翎羽如穗，绘摹殊境。
 */
export const Mika = character(1117)
  .since("v6.4.0")
  .tags("cryo", "pole", "mondstadt")
  .health(10)
  .energy(2)
  .skills(SpearOfFavoniusArrowsPassage, StarfrostSwirl, SkyfeatherSong, ReconnaissanceExperience)
  .done();

/**
 * @id 211171
 * @name 依随的策援
 * @description
 * 战斗行动：我方出战角色为米卡时，装备此牌。
 * 米卡装备此牌后，立刻使用一次星霜的流旋。
 * 装备有此卡牌的米卡在场时，灵风触发后会额外使该角色本回合下次「普通攻击」造成的物理伤害+2。
 * （牌组中包含米卡，才能加入牌组）
 */
export const CompanionsCounsel = card(211171)
  .since("v6.4.0")
  .costCryo(3)
  .talent(Mika)
  .on("enter")
  .useSkill(StarfrostSwirl)
  .done();
