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

import { character, skill, status, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 115103
 * @name 踏风腾跃
 * @description
 * 角色进行普通攻击时：此技能视为下落攻击，并且伤害+1。技能结算后，造成1点风元素伤害。
 * 可用次数：1
 */
export const SoaringOnTheWind = status(115103)
  .since("v5.0.0")
  .tags("normalAsPlunging")
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(1)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 115104
 * @name 闲云冲击波
 * @description
 * 我方切换到所附属角色后：造成1点风元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const DriftcloudWave = status(115104)
  .since("v5.0.0")
  .on("switchActive", (c, e) => c.self.master.id === e.switchInfo.to.id)
  .usageCanAppend(1, 2)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 115101
 * @name 步天梯
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const Skyladder = combatStatus(115101)
  .since("v5.0.0")
  .on("deductOmniDiceSwitch")
  .usageCanAppend(1, 2)
  .deductOmniCost(1)
  .done();

/**
 * @id 115102
 * @name 竹星
 * @description
 * 特技：仙力助推
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1151021: 仙力助推] (1*Aligned) 治疗所附属角色2点，并使其下次普通攻击视为下落攻击，伤害+1，并且技能结算后造成1点风元素伤害。
 */
export const Starwicker = card(115102)
  .since("v5.0.0")
  .undiscoverable()
  .technique()
  .provideSkill(1151021)
  .costSame(1)
  .usage(2)
  .heal(2, "@master")
  .characterStatus(SoaringOnTheWind, "@master")
  .done();

/**
 * @id 15101
 * @name 清风散花词
 * @description
 * 造成1点风元素伤害。
 */
export const WordOfWindAndFlower = skill(15101)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 15102
 * @name 朝起鹤云
 * @description
 * 造成1点风元素伤害，生成步天梯，本角色附属闲云冲击波。
 */
export const WhiteCloudsAtDawn = skill(15102)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 1)
  .combatStatus(Skyladder)
  .characterStatus(DriftcloudWave)
  .done();

/**
 * @id 15103
 * @name 暮集竹星
 * @description
 * 造成1点风元素伤害，治疗所有我方角色1点，生成手牌竹星。
 * （装备有竹星的角色可以使用特技：仙力助推）
 */
export const StarsGatherAtDusk = skill(15103)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 1)
  .heal(1, "all my characters")
  .createHandCard(Starwicker)
  .done();

/**
 * @id 1510
 * @name 闲云
 * @description
 * 侠中影，云里客。
 */
export const Xianyun = character(1510)
  .since("v5.0.0")
  .tags("anemo", "catalyst", "liyue")
  .health(11)
  .energy(2)
  .skills(WordOfWindAndFlower, WhiteCloudsAtDawn, StarsGatherAtDusk)
  .done();

/**
 * @id 215101
 * @name 知是留云僊
 * @description
 * 战斗行动：我方出战角色为闲云时，装备此牌。
 * 闲云装备此牌后，立刻使用一次朝起鹤云。
 * 我方切换角色时，此牌累积1层「风翎」。（每回合最多累积2层）
 * 装备有此牌的闲云使用清风散花词时，消耗所有「风翎」，每消耗1层都使伤害+1。
 * （牌组中包含闲云，才能加入牌组）
 */
export const TheyCallHerCloudRetainer = card(215101)
  .since("v5.0.0")
  .costAnemo(3)
  .talent(Xianyun)
  .variable("feather", 0)
  .on("enter")
  .useSkill(WhiteCloudsAtDawn)
  .on("switchActive")
  .listenToPlayer()
  .usagePerRound(2)
  .addVariable("feather", 1)
  .on("increaseSkillDamage", (c, e) => e.via.definition.id === WordOfWindAndFlower)
  .do((c, e) => {
    const feather = c.getVariable("feather");
    e.increaseDamage(feather);
    c.setVariable("feather", 0);
  })
  .done();
