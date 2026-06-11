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

import { character, skill, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 112022
 * @name 虹剑势
 * @description
 * 我方角色普通攻击后：造成1点水元素伤害。
 * 可用次数：3
 */
export const RainbowBladework = combatStatus(112022)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(3)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 112023
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为2的伤害时：抵消1点伤害。
 * 可用次数：3
 */
export const RainSword01 = combatStatus(112023)
  .conflictWith(112021)
  .on("decreaseDamaged", (c, e) => e.target.isActive() && e.value >= 2)
  .usage(3)
  .decreaseDamage(1)
  .done();

/**
 * @id 112021
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为3的伤害时：抵消1点伤害。
 * 可用次数：2
 */
export const RainSword = combatStatus(112021)
  .tags("barrier")
  .conflictWith(112023)
  .on("decreaseDamaged", (c, e) => e.target.isActive() && e.value >= 3)
  .usage(2)
  .decreaseDamage(1)
  .done();

/**
 * @id 12021
 * @name 古华剑法
 * @description
 * 造成2点物理伤害。
 */
export const GuhuaStyle = skill(12021)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12022
 * @name 画雨笼山
 * @description
 * 造成2点水元素伤害，本角色附着水元素，生成雨帘剑。
 */
export const FatalRainscreen: SkillHandle = skill(12022)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .apply(DamageType.Hydro, "@self")
  .if((c) => c.self.hasEquipment(TheScentRemained))
  .combatStatus(RainSword01)
  .else()
  .combatStatus(RainSword)
  .done();

/**
 * @id 12023
 * @name 裁雨留虹
 * @description
 * 造成2点水元素伤害，本角色附着水元素，生成虹剑势。
 */
export const Raincutter = skill(12023)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .apply(DamageType.Hydro, "@self")
  .combatStatus(RainbowBladework)
  .done();

/**
 * @id 1202
 * @name 行秋
 * @description
 * 「怎么最近小说里的主角，都是些私塾里的学生…」
 */
export const Xingqiu = character(1202)
  .since("v3.3.0")
  .tags("hydro", "sword", "liyue")
  .health(10)
  .energy(2)
  .skills(GuhuaStyle, FatalRainscreen, Raincutter)
  .done();

/**
 * @id 212021
 * @name 重帘留香
 * @description
 * 战斗行动：我方出战角色为行秋时，装备此牌。
 * 行秋装备此牌后，立刻使用一次画雨笼山。
 * 装备有此牌的行秋生成的雨帘剑改为可以抵挡至少为2的伤害，并且初始可用次数+1。
 * （牌组中包含行秋，才能加入牌组）
 */
export const TheScentRemained = card(212021)
  .since("v3.3.0")
  .costHydro(3)
  .talent(Xingqiu)
  .on("enter")
  .useSkill(FatalRainscreen)
  .done();
