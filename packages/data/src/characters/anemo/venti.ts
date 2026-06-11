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

import { character, skill, summon, combatStatus, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115034
 * @name 暴风之眼
 * @description
 * 结束阶段：造成2点风元素伤害，对方切换到距离我方出战角色最近的角色。
 * 可用次数：2
 * 我方角色或召唤物引发扩散反应后：转换此牌的元素类型，改为造成被扩散的元素类型的伤害。（离场前仅限一次）
 */
export const Stormeye = summon(115034)
  .endPhaseDamage("swirledAnemo", 2)
  .usage(2)
  .switchActive("recent opp from my active")
  .done();

/**
 * @id 115033
 * @name 协鸣之风
 * @description
 * 本回合中，我方角色下次「普通攻击」少花费1个无色元素。
 */
export const WindsOfHarmony = combatStatus(115033)
  .oneDuration()
  .once("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(1)
  .done();

/**
 * @id 115032
 * @name 风域
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。触发该效果后，使本回合中我方角色下次「普通攻击」少花费1个无色元素。
 * 可用次数：2
 */
export const Stormzone01 = combatStatus(115032)
  .conflictWith(115031)
  .on("deductOmniDiceSwitch")
  .usage(2)
  .deductOmniCost(1)
  .combatStatus(WindsOfHarmony)
  .done();

/**
 * @id 115031
 * @name 风域
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。
 * 可用次数：2
 */
export const Stormzone = combatStatus(115031)
  .conflictWith(115032)
  .on("deductOmniDiceSwitch")
  .usage(2)
  .deductOmniCost(1)
  .done();

/**
 * @id 15031
 * @name 神代射术
 * @description
 * 造成2点物理伤害。
 */
export const DivineMarksmanship = skill(15031)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15032
 * @name 高天之歌
 * @description
 * 造成2点风元素伤害，生成风域。
 */
export const SkywardSonnet: SkillHandle = skill(15032)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 2)
  .if((c) => c.self.hasEquipment(EmbraceOfWinds))
  .combatStatus(Stormzone01)
  .else()
  .combatStatus(Stormzone)
  .done();

/**
 * @id 15033
 * @name 风神之诗
 * @description
 * 造成2点风元素伤害，召唤暴风之眼。
 */
export const WindsGrandOde = skill(15033)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 2)
  .summon(Stormeye)
  .done();

/**
 * @id 1503
 * @name 温迪
 * @description
 * 「四季轮转，四风从不止息。」
 * 「当然啦，功劳也不是它们的，主要是我的。」
 * 「要是没有吟游诗人，谁去把这些传唱？」
 */
export const Venti = character(1503)
  .since("v3.7.0")
  .tags("anemo", "bow", "mondstadt")
  .health(12)
  .energy(2)
  .skills(DivineMarksmanship, SkywardSonnet, WindsGrandOde)
  .done();

/**
 * @id 215031
 * @name 绪风之拥
 * @description
 * 战斗行动：我方出战角色为温迪时，装备此牌。
 * 温迪装备此牌后，立刻使用一次高天之歌。
 * 装备有此牌的温迪生成的风域触发后，会使本回合中我方角色下次「普通攻击」少花费1个无色元素。
 * （牌组中包含温迪，才能加入牌组）
 */
export const EmbraceOfWinds = card(215031)
  .since("v3.7.0")
  .costAnemo(3)
  .talent(Venti)
  .on("enter")
  .useSkill(SkywardSonnet)
  .done();
