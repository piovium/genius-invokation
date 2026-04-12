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

import { character, skill, status, combatStatus, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 122036
 * @name 深渊潮声
 * @description
 * 所附属角色无法使用技能。
 * 结束阶段：对所附属角色造成6点穿透伤害，然后移除此效果。
 */
export const AbyssalTides = status(122036)
  .reserve();

/**
 * @id 22035
 * @name 涟锋旋刃
 * @description
 * 造成1点水元素伤害。
 */
export const RipplingBlades = skill(22035)
  .type("elemental")
  .prepared()
  .costHydro(3)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 122032
 * @name 涟锋旋刃
 * @description
 * 本角色将在下次行动时，直接使用技能：涟锋旋刃。
 */
export const RipplingBladesStatus = status(122032)
  .prepare(RipplingBlades)
  .done();

/**
 * @id 122035
 * @name 涌流护罩
 * @description
 * 所附属角色免疫所有伤害。
 * 此状态提供2次水元素附着（可被元素反应消耗）：耗尽后移除此效果，并使所附属角色无法使用技能且在结束阶段受到6点穿透伤害。
 */
export const SurgingShield = status(122035)
  .reserve();

/**
 * @id 122037
 * @name 水之新生·锐势
 * @description
 * 角色造成的物理伤害变为水元素伤害，且水元素伤害+1。
 */
export const WateryRebirthHoned = status(122037)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Hydro)
  .increaseDamage(1)
  .done();

/**
 * @id 122031
 * @name 水之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到4点生命值。此效果触发后，角色造成的物理伤害变为水元素伤害，且水元素伤害+1。
 */
export const WateryRebirthStatus = status(122031)
  .on("beforeDefeated")
  .immune(4)
  .do((c) => {
    const talent = c.self.master.hasEquipment(SurgingUndercurrent);
    if (talent) {
      c.combatStatus(CurseOfTheUndercurrent, "opp");
    }
    c.self.master.setVariable("wateryRebirthTriggered", 1);
  })
  .characterStatus(WateryRebirthHoned, "@master")
  .dispose()
  .done();

/**
 * @id 122033
 * @name 暗流的诅咒
 * @description
 * 所在阵营的角色使用元素战技或元素爆发时：需要多花费1个元素骰。
 * 可用次数：2
 */
export const CurseOfTheUndercurrent = combatStatus(122033)
  .on("addDice", (c, e) => e.isSkillType("elemental") || e.isSkillType("burst"))
  .usage(2)
  .addCost(DiceType.Omni, 1)
  .done();

/**
 * @id 22031
 * @name 波刃锋斩
 * @description
 * 造成2点物理伤害。
 */
export const RipplingSlash = skill(22031)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 22032
 * @name 洄涡锋刃
 * @description
 * 造成1点水元素伤害，然后准备技能：涟锋旋刃。
 */
export const VortexEdge = skill(22032)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 1)
  .characterStatus(RipplingBladesStatus, "@self")
  .done();

/**
 * @id 22033
 * @name 激流强震
 * @description
 * 造成3点水元素伤害。在对方场上生成暗流的诅咒。
 */
export const TorrentialShock = skill(22033)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 3)
  .combatStatus(CurseOfTheUndercurrent, "opp")
  .done();

/**
 * @id 22034
 * @name 水之新生
 * @description
 * 【被动】战斗开始时，初始附属水之新生。
 */
export const WateryRebirth = skill(22034)
  .type("passive")
  .on("battleBegin")
  .characterStatus(WateryRebirthStatus)
  .done();


/**
 * @id 22037
 * @name 护罩碎裂
 * @description
 *
 */
export const BrokenShield = skill(22037)
  .type("passive")
  .reserve();

/**
 * @id 22038
 * @name 水之新生
 * @description
 *
 */
export const WateryRebirth01 = skill(22038)
  .type("passive")
  .variable("wateryRebirthTriggered", 0)
  .done();

/**
 * @id 2203
 * @name 深渊使徒·激流
 * @description
 * 断绝诸世，万物湮灭。
 */
export const AbyssHeraldWickedTorrents = character(2203)
  .since("v4.6.0")
  .tags("hydro", "monster")
  .health(6)
  .energy(2)
  .skills(RipplingSlash, VortexEdge, TorrentialShock, WateryRebirth, RipplingBlades, WateryRebirth01)
  .done();

// 暗流涌动入场时创建此出战状态，检测使徒击倒后生成暗流的诅咒
export const SurgingUndercurrentCombatStatus = combatStatus(122034)
  .on("defeated", (c, e) => e.target.definition.id === AbyssHeraldWickedTorrents)
  .combatStatus(CurseOfTheUndercurrent, "opp")
  .dispose()
  .done();

/**
 * @id 222031
 * @name 暗流涌动
 * @description
 * 入场时：如果装备有此牌的深渊使徒·激流已触发过水之新生，则在对方场上生成暗流的诅咒。
 * 装备有此牌的深渊使徒·激流被击倒或触发水之新生时：在对方场上生成暗流的诅咒。
 * （牌组中包含深渊使徒·激流，才能加入牌组）
 */
export const SurgingUndercurrent = card(222031)
  .since("v4.6.0")
  .costHydro(1)
  .talent(AbyssHeraldWickedTorrents, "none")
  .on("enter")
  .do((c) => {
    c.combatStatus(SurgingUndercurrentCombatStatus);
    if (c.self.master.getVariable("wateryRebirthTriggered")) {
      c.combatStatus(CurseOfTheUndercurrent, "opp");
    }
  })
  .done();
