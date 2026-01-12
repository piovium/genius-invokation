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
 * @id 123051
 * @name 忿恨
 * @description
 * 每层使所附属角色造成的伤害和「元素爆发」造成的穿透伤害+1。（可叠加，没有上限）
 */
export const Resentment = status(123051)
  .since("v6.0.0")
  .variableCanAppend("layer", 1, Infinity)
  .on("increaseDamage")
  .do((c, e) => {
    e.increaseDamage(c.getVariable("layer"));
  })
  .done();

/**
 * @id 123052
 * @name 弃置卡牌数
 * @description
 * 我方每舍弃6张卡牌，自身附属1层忿恨。
 * 【此卡含描述变量】
 */
export const CardsDiscarded = status(123052)
  .since("v6.0.0")
  .variable("cardCount", 0)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (c, self) => self.variables.cardCount)
  .on("disposeCard")
  .do((c, e) => {
    c.addVariable("cardCount", 1);
    if (c.getVariable("cardCount") % 6 === 0){
      c.characterStatus(Resentment, "@master");
    }
  })
  .done();

/**
 * @id 23051
 * @name 虚界玄爪
 * @description
 * 造成2点物理伤害。
 */
export const VoidClawStrike = skill(23051)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 23052
 * @name 蚀灭火羽
 * @description
 * 造成3点火元素伤害，我方舍弃牌组顶部1张牌。
 */
export const ErodedFlamingFeathers = skill(23052)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .abortPreview()
  .do((c) => {
    if (c.player.pile.length > 0) {
      c.disposeCard(c.player.pile[0]);
    }
  })
  .done();

/**
 * @id 23053
 * @name 斫劫源焰
 * @description
 * 造成1点火元素伤害，对所有敌方后台角色造成1点穿透伤害。双方舍弃牌组顶部3张牌，自身附属1层忿恨.
 */
export const SeveringPrimalFire = skill(23053)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .do((c) => {
    const layer = c.self.hasStatus(Resentment)?.getVariable("layer") ?? 0;
    c.damage(DamageType.Piercing, layer + 1, "opp standby");
    c.damage(DamageType.Pyro, 1);
    c.abortPreview();
    for (const player of [c.player, c.oppPlayer]) {
      for (const card of player.pile.slice(0, 3)) {
        c.disposeCard(card);
      }
    }
    c.characterStatus(Resentment, "@self");
  })
  .done();

/**
 * @id 23054
 * @name 忿恨
 * @description
 * 【被动】我方每舍弃6张卡牌，自身附属1层忿恨。
 */
export const ResentmentPassive = skill(23054)
  .type("passive")
  .on("battleBegin")
  .characterStatus(CardsDiscarded)
  .on("revive")
  .characterStatus(CardsDiscarded)
  .done();

/**
 * @id 23056
 * @name 忿恨
 * @description
 * 【被动】我方每舍弃6张卡牌，自身附属1层忿恨。
 */
export const Resentment02 = skill(23056)
  .type("passive")
  .reserve();

/**
 * @id 2305
 * @name 蚀灭的源焰之主
 * @description
 * 被称为深渊浮灭主亦被称为「古斯托特」的虚界魔物，拥有侵蚀地脉之中的回忆并将之凝聚为实体的如同灾厄的权能。
 */
export const LordOfErodedPrimalFire = character(2305)
  .since("v6.0.0")
  .tags("pyro", "monster")
  .health(11)
  .energy(2)
  .skills(VoidClawStrike, ErodedFlamingFeathers, SeveringPrimalFire, ResentmentPassive)
  .done();

/**
 * @id 223052
 * @name 罔极盛怒（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
export const UndyingFuryInEffect = status(223052)
  .once("increaseDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 223051
 * @name 罔极盛怒
 * @description
 * 快速行动：装备给我方的蚀灭的源焰之主。
 * 敌方打出名称不存在于本局最初牌组的牌时：所附属角色获得1点充能，下次造成的伤害+1。（每回合1次）
 * （牌组中包含蚀灭的源焰之主，才能加入牌组）
 */
export const UndyingFury = card(223051)
  .since("v6.0.0")
  .costPyro(1)
  .talent(LordOfErodedPrimalFire, "none")
  .on("playCard", (c, e) => {
    if (e.who === c.self.who) {
      return false;
    }
    return !c.isInInitialPile(e.card, "opp");
  })
  .listenToAll()
  .usagePerRound(1)
  .gainEnergy(1, "@master")
  .characterStatus(UndyingFuryInEffect, "@master")
  .done();
