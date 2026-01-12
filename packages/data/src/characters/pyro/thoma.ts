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

import { character, skill, combatStatus, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113111
 * @name 烈烧佑命护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，最多叠加到3点）
 */
export const BlazingBarrier = combatStatus(113111)
  .shield(1, 3)
  .done();

/**
 * @id 113113
 * @name 炽火大铠
 * @description
 * 我方角色普通攻击后：造成1点火元素伤害，生成烈烧佑命护盾。
 * 可用次数：3
 */
export const ScorchingOoyoroi01 = combatStatus(113113)
  .conflictWith(113112)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(3)
  .damage(DamageType.Pyro, 1)
  .combatStatus(BlazingBarrier)
  .done();

/**
 * @id 113112
 * @name 炽火大铠
 * @description
 * 我方角色普通攻击后：造成1点火元素伤害，生成烈烧佑命护盾。
 * 可用次数：2
 */
export const ScorchingOoyoroi = combatStatus(113112)
  .conflictWith(113113)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(2)
  .damage(DamageType.Pyro, 1)
  .combatStatus(BlazingBarrier)
  .done();

/**
 * @id 13111
 * @name 迅破枪势
 * @description
 * 造成2点物理伤害。
 */
export const SwiftshatterSpear = skill(13111)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13112
 * @name 烈烧佑命之侍护
 * @description
 * 造成2点火元素伤害，生成烈烧佑命护盾。
 */
export const BlazingBlessing = skill(13112)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 2)
  .combatStatus(BlazingBarrier)
  .done();

/**
 * @id 13113
 * @name 真红炽火之大铠
 * @description
 * 造成2点火元素伤害，生成烈烧佑命护盾和炽火大铠。
 */
export const CrimsonOoyoroi: SkillHandle = skill(13113)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 2)
  .combatStatus(BlazingBarrier)
  .if((c) => c.self.hasEquipment(ASubordinatesSkills))
  .combatStatus(ScorchingOoyoroi01)
  .else()
  .combatStatus(ScorchingOoyoroi)
  .done();

/**
 * @id 1311
 * @name 托马
 * @description
 * 渡来介者，赤袖丹心。
 */
export const Thoma = character(1311)
  .since("v4.4.0")
  .tags("pyro", "pole", "inazuma")
  .health(12)
  .energy(2)
  .skills(SwiftshatterSpear, BlazingBlessing, CrimsonOoyoroi)
  .done();

/**
 * @id 213111
 * @name 僚佐的才巧
 * @description
 * 战斗行动：我方出战角色为托马时，装备此牌。
 * 托马装备此牌后，立刻使用一次真红炽火之大铠。
 * 装备有此牌的托马生成的炽火大铠，初始可用次数+1。
 * （牌组中包含托马，才能加入牌组）
 */
export const ASubordinatesSkills = card(213111)
  .since("v4.4.0")
  .costPyro(3)
  .costEnergy(2)
  .talent(Thoma)
  .on("enter")
  .useSkill(CrimsonOoyoroi)
  .done();
