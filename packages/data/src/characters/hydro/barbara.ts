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

import { character, skill, summon, card, DamageType, DiceType, SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 112011
 * @name 歌声之环
 * @description
 * 结束阶段：治疗所有我方角色1点，然后对我方出战角色附着水元素。
 * 可用次数：2
 */
export const MelodyLoop: SummonHandle = summon(112011)
  .endPhaseDamage(DamageType.Heal, 1, "all my characters")
  .usage(2)
  .apply(DamageType.Hydro, "my active")
  .done();

/**
 * @id 12011
 * @name 水之浅唱
 * @description
 * 造成1点水元素伤害。
 */
export const WhisperOfWater = skill(12011)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12012
 * @name 演唱，开始♪
 * @description
 * 造成1点水元素伤害，召唤歌声之环。
 */
export const LetTheShowBegin = skill(12012)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 1)
  .summon(MelodyLoop)
  .done();

/**
 * @id 12013
 * @name 闪耀奇迹♪
 * @description
 * 治疗所有我方角色4点。
 */
export const ShiningMiracle = skill(12013)
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .heal(4, "all my characters")
  .done();

/**
 * @id 1201
 * @name 芭芭拉
 * @description
 * 无论何时都能治愈人心。
 */
export const Barbara = character(1201)
  .since("v3.3.0")
  .tags("hydro", "catalyst", "mondstadt")
  .health(12)
  .energy(3)
  .skills(WhisperOfWater, LetTheShowBegin, ShiningMiracle)
  .done();

/**
 * @id 212011
 * @name 光辉的季节
 * @description
 * 战斗行动：我方出战角色为芭芭拉时，装备此牌。
 * 芭芭拉装备此牌后，立刻使用一次演唱，开始♪。
 * 装备有此牌的芭芭拉在场时，歌声之环会使我方执行「切换角色」行动时少花费1个元素骰。（每回合1次）
 * （牌组中包含芭芭拉，才能加入牌组）
 */
export const GloriousSeason = card(212011)
  .since("v3.3.0")
  .costHydro(3)
  .talent(Barbara)
  .on("enter")
  .useSkill(LetTheShowBegin)
  .on("deductOmniDiceSwitch", (c) => c.$(`my summon with definition id ${MelodyLoop}`))
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();
