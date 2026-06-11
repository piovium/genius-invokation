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

import { character, skill, status, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113053
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 所附属角色使用普通攻击后：造成1点火元素伤害。
 * 可用次数：3
 */
export const NiwabiEnshou01 = status(113053)
  .conflictWith(113051)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(3)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 113051
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 可用次数：3
 */
export const NiwabiEnshou = status(113051)
  .conflictWith(113053)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(3)
  .increaseDamage(1)
  .done();

/**
 * @id 113052
 * @name 琉金火光
 * @description
 * 宵宫以外的我方角色使用技能后：造成1点火元素伤害。
 * 持续回合：2
 */
export const AurousBlaze = combatStatus(113052)
  .duration(2)
  .on("useSkill", (c, e) => e.skill.caller.definition.id !== Yoimiya)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 13051
 * @name 烟火打扬
 * @description
 * 造成2点物理伤害。
 */
export const FireworkFlareup = skill(13051)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13052
 * @name 焰硝庭火舞
 * @description
 * 本角色附属庭火焰硝。（此技能不产生充能）
 */
export const NiwabiFiredance: SkillHandle = skill(13052)
  .type("elemental")
  .costPyro(1)
  .noEnergy()
  .if((c) => c.self.hasEquipment(NaganoharaMeteorSwarm))
  .characterStatus(NiwabiEnshou01)
  .else()
  .characterStatus(NiwabiEnshou)
  .done();

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成3点火元素伤害，生成琉金火光。
 */
export const RyuukinSaxifrage: SkillHandle = skill(13053)
  .type("burst")
  .costPyro(3)
  .costEnergy(3)
  .damage(DamageType.Pyro, 3)
  .combatStatus(AurousBlaze)
  .done();

/**
 * @id 1305
 * @name 宵宫
 * @description
 * 花见坂第十一届全街邀请赛「长野原队」队长兼首发牌手。
 */
export const Yoimiya = character(1305)
  .since("v3.3.0")
  .tags("pyro", "bow", "inazuma")
  .health(10)
  .energy(3)
  .skills(FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage)
  .done();

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫所生成的庭火焰硝触发后额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
export const NaganoharaMeteorSwarm = card(213051)
  .since("v3.3.0")
  .costPyro(1)
  .talent(Yoimiya)
  .on("enter")
  .useSkill(NiwabiFiredance)
  .done();
