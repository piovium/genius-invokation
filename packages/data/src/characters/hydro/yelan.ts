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
 * @id 112091
 * @name 破局
 * @description
 * 此状态初始具有1层「破局」；重复附属时，叠加1层「破局」。「破局」最多可以叠加到3层。
 * 结束阶段：叠加1层「破局」。
 * 所附属角色普通攻击时：如果「破局」已有2层，则消耗2层「破局」，使造成的物理伤害转换为水元素伤害，并抓1张牌。
 */
export const BreakthroughStatus = status(112091)
  .variableCanAppend("break", 1, 3)
  .on("endPhase")
  .addVariableWithMax("break", 1, 3)
  .on("modifySkillDamageType", (c, e) => e.viaSkillType("normal") && c.getVariable("break") >= 2)
  .addVariable("break", -2)
  .changeDamageType(DamageType.Hydro)
  .drawCards(1)
  .done();

/**
 * @id 112092
 * @name 玄掷玲珑
 * @description
 * 我方角色普通攻击后：造成1点水元素伤害。
 * 持续回合：2
 */
export const ExquisiteThrow = combatStatus(112092)
  .duration(2)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12091
 * @name 潜形隐曜弓
 * @description
 * 造成2点物理伤害。
 */
export const StealthyBowshot = skill(12091)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12092
 * @name 萦络纵命索
 * @description
 * 造成3点水元素伤害，此角色的破局层数+2。
 */
export const LingeringLifeline = skill(12092)
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    c.damage(DamageType.Hydro, 3);
    const breakSt = c.self.hasStatus(BreakthroughStatus)!;
    breakSt.addVariableWithMax("break", 2, 3);
  })
  .done();

/**
 * @id 12093
 * @name 渊图玲珑骰
 * @description
 * 造成3点水元素伤害，生成玄掷玲珑。
 */
export const DepthclarionDice = skill(12093)
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .damage(DamageType.Hydro, 3)
  .combatStatus(ExquisiteThrow)
  .done();

/**
 * @id 12094
 * @name 破局
 * @description
 * 【被动】战斗开始时，初始附属破局。
 */
export const Breakthrough = skill(12094)
  .type("passive")
  .on("battleBegin")
  .characterStatus(BreakthroughStatus)
  .on("revive")
  .characterStatus(BreakthroughStatus)
  .done();

/**
 * @id 1209
 * @name 夜兰
 * @description
 * 天地一渺渺，幽客自来去。
 */
export const Yelan = character(1209)
  .since("v4.3.0")
  .tags("hydro", "bow", "liyue")
  .health(11)
  .energy(3)
  .skills(StealthyBowshot, LingeringLifeline, DepthclarionDice, Breakthrough)
  .done();

/**
 * @id 212091
 * @name 猜先有方
 * @description
 * 战斗行动：我方出战角色为夜兰时，装备此牌。
 * 夜兰装备此牌后，立刻使用一次萦络纵命索。
 * 投掷阶段：装备有此牌的夜兰在场，则我方队伍中每有1种元素类型，就使1个元素骰总是投出万能元素。（最多3个）
 * （牌组中包含夜兰，才能加入牌组）
 */
export const TurnControl = card(212091)
  .since("v4.3.0")
  .costHydro(3)
  .talent(Yelan)
  .on("enter")
  .useSkill(LingeringLifeline)
  .on("roll")
  .do((c, e) => {
    const elements = new Set(c.$$("my characters include defeated").map((char) => char.element()));
    e.fixDice(DiceType.Omni, Math.min(elements.size, 3));
  })
  .done();
