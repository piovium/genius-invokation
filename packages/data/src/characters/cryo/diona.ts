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

import { character, skill, summon, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111023
 * @name 酒雾领域
 * @description
 * 结束阶段：造成1点冰元素伤害，治疗我方出战角色2点。
 * 可用次数：2
 */
export const DrunkenMist = summon(111023)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .heal(2, "my active")
  .done();

/**
 * @id 111022
 * @name 猫爪护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
export const CatclawShield01 = combatStatus(111022)
  .conflictWith(111021)
  .shield(2)
  .done();

/**
 * @id 111021
 * @name 猫爪护盾
 * @description
 * 为我方出战角色提供1点护盾。
 */
export const CatclawShield = combatStatus(111021)
  .conflictWith(111022)
  .shield(1)
  .done();

/**
 * @id 11021
 * @name 猎人射术
 * @description
 * 造成2点物理伤害。
 */
export const KatzleinStyle = skill(11021)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11022
 * @name 猫爪冻冻
 * @description
 * 造成2点冰元素伤害，生成猫爪护盾。
 */
export const IcyPaws: SkillHandle = skill(11022)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .if((c) => c.self.hasEquipment(ShakenNotPurred))
  .combatStatus(CatclawShield01)
  .else()
  .combatStatus(CatclawShield)
  .done();

/**
 * @id 11023
 * @name 最烈特调
 * @description
 * 造成1点冰元素伤害，治疗此角色2点，召唤酒雾领域。
 */
export const SignatureMix = skill(11023)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .damage(DamageType.Cryo, 1)
  .heal(2, "@self")
  .summon(DrunkenMist)
  .done();

/**
 * @id 1102
 * @name 迪奥娜
 * @description
 * 用1%的力气调酒，99%的力气…拒绝失败。
 */
export const Diona = character(1102)
  .since("v3.3.0")
  .tags("cryo", "bow", "mondstadt")
  .health(12)
  .energy(3)
  .skills(KatzleinStyle, IcyPaws, SignatureMix)
  .done();

/**
 * @id 211021
 * @name 猫爪冰摇
 * @description
 * 战斗行动：我方出战角色为迪奥娜时，装备此牌。
 * 迪奥娜装备此牌后，立刻使用一次猫爪冻冻。
 * 装备有此牌的迪奥娜生成的猫爪护盾，所提供的护盾值+1。
 * （牌组中包含迪奥娜，才能加入牌组）
 */
export const ShakenNotPurred = card(211021)
  .since("v3.3.0")
  .costCryo(3)
  .talent(Diona)
  .on("enter")
  .useSkill(IcyPaws)
  .done();
