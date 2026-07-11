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
import { BonecrunchersEnergyBlock } from "../../cards/event/other.gts";

/**
 * @id 125031
 * @name 噬骸能量·积聚
 * @description
 * 每层使得错落风涡伤害翻倍1次。
 */
export const BonecrunchersEnergyBlockAccumulated = status(125031)
  .variable("stack", 0)
  .once("multiplySkillDamage")
  .do((c, e) => {
    e.multiplyDamage(2 ** c.getVariable("stack"));
  })
  .done();

/**
 * @id 125032
 * @name 亡风啸卷（生效中）
 * @description
 * 本回合我方下次切换角色后：生成1个出战角色类型的元素骰。
 */
export const DeathlyCycloneInEffect = combatStatus(125032)
  .oneDuration()
  .once("switchActive")
  .do((c) => {
    c.generateDice(c.$("my active")!.element(), 1);
  })
  .done();

/**
 * @id 25031
 * @name 旋尾迅击
 * @description
 * 造成2点物理伤害。
 */
export const WhirlingTail = skill(25031)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 25032
 * @name 盘绕风引
 * @description
 * 造成3点风元素伤害，抓1张牌。
 */
export const SwirlingSquall = skill(25032)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 3)
  .drawCards(1)
  .done();

/**
 * @id 25033
 * @name 错落风涡
 * @description
 * 造成2点风元素伤害，舍弃手牌中所有的噬骸能量块，每舍弃2张，此次伤害翻倍1次。
 */
export const ScattershotVortex = skill(25033)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .do((c) => {
    const cards = c.player.hands.filter((card) => card.definition.id === BonecrunchersEnergyBlock);
    const stack = Math.floor(cards.length / 2);
    c.characterStatus(BonecrunchersEnergyBlockAccumulated, "@self", {
      overrideVariables: { stack }
    });
    c.damage(DamageType.Anemo, 2);
    c.disposeCard(...cards);
  })
  .done();

/**
 * @id 25034
 * @name 不朽亡骸·风
 * @description
 * 【被动】战斗开始时，生成6张噬骸能量块，均匀放入牌库。
 */
export const ImmortalRemnantsAnemo = skill(25034)
  .type("passive")
  .on("battleBegin")
  .createPileCards(BonecrunchersEnergyBlock, 6, "spaceAround")
  .done();

/**
 * @id 25035
 * @name 不朽亡骸·风
 * @description
 * 【被动】战斗开始时，生成6张噬骸能量块，均匀放入牌库。
 */
export const SquallDrawCardsCounter = skill(25035)
  .type("passive") // keep for v4.7.0
  .variable("elementalSkillDrawCardsCount", 0)
  .on("roundEnd")
  .setVariable("elementalSkillDrawCardsCount", 0)
  .done();

/**
 * @id 2503
 * @name 圣骸飞蛇
 * @description
 * 因为啃噬伟大的生命体，而扭曲异变的飞蛇，驾驭着凌厉的狂风。
 */
export const ConsecratedFlyingSerpent = character(2503)
  .since("v4.7.0")
  .tags("anemo", "monster", "sacread")
  .health(10)
  .energy(2)
  .skills(WhirlingTail, SwirlingSquall, ScattershotVortex, ImmortalRemnantsAnemo, SquallDrawCardsCounter)
  .done();

/**
 * @id 225031
 * @name 亡风啸卷
 * @description
 * 入场时：生成1张噬骸能量块，置入我方手牌。
 * 装备有此牌的圣骸飞蛇在场，我方打出噬骸能量块后：本回合中，我方下次切换角色后生成1个出战角色类型的元素骰。
 * （牌组中包含圣骸飞蛇，才能加入牌组）
 */
export const DeathlyCyclone = card(225031)
  .since("v4.7.0")
  .costAnemo(1)
  .talent(ConsecratedFlyingSerpent, "none")
  .on("enter")
  .createHandCard(BonecrunchersEnergyBlock)
  .on("playCard", (c, e) => e.card.definition.id === BonecrunchersEnergyBlock)
  .combatStatus(DeathlyCycloneInEffect)
  .done();
