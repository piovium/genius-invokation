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
 * @id 113021
 * @name 锅巴
 * @description
 * 结束阶段：造成2点火元素伤害。
 * 可用次数：2
 */
export const Guoba = summon(113021)
  .endPhaseDamage(DamageType.Pyro, 2)
  .usage(2)
  .done();

/**
 * @id 113022
 * @name 旋火轮
 * @description
 * 我方角色使用技能后：造成2点火元素伤害。
 * 可用次数：2
 */
export const PyronadoStatus = combatStatus(113022)
  .on("useSkill", (c, e) => e.skill.definition.id !== Pyronado)
  .usage(2)
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 13021
 * @name 白案功夫
 * @description
 * 造成2点物理伤害。
 */
export const DoughFu = skill(13021)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13022
 * @name 锅巴出击
 * @description
 * 召唤锅巴。
 */
export const GuobaAttack: SkillHandle = skill(13022)
  .type("elemental")
  .costPyro(3)
  .if((c) => c.self.hasEquipment(Crossfire))
  .damage(DamageType.Pyro, 1)
  .summon(Guoba)
  .done();

/**
 * @id 13023
 * @name 旋火轮
 * @description
 * 造成3点火元素伤害，生成旋火轮。
 */
export const Pyronado: SkillHandle = skill(13023)
  .type("burst")
  .costPyro(4)
  .costEnergy(2)
  .damage(DamageType.Pyro, 3)
  .combatStatus(PyronadoStatus)
  .done();

/**
 * @id 1302
 * @name 香菱
 * @description
 * 身为一个厨师，她几乎什么都做得到。
 */
export const Xiangling = character(1302)
  .since("v3.3.0")
  .tags("pyro", "pole", "liyue")
  .health(10)
  .energy(2)
  .skills(DoughFu, GuobaAttack, Pyronado)
  .done();

/**
 * @id 213021
 * @name 交叉火力
 * @description
 * 战斗行动：我方出战角色为香菱时，装备此牌。
 * 香菱装备此牌后，立刻使用一次锅巴出击。
 * 装备有此牌的香菱使用锅巴出击时：自身也会造成1点火元素伤害。
 * （牌组中包含香菱，才能加入牌组）
 */
export const Crossfire = card(213021)
  .since("v3.3.0")
  .costPyro(3)
  .talent(Xiangling)
  .on("enter")
  .useSkill(GuobaAttack)
  .done();
