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

import { character, skill, combatStatus, card, DamageType, type EquipmentHandle } from "@gi-tcg/core/builder";

/**
 * @id 113032
 * @name 鼓舞领域
 * @description
 * 我方角色使用技能时：此技能伤害+2；技能结算后，如果该角色生命值不多于6，则治疗该角色2点。
 * 持续回合：2
 */
export const InspirationField01 = combatStatus(113032)
  .conflictWith(113031)
  .duration(2)
  .on("increaseSkillDamage")
  .increaseDamage(2)
  .on("useSkill", (c, e) => e.skillCaller.variables.health <= 6)
  .heal(2, "@event.skillCaller")
  .done();

/**
 * @id 113031
 * @name 鼓舞领域
 * @description
 * 我方角色使用技能时：如果该角色生命值至少为7，则使此伤害额外+2；技能结算后，如果该角色生命值不多于6，则治疗该角色2点。
 * 持续回合：2
 */
export const InspirationField = combatStatus(113031)
  .conflictWith(113032)
  .duration(2)
  .on("increaseSkillDamage", (c, e) => e.source.cast<"character">().health >= 7)
  .increaseDamage(2)
  .on("useSkill", (c, e) => e.skillCaller.variables.health <= 6)
  .heal(2, "@event.skillCaller")
  .done();

/**
 * @id 13031
 * @name 好运剑
 * @description
 * 造成2点物理伤害。
 */
export const StrikeOfFortune = skill(13031)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13032
 * @name 热情过载
 * @description
 * 造成3点火元素伤害。
 */
export const PassionOverload = skill(13032)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .done();

/**
 * @id 13033
 * @name 美妙旅程
 * @description
 * 造成2点火元素伤害，生成鼓舞领域。
 */
export const FantasticVoyage = skill(13033)
  .type("burst")
  .costPyro(4)
  .costEnergy(2)
  .damage(DamageType.Pyro, 2)
  .if((c) => c.self.hasEquipment(GrandExpectation))
  .combatStatus(InspirationField01)
  .else()
  .combatStatus(InspirationField)
  .done();

/**
 * @id 1303
 * @name 班尼特
 * @description
 * 当你知道自己一定会输时，那你肯定也知道如何能赢。
 */
export const Bennett = character(1303)
  .since("v3.3.0")
  .tags("pyro", "sword", "mondstadt")
  .health(10)
  .energy(2)
  .skills(StrikeOfFortune, PassionOverload, FantasticVoyage)
  .done();

/**
 * @id 213031
 * @name 冒险憧憬
 * @description
 * 战斗行动：我方出战角色为班尼特时，装备此牌。
 * 班尼特装备此牌后，立刻使用一次美妙旅程。
 * 装备有此牌的班尼特生成的鼓舞领域，其伤害提升效果改为总是生效，不再具有生命值限制。
 * （牌组中包含班尼特，才能加入牌组）
 */
export const GrandExpectation: EquipmentHandle = card(213031)
  .since("v3.3.0")
  .costPyro(4)
  .costEnergy(2)
  .talent(Bennett)
  .on("enter")
  .useSkill(FantasticVoyage)
  .done();
