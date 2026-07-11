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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 111121
 * @name 佩伊刻计
 * @description
 * 我方每抓1张牌后：此牌累积1层「压力阶级」。
 * 所附属角色使用浮冰增压时：如果「压力阶级」至少有2层，则移除此效果，使技能少花费1元素骰，且如果此技能结算后「压力阶级」至少有4层，则再额外造成3点物理伤害。
 */
export const PersTimer = status(111121)
  .since("v5.0.0")
  .variable("level", 0)
  .on("drawCard")
  .addVariable("level", 1)
  .on("deductOmniDiceSkill", (c, e) => c.getVariable("level") >= 2)
  .deductOmniCost(1)
  .on("useSkill", (c, e) => c.getVariable("level") >= 2)
  .if((c) => c.getVariable("level") >= 4)
  .damage(DamageType.Physical, 3)
  .dispose()
  .done();

/**
 * @id 111123
 * @name 潜猎护盾
 * @description
 * 提供1点护盾，保护所附属角色。（可叠加，最多叠加到2点）
 */
export const SubnauticalShield = status(111123)
  .since("v5.0.0")
  .shield(1, 2)
  .done();

/**
 * @id 111122
 * @name 潜猎模式
 * @description
 * 我方抓3张牌后：提供1点护盾，保护所附属角色。（可叠加，最多叠加至2点）。
 * 所附属角色使用普通攻击或元素战技后：将当前元素骰费用最高的至多2张手牌置于牌库底，然后抓等量的牌。
 * 持续回合：2
 * 【此卡含描述变量】
 */
export const SubnauticalHunterMode = status(111122)
  .since("v5.0.0")
  .duration(2)
  .variable("drawnCard", 0, { visible: false })
  .replaceDescription("[GCG_TOKEN_COUNTER]", (st, self) => self.variables.drawnCard)
  .on("drawCard")
  .addVariable("drawnCard", 1)
  .on("drawCard", (c, e) => c.getVariable("drawnCard") === 3)
  .characterStatus(SubnauticalShield, "@master")
  .setVariable("drawnCard", 0)
  .on("useSkill", (c, e) => e.isSkillType("normal") || e.isSkillType("elemental"))
  .do((c) => {
    const cards = c.maxCostHands(2);
    c.undrawCards(cards, "bottom");
    c.drawCards(cards.length);
  })
  .done();

/**
 * @id 11121
 * @name 洑流剑
 * @description
 * 造成2点物理伤害。
 */
export const FlowingEddies = skill(11121)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11122
 * @name 浮冰增压
 * @description
 * 造成2点冰元素伤害，若角色未附属佩伊刻计，则使其附属佩伊刻计。
 */
export const PressurizedFloe = skill(11122)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .if((c) => !c.self.hasStatus(PersTimer))
  .characterStatus(PersTimer, "@self")
  .done();

/**
 * @id 11123
 * @name 猎影潜袭
 * @description
 * 造成4点冰元素伤害，本角色附属潜猎模式。
 */
export const ShadowhuntersAmbush = skill(11123)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 4)
  .characterStatus(SubnauticalHunterMode, "@self")
  .done();

/**
 * @id 1112
 * @name 菲米尼
 * @description
 * 繁星丽天，孤怀寒芒。
 */
export const Freminet = character(1112)
  .since("v5.0.0")
  .tags("cryo", "claymore", "fontaine", "fatui", "ousia")
  .health(10)
  .energy(2)
  .skills(FlowingEddies, PressurizedFloe, ShadowhuntersAmbush)
  .done();

/**
 * @id 211121
 * @name 梦晓与决意之刻
 * @description
 * 战斗行动：我方出战角色为菲米尼时，装备此牌。
 * 菲米尼装备此牌后，立刻使用一次浮冰增压。
 * 装备有此牌的菲米尼使用技能后，抓1张牌。（每回合至多触发2次）
 * （牌组中包含菲米尼，才能加入牌组）
 */
export const MomentOfWakingAndResolve = card(211121)
  .since("v5.0.0")
  .costCryo(3)
  .talent(Freminet)
  .on("enter")
  .useSkill(PressurizedFloe)
  .on("useSkill")
  .usagePerRound(2)
  .drawCards(1)
  .done();
