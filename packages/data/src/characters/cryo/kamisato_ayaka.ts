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

import { character, skill, summon, status, card, DamageType, type PassiveSkillHandle, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 111051
 * @name 霜见雪关扉
 * @description
 * 结束阶段：造成2点冰元素伤害。
 * 可用次数：2
 */
export const FrostflakeSekiNoTo = summon(111051)
  .endPhaseDamage(DamageType.Cryo, 2)
  .usage(2)
  .done();

/**
 * @id 111053
 * @name 冰元素附魔
 * @description
 * 所附属角色造成的物理伤害变为冰元素伤害，且角色造成的冰元素伤害+1。
 * （持续到回合结束）
 */
export const CryoElementalInfusion01 = status(111053)
  .conflictWith(111052)
  .oneDuration()
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Cryo)
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Cryo)
  .increaseDamage(1)
  .done();

/**
 * @id 111052
 * @name 冰元素附魔
 * @description
 * 所附属角色造成的物理伤害变为冰元素伤害。
 * （持续到回合结束）
 */
export const CryoElementalInfusion = status(111052)
  .conflictWith(111053)
  .oneDuration()
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Cryo)
  .done();

/**
 * @id 111054
 * @name 神里流·霰步
 * @description
 * 本回合内，所附属角色下次「普通攻击」造成的伤害+1。
 */
export const KamisatoArtSenhoStatus = status(111054)
  .since("v6.0.0")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();


/**
 * @id 11051
 * @name 神里流·倾
 * @description
 * 造成2点物理伤害。
 */
export const KamisatoArtKabuki = skill(11051)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11052
 * @name 神里流·冰华
 * @description
 * 造成3点冰元素伤害。
 */
export const KamisatoArtHyouka = skill(11052)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 3)
  .done();

/**
 * @id 11053
 * @name 神里流·霜灭
 * @description
 * 造成4点冰元素伤害，召唤霜见雪关扉。
 */
export const KamisatoArtSoumetsu = skill(11053)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .damage(DamageType.Cryo, 4)
  .summon(FrostflakeSekiNoTo)
  .done();

/**
 * @id 11054
 * @name 神里流·霰步
 * @description
 * 【被动】此角色被切换为「出战角色」时，附属冰元素附魔，本回合下次「普通攻击」造成的伤害+1。（每回合2次）。
 */
export const KamisatoArtSenho01: PassiveSkillHandle = skill(11054)
  .type("passive")
  .on("switchActive", (c, e) => e.switchInfo.to.id === c.self.id)
  .if((c) => c.self.hasEquipment(KantenSenmyouBlessing))
  .characterStatus(CryoElementalInfusion01)
  .else()
  .characterStatus(CryoElementalInfusion)
  .done();

/**
 * @id 11055
 * @name 神里流·霰步
 * @description
 * 【被动】此角色被切换为「出战角色」时，附属冰元素附魔，本回合下次「普通攻击」造成的伤害+1。（每回合2次）。
 */
export const KamisatoArtSenho02 = skill(11055)
  .type("passive")
  .on("switchActive", (c, e) => e.switchInfo.to.id === c.self.id)
  .usagePerRound(2, { name: "usagePerRound1" })
  .characterStatus(KamisatoArtSenhoStatus)
  .addVariable("usagePerRound1", -1)
  .done();

/**
 * @id 1105
 * @name 神里绫华
 * @description
 * 如霜凝华，如鹭在庭。
 */
export const KamisatoAyaka = character(1105)
  .since("v3.3.0")
  .tags("cryo", "sword", "inazuma")
  .health(10)
  .energy(3)
  .skills(KamisatoArtKabuki, KamisatoArtHyouka, KamisatoArtSoumetsu, KamisatoArtSenho01, KamisatoArtSenho02)
  .done();

/**
 * @id 211051
 * @name 寒天宣命祝词
 * @description
 * 装备有此牌的神里绫华生成的冰元素附魔会使所附属角色造成的冰元素伤害+1。
 * 切换到装备有此牌的神里绫华时：少花费1个元素骰。（每回合1次）
 * （牌组中包含神里绫华，才能加入牌组）
 */
export const KantenSenmyouBlessing = card(211051)
  .since("v3.3.0")
  .costCryo(2)
  .talent(KamisatoAyaka, "none")
  .on("deductOmniDiceSwitch", (c, e) => e.action.to.id === c.self.master.id)
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();
