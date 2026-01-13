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

import { status, combatStatus, summon, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 100
 * @name 抵抗之躯
 * 角色免疫冻结、眩晕、石化的效果。
 */
export const ResistantForm = status(100)
  .tags("immuneControl")
  .done();

/**
 * @id 106
 * @name 冻结
 * @description
 * 角色无法使用技能。（持续到回合结束）
 * 角色受到火元素伤害或物理伤害时，移除此效果，使该伤害+2。
 */
export const Frozen = status(106)
  .oneDuration()
  .tags("disableSkill")
  .on("increaseDamaged", (c, e) => ([DamageType.Pyro, DamageType.Physical] as DamageType[]).includes(e.type))
  .increaseDamage(2)
  .dispose()
  .done();

/**
 * @id 111
 * @name 结晶
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，最多叠加到2点）
 */
export const Crystallize = combatStatus(111)
  .shield(1, 2)
  .done();

/**
 * @id 115
 * @name 燃烧烈焰
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const BurningFlame = summon(115)
  .endPhaseDamage(DamageType.Pyro, 1)
  .usageCanAppend(1, 2)
  .done();

/**
 * @id 116
 * @name 草原核
 * @description
 * 我方对敌方出战角色造成火元素伤害或雷元素伤害时，伤害值+2。
 * 可用次数：1
 */
export const DendroCore = combatStatus(116)
  .on("increaseDamage", (c, e) =>
    ([DamageType.Pyro, DamageType.Electro] as DamageType[]).includes(e.type) &&
    e.target.id === c.$("opp active")?.id)
  .usage(1)
  .increaseDamage(2)
  .done();

/**
 * @id 117
 * @name 激化领域
 * @description
 * 我方对敌方出战角色造成雷元素伤害或草元素伤害时，伤害值+1。
 * 可用次数：2
 */
export const CatalyzingField = combatStatus(117)
  .on("increaseDamage", (c, e) =>
    ([DamageType.Electro, DamageType.Dendro] as DamageType[]).includes(e.type) &&
    e.target.id === c.$("opp active")?.id)
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 122
 * @name 生命之契
 * @description
 * 所附属角色受到治疗时：此效果每有1次可用次数，就消耗1次，以抵消1点所受到的治疗。（无法抵消复苏或分配生命值引发的治疗）
 * 可用次数：1（可叠加，没有上限）。
 */
export const BondOfLife = status(122)
  .tags("bondOfLife")
  .on("decreaseHealed", (c, e) => e.healInfo.healKind !== "distribution")
  .usage(1, {
    append: { limit: Infinity },
    autoDecrease: false,
  })
  .do((c, e) => {
    const deducted = Math.min(c.getVariable("usage"), e.expectedValue);
    e.decreaseHeal(deducted);
    c.consumeUsage(deducted);
  })
  .done();

/**
 * @id 169
 * @name 高效切换
 * @description
 * 我方下次执行「切换角色」行动时：少花费1个元素骰。
 */
export const EfficientSwitch = combatStatus(169)
  .on("deductOmniDiceSwitch")
  .usageCanAppend(1, Infinity)
  .deductOmniCost(1)
  .done()

/**
 * @id 170
 * @name 敏捷切换
 * @description
 * 我方下次执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（可叠加，没有上限）
 */
export const AgileSwitch = combatStatus(170)
  .on("beforeFastSwitch")
  .usageCanAppend(1, Infinity)
  .setFastAction()
  .done();

/**
 * @id 171
 * @name 完成冒险！
 * @description
 * 已完成过一次冒险。
 */
export const AdventureCompleted = combatStatus(171)
  .variableCanAppend("layer", 1, Infinity)
  .done();

/**
 * @id 172
 * @name 战斗计划
 * @description
 * 所附属角色下次使用技能少花费1个元素骰。
 * 可用次数：1（可叠加，没有上限）
 */
export const BattlePlan = status(172)
  .on("deductOmniDiceSkill")
  .usageCanAppend(1, Infinity)
  .deductOmniCost(1)
  .done();

/**
 * @id 203
 * @name 护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，没有上限）
 */
export const Shield = combatStatus(203)
  .shield(1, Infinity)
  .done();;

/**
 * @id 303300
 * @name 饱腹
 * @description
 * 本回合无法食用更多「料理」
 */
export const Satiated = status(303300)
  .oneDuration()
  .done();
