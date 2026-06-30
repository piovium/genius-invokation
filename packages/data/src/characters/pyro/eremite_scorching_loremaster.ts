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

import { character, skill, summon, status, card, DamageType, type SkillHandle, combatStatus, type PassiveSkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 123032
 * @name 魔蝎祝福
 * @description
 * 我方使用厄灵·炎之魔蝎的特技时：移除此效果，每有1层「魔蝎祝福」，就使此特技造成的伤害+1。
 * （「魔蝎祝福」的层数可叠加，没有上限）
 */
export const ScorpionBlessing = combatStatus(123032)
  .variableCanAppend("blessing", 1, Infinity)
  .on("increaseTechniqueDamage", (c, e) => e.via.definition.id === 1230311)
  .do((c, e) => {
    e.increaseDamage(c.getVariable("blessing"));
    c.dispose();
  })
  .done();

/**
 * @id 123031
 * @name 厄灵·炎之魔蝎
 * @description
 * 所附属角色受到伤害时：如可能，失去1点充能，以抵消1点伤害，然后生成魔蝎祝福。（每回合至多2次）
 * 特技：炙烧攻势
 * 可用次数：1
 * （角色最多装备1个「特技」）
 * [1230311: 炙烧攻势] (2*Aligned) 造成2点火元素伤害。
 * [1230312: ] ()
 */
export const SpiritOfOmenPyroScorpion = card(123031)
  .since("v5.1.0")
  .undiscoverable()
  .technique()
  .tags("barrier")
  .variable("barrierUsage", 0) // no io hint for now
  .on("decreaseDamaged", (c, e) => c.self.master.energy > 0)
  .usagePerRound(2)
  .do((c) => {
    c.self.master.loseEnergy(1);
  })
  .decreaseDamage(1)
  .combatStatus(ScorpionBlessing)
  .endOn()
  .provideSkill(1230311)
  .costSame(2)
  .usage(1)
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 23031
 * @name 烧蚀之光
 * @description
 * 造成1点火元素伤害。
 */
export const SearingGlare = skill(23031)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 23032
 * @name 炎晶迸击
 * @description
 * 造成3点火元素伤害，生成1层魔蝎祝福。
 */
export const BlazingStrike = skill(23032)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .combatStatus(ScorpionBlessing)
  .done();

/**
 * @id 23033
 * @name 厄灵苏醒·炎之魔蝎
 * @description
 * 造成3点火元素伤害。整场牌局限制1次，将1张厄灵·炎之魔蝎加入我方手牌。
 * （装备有厄灵·炎之魔蝎的角色可以使用特技：炙烧攻势）
 */
export const SpiritOfOmensAwakeningPyroScorpion: SkillHandle = skill(23033)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 3)
  .done();

/**
 * @id 23034
 * @name 厄灵之能
 * @description
 * 【被动】此角色受到伤害后：如果此角色生命值不多于7，则获得1点充能。（每回合1次）
 */
export const SpiritOfOmensPower: PassiveSkillHandle = skill(23034)
  .type("passive")
  .on("damaged", (c) => c.self.health <= 7 && c.self.energy < c.self.maxEnergy)
  .usagePerRound(1, { name: "usagePerRound1" })
  .gainEnergy(1, "@self")
  .on("useSkill", (c, e) => e.skill.definition.id === SpiritOfOmensAwakeningPyroScorpion)
  .usage(1, { name: "createCardUsage" })
  .createHandCard(SpiritOfOmenPyroScorpion)
  .done();

/**
 * @id 2303
 * @name 镀金旅团·炽沙叙事人
 * @description
 * 如今仍然能记起许多故事的人，是不会背叛流淌在体内的沙漠血脉的。
 */
export const EremiteScorchingLoremaster = character(2303)
  .since("v4.3.0")
  .tags("pyro", "eremite")
  .health(10)
  .energy(2)
  .skills(SearingGlare, BlazingStrike, SpiritOfOmensAwakeningPyroScorpion, SpiritOfOmensPower)
  .done();

/**
 * @id 223031
 * @name 魔蝎烈祸
 * @description
 * 战斗行动：我方出战角色为镀金旅团·炽沙叙事人时，装备此牌。
 * 镀金旅团·炽沙叙事人装备此牌后，立刻使用一次炎晶迸击。
 * 装备有此牌的镀金旅团·炽沙叙事人在场，我方使用炙烧攻势击倒敌方角色后：将1张厄灵·炎之魔蝎加入手牌。
 * 回合结束时：生成1层魔蝎祝福。
 * （牌组中包含镀金旅团·炽沙叙事人，才能加入牌组）
 */
export const Scorpocalypse = card(223031)
  .since("v4.3.0")
  .costPyro(3)
  .talent(EremiteScorchingLoremaster)
  .on("enter")
  .useSkill(BlazingStrike)
  .on("defeated", (c, e) => !e.target.isMine() && e.via.definition.id === 1230311)
  .listenToAll()
  .createHandCard(SpiritOfOmenPyroScorpion)
  .on("roundEnd")
  .combatStatus(ScorpionBlessing)
  .done();

/**
 * @id 123033
 * @name 炎之魔蝎·守势
 * @description
 * 厄灵·炎之魔蝎在场时：所附属角色受到的伤害-1。（每回合1次）
 */
export const PyroScorpionGuardianStance01 = status(123033)
  .tags("barrier")
  .reserve();

/**
 * @id 123034
 * @name 炎之魔蝎·守势
 * @description
 * 魔蝎祝福在场时：所附属角色受到的伤害-1。（每回合至多2次）
 */
export const PyroScorpionGuardianStance = status(123034)
  .tags("barrier")
  .reserve();
