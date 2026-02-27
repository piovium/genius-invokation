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

import { character, skill, summon, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 124013
 * @name 雷锁镇域
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 * 此召唤物在场时：敌方执行「切换角色」行动的元素骰费用+1。（每回合1次）
 */
export const ChainsOfWardingThunder = summon(124013)
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(2)
  .on("addDice", (c, e) => c.self.who !== e.action.who && e.action.type === "switchActive")
  .usagePerRound(1)
  .listenToAll()
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 124015
 * @name 雷晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到6点生命值。
 */
export const ElectroCrystalCore01 = status(124015)
  .reserve();

/**
 * @id 124016
 * @name 雷晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到10点生命值。
 */
export const ElectroCrystalCore02 = status(124016)
  .reserve();

/**
 * @id 124014
 * @name 雷晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 */
export const ElectroCrystalCore = status(124014)
  .on("beforeDefeated")
  .immune(1)
  .dispose()
  .done();

/**
 * @id 24016
 * @name 猜拳三连击·布
 * @description
 * （需准备1个行动轮）
 * 造成3点雷元素伤害。
 */
export const RockpaperscissorsComboPaper = skill(24016)
  .type("elemental")
  .prepared()
  .damage(DamageType.Electro, 3)
  .done();

/**
 * @id 124012
 * @name 猜拳三连击·布
 * @description
 * 本角色将在下次行动时，直接使用技能：猜拳三连击·布。
 */
export const RockpaperscissorsComboPaperStatus = status(124012)
  .prepare(RockpaperscissorsComboPaper)
  .done();

/**
 * @id 24015
 * @name 猜拳三连击·剪刀
 * @description
 * （需准备1个行动轮）
 * 造成2点雷元素伤害，然后准备技能：猜拳三连击·布。
 */
export const RockpaperscissorsComboScissors = skill(24015)
  .type("elemental")
  .prepared()
  .damage(DamageType.Electro, 2)
  .done();

/**
 * @id 124011
 * @name 猜拳三连击·剪刀
 * @description
 * 本角色将在下次行动时，直接使用技能：猜拳三连击·剪刀。
 */
export const RockpaperscissorsComboScissorsStatus = status(124011)
  .prepare(RockpaperscissorsComboScissors, {
    nextStatus: RockpaperscissorsComboPaperStatus
  })
  .done();

/**
 * @id 24011
 * @name 雷晶投射
 * @description
 * 造成1点雷元素伤害。
 */
export const ElectroCrystalProjection = skill(24011)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Electro, 1)
  .done();

/**
 * @id 24012
 * @name 猜拳三连击
 * @description
 * 造成2点雷元素伤害，然后分别准备技能：猜拳三连击·剪刀和猜拳三连击·布。
 */
export const RockpaperscissorsCombo = skill(24012)
  .type("elemental")
  .costElectro(5)
  .damage(DamageType.Electro, 2)
  .characterStatus(RockpaperscissorsComboScissorsStatus)
  .done();

/**
 * @id 24013
 * @name 雳霆镇锁
 * @description
 * 造成2点雷元素伤害，召唤雷锁镇域。
 */
export const LightningLockdown = skill(24013)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 2)
  .summon(ChainsOfWardingThunder)
  .done();

/**
 * @id 24014
 * @name 雷晶核心
 * @description
 * 【被动】战斗开始时，初始附属雷晶核心。
 */
export const ElectroCrystalCoreSkill = skill(24014)
  .type("passive")
  .on("battleBegin")
  .characterStatus(ElectroCrystalCore)
  .done();

/**
 * @id 2401
 * @name 无相之雷
 * @description
 * 代号为「阿莱夫」的高级雷元素生命。
 * 就算猜拳获胜，它一般也不会认输。
 */
export const ElectroHypostasis = character(2401)
  .since("v3.7.0")
  .tags("electro", "monster")
  .health(8)
  .energy(2)
  .skills(ElectroCrystalProjection, RockpaperscissorsCombo, LightningLockdown, ElectroCrystalCoreSkill, RockpaperscissorsComboScissors, RockpaperscissorsComboPaper)
  .done();

/**
 * @id 224011
 * @name 汲能棱晶
 * @description
 * 战斗行动：我方出战角色为无相之雷时，治疗该角色3点，并附属雷晶核心。
 * （牌组中包含无相之雷，才能加入牌组）
 */
export const AbsorbingPrism = card(224011)
  .since("v3.7.0")
  .costElectro(2)
  .eventTalent(ElectroHypostasis)
  .heal(3, "my active")
  .characterStatus(ElectroCrystalCore, "my active")
  .done();
