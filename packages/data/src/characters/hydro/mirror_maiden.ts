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

import { character, skill, status, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 122022
 * @name 水光破镜
 * @description
 * 所附属角色受到的水元素伤害+1。
 * 所附属角色切换到其他角色时：需要多花费1个元素骰。
 * 持续回合：3
 * （同一方场上最多存在一个此状态）
 */
export const Refraction01 = status(122022)
  .conflictWith(122021)
  .unique(122021)
  .duration(3)
  .on("increaseDamaged", (c, e) => e.type === DamageType.Hydro)
  .increaseDamage(1)
  .on("addDice", (c, e) => e.action.type === "switchActive" && c.self.master.id === e.action.from?.id)
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 122021
 * @name 水光破镜
 * @description
 * 所附属角色切换到其他角色时：需要多花费1个元素骰。
 * 持续回合：2
 * （同一方场上最多存在一个此状态）
 */
export const Refraction = status(122021)
  .conflictWith(122022)
  .unique(122022)
  .duration(2)
  .on("addDice", (c, e) => e.action.type === "switchActive" && c.self.master.id === e.action.from?.id)
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 22021
 * @name 水弹
 * @description
 * 造成1点水元素伤害。
 */
export const WaterBall = skill(22021)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成3点水元素伤害，目标角色附属水光破镜。
 */
export const InfluxBlast: SkillHandle = skill(22022)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 3)
  .if((c) => c.self.hasEquipment(MirrorCage))
  .characterStatus(Refraction01, "opp active")
  .else()
  .characterStatus(Refraction, "opp active")
  .done();

/**
 * @id 22023
 * @name 粼镜折光
 * @description
 * 造成5点水元素伤害。
 */
export const RippledReflection = skill(22023)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 5)
  .done();

/**
 * @id 2202
 * @name 愚人众·藏镜仕女
 * @description
 * 一切隐秘，都将深藏于潋光的水镜之中吧…
 */
export const MirrorMaiden = character(2202)
  .since("v3.3.0")
  .tags("hydro", "fatui")
  .health(10)
  .energy(2)
  .skills(WaterBall, InfluxBlast, RippledReflection)
  .done();

/**
 * @id 222021
 * @name 镜锢之笼
 * @description
 * 战斗行动：我方出战角色为愚人众·藏镜仕女时，装备此牌。
 * 愚人众·藏镜仕女装备此牌后，立刻使用一次潋波绽破。
 * 装备有此牌的愚人众·藏镜仕女生成的水光破镜初始持续回合+1，并且会使所附属角色受到的水元素伤害+1。
 * （牌组中包含愚人众·藏镜仕女，才能加入牌组）
 */
export const MirrorCage = card(222021)
  .since("v3.3.0")
  .costHydro(3)
  .talent(MirrorMaiden)
  .on("enter")
  .useSkill(InfluxBlast)
  .done();
