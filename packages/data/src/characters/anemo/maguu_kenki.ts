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

import { character, skill, summon, status, card, DamageType, type SummonHandle, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 125012
 * @name 剑影·霜驰
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 */
export const ShadowswordGallopingFrost: SummonHandle = summon(125012)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .on("useSkill", (c, e) => e.skill.definition.id === PseudoTenguSweeper)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 125011
 * @name 剑影·孤风
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：2
 */
export const ShadowswordLoneGale: SummonHandle = summon(125011)
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(2)
  .on("useSkill", (c, e) => e.skill.definition.id === PseudoTenguSweeper)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 125013
 * @name 凶面归位
 * @description
 * 结束阶段：切换到所附属角色。
 */
export const TerrormasksReturn = status(125013)
  .reserve();

/**
 * @id 25011
 * @name 一文字
 * @description
 * 造成2点物理伤害。
 */
export const Ichimonji = skill(25011)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 25012
 * @name 孤风刀势
 * @description
 * 召唤剑影·孤风。
 */
export const BlusteringBlade: SkillHandle = skill(25012)
  .type("elemental")
  .costAnemo(3)
  .summon(ShadowswordLoneGale)
  .if((c) => c.self.hasEquipment(TranscendentAutomaton))
  .switchActive("my next")
  .done();

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 召唤剑影·霜驰。
 */
export const FrostyAssault: SkillHandle = skill(25013)
  .type("elemental")
  .costCryo(3)
  .summon(ShadowswordGallopingFrost)
  .if((c) => c.self.hasEquipment(TranscendentAutomaton))
  .switchActive("my prev")
  .done();

/**
 * @id 25014
 * @name 机巧伪天狗抄
 * @description
 * 造成4点风元素伤害，触发所有我方剑影召唤物的效果。（不消耗其可用次数）
 */
export const PseudoTenguSweeper = skill(25014)
  .type("burst")
  .costAnemo(3)
  .costEnergy(3)
  .damage(DamageType.Anemo, 4)
  .done();

/**
 * @id 2501
 * @name 魔偶剑鬼
 * @description
 * 今日，其仍徘徊在因缘断绝之地。
 */
export const MaguuKenki = character(2501)
  .since("v3.3.0")
  .tags("anemo", "monster")
  .health(10)
  .energy(3)
  .skills(Ichimonji, BlusteringBlade, FrostyAssault, PseudoTenguSweeper)
  .done();

/**
 * @id 225011
 * @name 机巧神通
 * @description
 * 战斗行动：我方出战角色为魔偶剑鬼时，装备此牌。
 * 魔偶剑鬼装备此牌后，立刻使用一次孤风刀势。
 * 装备有此牌的魔偶剑鬼使用孤风刀势后，我方切换到后一个角色；使用霜驰影突后，我方切换到前一个角色。
 * （牌组中包含魔偶剑鬼，才能加入牌组）
 */
export const TranscendentAutomaton = card(225011)
  .since("v3.3.0")
  .costAnemo(3)
  .talent(MaguuKenki)
  .on("enter")
  .useSkill(BlusteringBlade)
  .done();
