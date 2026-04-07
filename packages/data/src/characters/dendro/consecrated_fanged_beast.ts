// Copyright (C) 2026 Piovium Labs
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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 127051
 * @name 催萌腐草
 * @description
 * 本角色将在下次行动时，直接使用技能：催萌腐草。
 */
export const SproutsOfTheBlightedRotStatus = status(127051)
  .since("v6.5.0")
  // TODO
  .done();

/**
 * @id 27051
 * @name 利爪猛击
 * @description
 * 造成2点物理伤害。
 */
export const ClawSlash = skill(27051)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  // TODO
  .done();

/**
 * @id 27052
 * @name 掠能绿波
 * @description
 * 造成2点草元素伤害，从牌组中抓1张噬骸能量块。
 */
export const SiphonWave = skill(27052)
  .type("elemental")
  .costDendro(3)
  // TODO
  .done();

/**
 * @id 27053
 * @name 横生厄蔓
 * @description
 * 造成4点草元素伤害，如果手牌中存在噬骸能量块，则舍弃1张并准备技能催萌腐草。
 */
export const SprawlingBlightedVines = skill(27053)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  // TODO
  .done();

/**
 * @id 27054
 * @name 亡骸饥渴
 * @description
 * 【被动】战斗开始时，生成2张噬骸能量块放入牌组底。我方每回合可以额外打出1张噬骸能量块。
 */
export const HungerFromTheRemains = skill(27054)
  .type("passive")
  // TODO
  .done();

/**
 * @id 27055
 * @name 催萌腐草
 * @description
 * 造成2点草元素伤害。
 */
export const SproutsOfTheBlightedRot = skill(27055)
  .type("burst")
  // TODO
  .done();

/**
 * @id 27056
 * @name 亡骸饥渴
 * @description
 * 【被动】战斗开始时，生成2张噬骸能量块放入牌组底。我方每回合可以额外打出1张噬骸能量块。
 */
export const HungerFromTheRemains01 = skill(27056)
  .type("passive")
  .reserve();

/**
 * @id 2705
 * @name 圣骸牙兽
 * @description
 * 因为啃噬伟大的生命体，而扭曲异变的掠食者。驱使着狂乱的蔓草之力。
 */
export const ConsecratedFangedBeast = character(2705)
  .since("v6.5.0")
  .tags("dendro", "monster", "sacread")
  .health(10)
  .energy(2)
  .skills(ClawSlash, SiphonWave, SprawlingBlightedVines, HungerFromTheRemains, SproutsOfTheBlightedRot, HungerFromTheRemains)
  .done();

/**
 * @id 227051
 * @name 亡草蔽日
 * @description
 * 快速行动：装备给我方的圣骸牙兽。
 * 我方打出或舍弃噬骸能量块时：抓1张牌。（每回合1次）
 * （牌组中包含圣骸牙兽，才能加入牌组）
 */
export const WitheredReedsEclipseTheSun = card(227051)
  .since("v6.5.0")
  .costDendro(1)
  .talent(ConsecratedFangedBeast)
  // TODO
  .done();
