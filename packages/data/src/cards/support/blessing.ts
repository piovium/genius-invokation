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

import { $, card, DamageType, DiceType, Reaction, status } from "@gi-tcg/core/builder";
import { NoTuningAllowed, Shield } from "../../commons";

/**
 * @id 303041
 * @name 超导祝佑·极寒
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个雷元素骰。
 * 我方造成物理伤害或冰元素伤害后：赋予敌方随机1张手牌不可调和和费用增加。（每回合2次）
 */
export const SuperconductBlessingDeepFreeze = card(303041)
  .costCryo(1)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Cryo, 2)
  .fixDice(DiceType.Electro, 2)
  .on("dealDamage", (c, e) => 
    ([DamageType.Physical, DamageType.Cryo] as DamageType[]).includes(e.type))
  .listenToPlayer()
  .usagePerRound(2)
  .do((c) => {
    const target = c.random(c.oppPlayer.hands);
    if (target) {
      c.attach(NoTuningAllowed, target);
      c.attachCostIncrease(target);
    }
  })
  .done();

/**
 * @id 303042
 * @name 超导祝佑·电冲
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个雷元素骰。
 * 我方触发超导反应后：敌方生命值最高的一名角色受到2点穿透伤害。（每回合3次）
 */
export const SuperconductBlessingElectricSurge = card(303042)
  .costElectro(3)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Cryo, 2)
  .fixDice(DiceType.Electro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Superconduct)
  .usagePerRound(3)
  .damage(DamageType.Piercing, 2, `opp characters order by 0 - health limit 1`)
  .done();

/**
 * @id 331004
 * @name 元素幻变：超导祝佑
 * @description
 * 元素幻变：冰元素雷元素
 * 投掷阶段：总是投出2个冰元素骰和2个雷元素骰。
 * 我方触发超导反应后：弃置此牌并从超导祝佑·极寒和超导祝佑·电冲中挑选一项加入手牌。
 */
export const ElementalTransfigurationSuperconductBlessing = card(331004)
  .since("v6.4.0")
  .costSame(2)
  .elementalBlessing(DiceType.Cryo, DiceType.Electro)
  .on("roll")
  .fixDice(DiceType.Cryo, 2)
  .fixDice(DiceType.Electro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Superconduct)
  .selectAndCreateHandCard([
    SuperconductBlessingDeepFreeze,
    SuperconductBlessingElectricSurge,
  ])
  .dispose()
  .done();

/**
 * @id 303053
 * @name 蒸发祝佑·狂浪（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
export const VaporizeBlessingRagingWavesInEffect = status(303053)
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done()

/**
 * @id 303051
 * @name 蒸发祝佑·狂浪
 * @description
 * 投掷阶段：总是投出2个水元素骰和2个火元素骰。
 * 我方触发蒸发反应后：治疗我方生命值最低的角色1点，并使其下次造成的伤害+1。（每回合2次）
 */
export const VaporizeBlessingRagingWaves = card(303051)
  .costHydro(2)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Pyro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Vaporize)
  .usagePerRound(2)
  .do((c) => {
    const targetCh = c.$(`my characters order by health limit 1`);
    if (targetCh) {
      c.heal(1, targetCh);
      c.characterStatus(VaporizeBlessingRagingWavesInEffect, targetCh);
    }
  })
  .done();

/**
 * @id 303052
 * @name 蒸发祝佑·炽燃
 * @description
 * 投掷阶段：总是投出2个水元素骰和2个火元素骰。
 * 我方火元素角色使用「元素战技」时：少花费1个元素骰。（每回合2次）
 */
export const VaporizeBlessingSearingBurn = card(303052)
  .costPyro(2)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Pyro, 2)
  .on("deductOmniDiceSkill", (c, e) => 
    e.isSkillType("elemental") &&
    e.action.skill.caller.cast<"character">().element() === DiceType.Pyro)
  .usagePerRound(2)
  .deductOmniCost(1)
  .done();


/**
 * @id 331005
 * @name 元素幻变：蒸发祝佑
 * @description
 * 元素幻变：水元素火元素
 * 投掷阶段：总是投出2个水元素骰和2个火元素骰。
 * 我方触发蒸发反应后：弃置此牌并从蒸发祝佑·狂浪和蒸发祝佑·炽燃中挑选一项加入手牌。
 */
export const ElementalTransfigurationVaporizeBlessing = card(331005)
  .since("v6.4.0")
  .costSame(2)
  .elementalBlessing(DiceType.Hydro, DiceType.Pyro)
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Pyro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Vaporize)
  .selectAndCreateHandCard([
    VaporizeBlessingRagingWaves,
    VaporizeBlessingSearingBurn,
  ])
  .dispose()
  .done();

/**
 * @id 303061
 * @name 绽放祝佑·甘露
 * @description
 * 投掷阶段：总是投出2个水元素骰和2个草元素骰。
 * 每回合第2次打出卡牌后：我方受伤最多的角色获得2点额外最大生命值。
 */
export const BloomBlessingAmrita = card(303061)
  .costHydro(2)
  .undiscoverable()
  .support()
  .variable("playCount", 0)
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Dendro, 2)
  .on("playCard", (c, e) => e.card.id !== c.self.id)
  .do((c) => {
    c.addVariable("playCount", 1);
    if (c.getVariable("playCount") === 2) {
      const target = c.query($.macros.myMostInjured);
      if (target) {
        c.increaseMaxHealth(2, target);
      }
    }
  })
  .on("roundEnd")
  .setVariable("playCount", 0)
  .done();

/**
 * @id 303062
 * @name 绽放祝佑·蔓生
 * @description
 * 投掷阶段：总是投出2个水元素骰和2个草元素骰。
 * 我方触发元素反应后：造成1点水元素伤害。（每回合1次）
 */
export const BloomBlessingOvergrow = card(303062)
  .costDendro(2)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Dendro, 2)
  .on("dealReaction")
  .usagePerRound(1)
  .damage(DamageType.Hydro, 1, $.macros.oppActivePrioritized)
  .done();

/**
 * @id 331006
 * @name 元素幻变：绽放祝佑
 * @description
 * 元素幻变：水元素草元素
 * 投掷阶段：总是投出2个水元素骰和2个草元素骰。
 * 我方触发绽放反应后：弃置此牌并从绽放祝佑·甘露和绽放祝佑·蔓生中挑选一项加入手牌。
 */
export const ElementalTransfigurationBloomBlessing = card(331006)
  .since("v6.5.0")
  .costSame(2)
  .elementalBlessing(DiceType.Hydro, DiceType.Dendro)
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .fixDice(DiceType.Dendro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Bloom)
  .selectAndCreateHandCard([
    BloomBlessingAmrita,
    BloomBlessingOvergrow,
  ])
  .dispose()
  .done();

/**
 * @id 303071
 * @name 火岩祝佑·回火
 * @description
 * 投掷阶段：总是投出2个火元素骰和2个岩元素骰。
 * 我方场上存在护盾角色状态或护盾出战状态时，造成的火元素伤害和岩元素伤害+1。（每回合3次）
 */
export const LavaBlessingTurnfire = card(303071)
  .costPyro(2)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Pyro, 2)
  .fixDice(DiceType.Geo, 2)
  .on("increaseDamage", (c, e) => {
    if (!([DamageType.Pyro, DamageType.Geo] as DamageType[]).includes(e.type)) {
      return false;
    }
    return !!c.query($.union($.my.typeStatus.tag("shield"), $.my.combatStatus.tag("shield")));
  })
  .usagePerRound(3)
  .increaseDamage(1)
  .done();

/**
 * @id 303072
 * @name 火岩祝佑·重熔
 * @description
 * 投掷阶段：总是投出2个火元素骰和2个岩元素骰。
 * 我方造成后火元素伤害或岩元素伤害后：生成2层护盾。（每回合1次）
 */
export const LavaBlessingRemelting = card(303072)
  .costGeo(3)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Pyro, 2)
  .fixDice(DiceType.Geo, 2)
  .on("dealDamage", (c, e) => ([DamageType.Pyro, DamageType.Geo] as DamageType[]).includes(e.type))
  .usagePerRound(1)
  .combatStatus(Shield, "my", {
    overrideVariables: {
      shield: 2
    }
  })
  .done();

/**
 * @id 331007
 * @name 元素幻变：火岩祝佑
 * @description
 * 元素幻变：火元素岩元素
 * 投掷阶段：总是投出2个火元素骰和2个岩元素骰。
 * 我方触发火结晶反应后：弃置此牌并从火岩祝佑·回火和火岩祝佑·重熔中挑选一项加入手牌。
 */
export const ElementalTransfigurationLavaBlessing = card(331007)
  .since("v6.5.0")
  .costSame(2)
  .elementalBlessing(DiceType.Pyro, DiceType.Geo)
  .on("roll")
  .fixDice(DiceType.Pyro, 2)
  .fixDice(DiceType.Geo, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.CrystallizePyro)
  .selectAndCreateHandCard([
    LavaBlessingTurnfire,
    LavaBlessingRemelting,
  ])
  .dispose()
  .done();
