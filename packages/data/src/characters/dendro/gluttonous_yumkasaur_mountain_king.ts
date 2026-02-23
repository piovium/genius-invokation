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

import { character, skill, status, card, DamageType, customEvent } from "@gi-tcg/core/builder";
import { Satiated } from "../../commons";

/**
 * @id 127041
 * @name 食足力增
 * @description
 * 每层使自身下次造成的伤害+1。（可叠加，没有上限，每次最多生效2层）
 */
export const WellFedAndStrong = status(127041)
  .since("v5.8.0")
  .on("increaseSkillDamage")
  .usageCanAppend(1, Infinity)
  .do((c, e) => {
    const currentUsage = c.getVariable("usage");
    const effectiveLayers = Math.min(currentUsage, 2);
    e.increaseDamage(effectiveLayers);
    c.consumeUsage(effectiveLayers);
  })
  .done();

/**
 * @id 127042
 * @name 食足体健
 * @description
 * 自身下次受到的伤害-1。（可叠加，没有上限）
 */
export const WellFedAndSturdy = status(127042)
  .since("v5.8.0")
  .tags("barrier")
  .on("decreaseDamaged")
  .usageCanAppend(1, Infinity)
  .decreaseDamage(1)
  .done();

/**
 * @id 27041
 * @name 沉重尾击
 * @description
 * 造成2点物理伤害。
 */
export const CrushingTailAttack = skill(27041)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 27042
 * @name 喷吐草实
 * @description
 * 造成2点草元素伤害，抓1张「料理」牌。
 */
export const FlyingFruit = skill(27042)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 2)
  .drawCards(1, { withTag: "food" })
  .done();

/**
 * @id 27043
 * @name 榴果爆轰
 * @description
 * 造成5点火元素伤害。
 */
export const FlamegranateConflagration = skill(27043)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 5)
  .done();

const GluttonousRexTriggerFromTalent = customEvent("mountainKing/gluttonousTriggerFromTalent");

/**
 * @id 27044
 * @name 贪食之王
 * @description
 * 自身不会饱腹。
 * 我方打出「料理」牌后：随机附属1层食足力增或食足体健，或获得1点额外最大生命值。（每回合2次）
 */
export const GluttonousRex01 = skill(27044)
  .type("passive")
  .defineSnippet((c, e) => {
    c.abortPreview();
    const choice = c.random([WellFedAndStrong, WellFedAndSturdy, "incMaxHealth"] as const);
    if (choice === "incMaxHealth") {
      c.increaseMaxHealth(1, "@self");
    } else {
      c.characterStatus(choice, "@self");
    }
  })
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(2, { name: "usagePerRound1" })
  .callSnippet()
  .on(GluttonousRexTriggerFromTalent)
  .callSnippet()
  .done();

/**
 * @id 27045
 * @name 贪食之王
 * @description
 * 自身不会饱腹。
 * 我方打出「料理」牌后：随机附属1层食足力增或食足体健，或获得1点额外最大生命值。（每回合2次）
 */
export const GluttonousRex02 = skill(27045)
  .type("passive")
  .on("enterRelative", (c, e) => e.entity.definition.id === Satiated)
  .do((c, e) => {
    // 不会饱腹 => 饱腹入场时弃置饱腹
    c.dispose(e.entity.cast<"status">());
  })
  .done();

/**
 * @id 2704
 * @name 贪食匿叶龙山王
 * @description
 * 自古老的年代存活至今，经历了无数战场的强大匿叶龙。
 */
export const GluttonousYumkasaurMountainKing = character(2704)
  .since("v5.8.0")
  .tags("dendro", "monster")
  .health(8)
  .energy(2)
  .skills(CrushingTailAttack, FlyingFruit, FlamegranateConflagration, GluttonousRex01, GluttonousRex02)
  .done();

/**
 * @id 227041
 * @name 饕噬尽吞
 * @description
 * 快速行动：装备给我方的贪食匿叶龙山王，敌方抓1张牌，然后我方窃取1张当前元素骰费用最高的对方手牌。
 * 我方打出名称不存在于本局最初牌组的牌时：触发贪食之王1次。（每回合1次）
 * （牌组中包含贪食匿叶龙山王，才能加入牌组）
 */
export const TheAlldevourer = card(227041)
  .since("v5.8.0")
  .costDendro(1)
  .talent(GluttonousYumkasaurMountainKing, "none")
  .on("enter")
  .do((c, e) =>{
    c.drawCards(1, {who: "opp"});
    const [handCard] = c.maxCostHands(1, { who: "opp" });
    if (handCard) {
      c.stealHandCard(handCard);
    }
  })
  .on("playCard", (c, e) => !c.isInInitialPile(e.card))
  .usagePerRound(1)
  .emitCustomEvent(GluttonousRexTriggerFromTalent)
  .done();
