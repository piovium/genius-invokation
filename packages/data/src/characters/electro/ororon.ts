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

import { character, skill, summon, status, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 114161
 * @name 超音灵眼
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 我方出战角色受到伤害时：抵消1点伤害，然后此牌可用次数-1。（每回合1次）
 * 可用次数：3
 */
export const SupersonicOculus = summon(114161)
  .since("v6.3.0")
  // TODO
  .done();

/**
 * @id 114163
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 夜魂值为0时，退出夜魂加持。
 */
export const NightsoulsBlessing = status(114163)
  .since("v6.3.0")
  // TODO
  .done();

/**
 * @id 114162
 * @name 宿灵球
 * @description
 * 行动阶段开始时：造成1点雷元素伤害。
 * 可用次数：1
 */
export const SpiritOrb = combatStatus(114162)
  .since("v6.3.0")
  // TODO
  .done();

/**
 * @id 14161
 * @name 宿灵闪箭
 * @description
 * 造成2点物理伤害。
 */
export const SpiritvesselSnapshot = skill(14161)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  // TODO
  .done();

/**
 * @id 14162
 * @name 暝色缒索
 * @description
 * 造成2点雷元素伤害，生成宿灵球。
 */
export const NightsSling = skill(14162)
  .type("elemental")
  .costElectro(3)
  // TODO
  .done();

/**
 * @id 14163
 * @name 黯声回响
 * @description
 * 造成2点雷元素伤害，召唤超音灵眼。
 */
export const DarkVoicesEcho = skill(14163)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  // TODO
  .done();

/**
 * @id 14164
 * @name 夜翳的通感
 * @description
 * 【被动】我方触发感电反应后：如果可能，消耗2点「夜魂值」，造成1点雷元素伤害。
 * 我方造成此技能以外的水元素伤害或雷元素伤害后，自身进入夜魂加持，并获得1点「夜魂值」。（每回合1次）
 */
export const NightshadeSynesthesia = skill(14164)
  .type("passive")
  // TODO
  .done();

/**
 * @id 14165
 * @name 夜翳的通感
 * @description
 * 【被动】我方触发感电反应后：如果可能，消耗2点「夜魂值」，造成1点雷元素伤害。
 * 我方造成此技能以外的水元素伤害或雷元素伤害后，自身进入夜魂加持，并获得1点「夜魂值」。（每回合1次）
 */
export const NightshadeSynesthesia = skill(14165)
  .type("passive")
  // TODO
  .done();

/**
 * @id 1416
 * @name 欧洛伦
 * @description
 * 难辨难明之形色。
 */
export const Ororon = character(1416)
  .since("v6.3.0")
  .tags("electro", "bow", "natlan")
  .health(10)
  .energy(2)
  .skills(SpiritvesselSnapshot, NightsSling, DarkVoicesEcho, NightshadeSynesthesia, NightshadeSynesthesia)
  .done();

/**
 * @id 214161
 * @name 林雾间的行迹
 * @description
 * 快速行动：装备给我方的欧洛伦。
 * 我方每回合首次引发的感电反应造成的穿透伤害+1。
 * （牌组中包含欧洛伦，才能加入牌组）
 */
export const TrailsAmidstTheForestFog = card(214161)
  .since("v6.3.0")
  .costElectro(1)
  .talent(Ororon)
  // TODO
  .done();
