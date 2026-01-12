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

import { character, skill, status, card, DamageType, diceCostOfCard, SkillHandle, DiceType, Reaction } from "@gi-tcg/core/builder";

/**
 * @id 111162
 * @name 七相一闪
 * @description
 * 所附属角色使用普通攻击时：造成的物理伤害变为冰元素伤害。若可能，消耗至多2点蛇之狡谋，每消耗1点，则少花费1个无色元素。
 * 自身元素爆发切换为极恶技·尽。
 * 持续回合：1
 */
export const SevenphaseFlash = status(111162)
  .since("v6.3.0")
  .duration(1)
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal") && c.self.master.getVariable("serpentsSubtlety"))
  .do((c, e) => {
    const costSubtelty = Math.min(2, c.self.master.getVariable("serpentsSubtlety"));
    c.self.master.addVariable("serpentsSubtlety", -costSubtelty);
    e.deductVoidCost(costSubtelty);
  })
  .on("modifySkillDamageType", (c, e) => e.viaSkillType("normal"))
  .changeDamageType(DamageType.Cryo)
  .on("enter")
  .do((c) => {
    c.transformDefinition(c.self.master, Skirk01);
  })
  .on("selfDispose")
  .do((c) => {
    const ch = c.$(`my character with definition id ${Skirk01}`);
    if (ch) {
      c.transformDefinition(ch, Skirk);
    }
  })
  .done();

/**
 * @id 111164
 * @name 死河渡断
 * @description
 * 所附属角色下次造成的伤害+1。
 */
export const DeathsCrossing = status(111164)
  .since("v6.3.0")
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 111161
 * @name 诸武相授
 * @description
 * 我方丝柯克附属七相一闪，并且下次造成的伤害+1。
 * 回合开始或我方执行切换后：舍弃此牌，获得1点蛇之狡谋。
 */
export const MutualWeaponsMentorship = card(111161)
  .addTarget(`my character with definition id 1116`)
  .characterStatus(SevenphaseFlash, "@targets.0")
  .characterStatus(DeathsCrossing, "@targets.0")
  .onArbitraryEvent("actionPhase", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .onArbitraryEvent("switchActive", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .done();

/**
 * @id 111163
 * @name 虚境裂隙
 * @description
 * 舍弃1张原本元素骰费用为3的手牌，丝柯克获得2点蛇之狡谋。
 */
export const VoidRift = card(111163)
  .do((c) => {
    const hand = c.player.hands.find((card) => diceCostOfCard(card.definition) === 3);
    if (hand) {
      c.disposeCard(hand);
      const skirk = c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`);
      skirk?.addVariableWithMax("serpentsSubtlety", 2, 7);
    }
  })
  .done();

/**
 * @id 11161
 * @name 极恶技·断
 * @description
 * 造成2点物理伤害。
 */
export const HavocSunder = skill(11161)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11162
 * @name 极恶技·闪
 * @description
 * 获得2点蛇之狡谋，生成手牌诸武相授。（每回合1次）
 */
export const HavocWarp: SkillHandle = skill(11162)
  .type("elemental")
  .costCryo(2)
  .filter((c) => c.self.definition.id === Skirk && c.self.getVariable("canE"))
  .do((c) => {
    c.self.addVariableWithMax("serpentsSubtlety", 2, 7);
    c.createHandCard(MutualWeaponsMentorship);
    c.self.setVariable("canE", 0);
  })
  .done();

/**
 * @id 11165
 * @name 极恶技·尽
 * @description
 * 将2个非万能元素骰转化为冰元素骰，舍弃至多2张原本元素骰花费为0骰的卡牌，每舍弃1张，丝柯克获得1点蛇之狡谋。
 */
export const HavocExtinction = skill(11165)
  .type("burst")
  .costCryo(1)
  .do((c) => {
    // 假定（大抵确实如此）先转换基础骰子再转换万能骰子
    const nonOmniCount =  c.player.dice.filter((d) => d !== DiceType.Omni).length;
    const convertCount = Math.min(2, nonOmniCount);
    c.convertDice(DiceType.Cryo, convertCount);
    const hands = c.player.hands.filter((card) => diceCostOfCard(card.definition) === 0).slice(0, 2);
    if (hands.length > 0) {
      c.disposeCard(...hands);
      c.self.addVariableWithMax("serpentsSubtlety", hands.length, 7);
    }
  })
  .done();

/**
 * @id 11163
 * @name 极恶技·灭
 * @description
 * 消耗所有蛇之狡谋，造成等同于消耗蛇之狡谋数量的冰元素伤害，对后台角色造成2点穿透伤害，如果消耗了7点蛇之狡谋，则改为对后台角色造成3点穿透伤害。
 */
export const HavocRuin = skill(11163)
  .type("burst")
  .costCryo(3)
  // .cost_special_energy(2)
  .filter((c) => c.self.getVariable("serpentsSubtlety") >= 2)
  .do((c) => {
    const subtilty = c.self.getVariable("serpentsSubtlety");
    c.self.setVariable("serpentsSubtlety", 0);
    if (subtilty >= 7) {
      c.damage(DamageType.Piercing, 3, "opp standby");
    } else {
      c.damage(DamageType.Piercing, 2, "opp standby");
    }
    c.damage(DamageType.Cryo, subtilty);
  })
  .done();

/**
 * @id 11164
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
export const ReasonBeyondReason = skill(11164)
  .type("passive")
  .variable("serpentsSubtlety", 0)
  .variable("canE", 1)
  .on("dealReaction", (c, e) => ([Reaction.Frozen, Reaction.SwirlCryo, Reaction.Superconduct, Reaction.CrystallizeCryo] as Reaction[]).includes(e.type))
  .listenToPlayer()
  .usagePerRound(3, { name: "usagePerRound1" })
  .createHandCard(VoidRift)
  .on("roundEnd")
  .setVariable("canE", 1)
  .done();

/**
 * @id 11167
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
export const ReasonBeyondReason01 = skill(11167)
  .type("passive")
  .reserve();

/**
 * @id 1116
 * @name 丝柯克
 * @description
 * 星海默然，覆灭无声。
 */
export const Skirk = character(1116)
  .since("v6.3.0")
  .tags("cryo", "sword", "calamity")
  .health(10)
  .energy(0)
  .skills(HavocSunder, HavocWarp, HavocRuin, ReasonBeyondReason)
  .done();

/**
 * @id 6605
 * @name 丝柯克
 * @description
 * 
 */
export const Skirk01 = character(6605)
  .since("v6.3.0")
  .tags("cryo", "sword", "calamity")
  .health(10)
  .energy(0)
  .skills(HavocSunder, HavocWarp, HavocExtinction, ReasonBeyondReason)
  .done();

/**
 * @id 211161
 * @name 湮远
 * @description
 * 快速行动：装备给我方的丝柯克。
 * 装备有此牌的丝柯克在场，我方打出或舍弃虚境裂隙时：对敌方出战角色造成1点冰元素伤害。（每回合1次）
 * （牌组中包含丝柯克，才能加入牌组）
 */
export const FarToFall = card(211161)
  .since("v6.3.0")
  .costCryo(1)
  .talent([Skirk, Skirk01], "none")
  .variable("usagePerRound", 1)
  .on("playCard", (c, e) => c.getVariable("usagePerRound") && e.card.definition.id === VoidRift)
  .damage(DamageType.Cryo, 1, "opp active")
  .setVariable("usagePerRound", 0)
  .on("disposeCard", (c, e) => c.getVariable("usagePerRound") && e.entity.definition.id === VoidRift)
  .damage(DamageType.Cryo, 1, "opp active")
  .setVariable("usagePerRound", 0)
  .on("roundEnd")
  .setVariable("usagePerRound", 1)
  .done();

/**
 * @id 11166
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
export const ReasonBeyondReason02 = skill(11166)
  .type("passive")
  .reserve();
