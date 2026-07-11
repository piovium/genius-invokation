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

import { character, skill, summon, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 114012
 * @name 奥兹
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 * 菲谢尔普通攻击后：造成2点雷元素伤害。（需消耗可用次数）
 */
export const Oz01 = summon(114012)
  .conflictWith(114011)
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(2)
  .on("useSkill", (c, e) => e.skill.caller.definition.id === Fischl && e.isSkillType("normal"))
  .damage(DamageType.Electro, 2)
  .consumeUsage()
  .done();

/**
 * @id 114011
 * @name 奥兹
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 */
export const Oz = summon(114011)
  .conflictWith(114012)
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(2)
  .done();

/**
 * @id 14011
 * @name 罪灭之矢
 * @description
 * 造成2点物理伤害。
 */
export const BoltsOfDownfall = skill(14011)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14012
 * @name 夜巡影翼
 * @description
 * 造成1点雷元素伤害，召唤奥兹。
 */
export const Nightrider: SkillHandle = skill(14012)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 1)
  .if((c) => c.self.hasEquipment(StellarPredator))
  .summon(Oz01)
  .else()
  .summon(Oz)
  .done();

/**
 * @id 14013
 * @name 至夜幻现
 * @description
 * 造成4点雷元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
export const MidnightPhantasmagoria = skill(14013)
  .type("burst")
  .costElectro(3)
  .costEnergy(3)
  .damage(DamageType.Piercing, 2, "opp standby")
  .damage(DamageType.Electro, 4)
  .done();

/**
 * @id 1401
 * @name 菲谢尔
 * @description
 * 「奥兹！我之眷属，展开羽翼，替我在幽夜中寻求全新的命运之线吧！」
 * 「小姐，我可没办法帮你换一张牌啊…」
 */
export const Fischl = character(1401)
  .since("v3.3.0")
  .tags("electro", "bow", "mondstadt")
  .health(10)
  .energy(3)
  .skills(BoltsOfDownfall, Nightrider, MidnightPhantasmagoria)
  .done();

/**
 * @id 214011
 * @name 噬星魔鸦
 * @description
 * 战斗行动：我方出战角色为菲谢尔时，装备此牌。
 * 菲谢尔装备此牌后，立刻使用一次夜巡影翼。
 * 装备有此牌的菲谢尔生成的奥兹，会在菲谢尔普通攻击后造成2点雷元素伤害。（需消耗可用次数）
 * （牌组中包含菲谢尔，才能加入牌组）
 */
export const StellarPredator = card(214011)
  .since("v3.3.0")
  .costElectro(3)
  .talent(Fischl)
  .on("enter")
  .useSkill(Nightrider)
  .done();
