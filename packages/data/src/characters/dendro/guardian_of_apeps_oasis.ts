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

import { character, skill, summon, status, combatStatus, card, DamageType, type SummonHandle, type CardHandle, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 127022
 * @name 增殖生命体
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1
 */
export const ProliferatedOrganism01 = summon(127022)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(1)
  .done();

/**
 * @id 127023
 * @name 增殖生命体
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1
 */
export const ProliferatedOrganism02 = summon(127023)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(1)
  .done();

/**
 * @id 127024
 * @name 增殖生命体
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1
 */
export const ProliferatedOrganism03 = summon(127024)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(1)
  .done();

/**
 * @id 127025
 * @name 增殖生命体
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1
 */
export const ProliferatedOrganism04 = summon(127025)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(1)
  .done();

/**
 * @id 127021
 * @name 唤醒眷属
 * @description
 * 打出此牌或舍弃此牌时：召唤一个独立的增殖生命体。
 */
export const AwakenMyKindred = card(127021)
  .since("v4.7.0")
  .undiscoverable()
  .costDendro(2)
  .do((c) => {
    if (!c.$(`my summon with definition id ${ProliferatedOrganism01}`)) {
      c.summon(ProliferatedOrganism01);
    } else if (!c.$(`my summon with definition id ${ProliferatedOrganism02}`)) {
      c.summon(ProliferatedOrganism02);
    } else if (!c.$(`my summon with definition id ${ProliferatedOrganism03}`)) {
      c.summon(ProliferatedOrganism03);
    } else {
      c.summon(ProliferatedOrganism04);
    }
  })
  .doSameWhenDisposed()
  .done();

/**
 * @id 127028
 * @name 绿洲之庇护
 * @description
 * 提供1点护盾，保护所附属角色。
 */
export const OasissAegis = status(127028)
  .shield(1)
  .done();

/**
 * @id 127027
 * @name 重燃的绿洲之心
 * @description
 * 所附属角色造成的伤害+3。
 * 所附属角色使用技能后：移除我方场上的绿洲之滋养，每移除1层就治疗所附属角色1点。
 */
export const ReignitedHeartOfOasis = status(127027)
  .on("increaseSkillDamage")
  .increaseDamage(3)
  .on("useSkill")
  .do((c) => {
    const nourishment = c.$(`my combat status with definition id ${OasisNourishment}`);
    if (nourishment) {
      const usage = nourishment.getVariable("usage");
      nourishment.dispose();
      c.heal(usage, "@master");
    }
  })
  .done();

/**
 * @id 127029
 * @name 绿洲之心
 * @description
 * 我方召唤4个增殖生命体后，我方阿佩普的绿洲守望者附属重燃的绿洲之心，并获得1点护盾。
 */
export const HeartOfOasis = combatStatus(127029)
  .variable("organismCount", 0)
  .on("enterRelative", (c, e) =>
    [
      ProliferatedOrganism01,
      ProliferatedOrganism02,
      ProliferatedOrganism03,
      ProliferatedOrganism04,
    ].includes(e.entity.definition.id as SummonHandle))
  .listenToPlayer()
  .do((c) => {
    c.addVariable("organismCount", 1);
    if (c.getVariable("organismCount") === 4) {
      const apep = c.$(`my character with definition id ${GuardianOfApepsOasis}`);
      apep?.addStatus(ReignitedHeartOfOasis);
      apep?.addStatus(OasissAegis);
      c.dispose();
    }
  })
  .done();

/**
 * @id 127026
 * @name 绿洲之滋养
 * @description
 * 我方打出唤醒眷属时：少花费1个元素骰。
 * 可用次数：1（可叠加到3）
 */
export const OasisNourishment = combatStatus(127026)
  .on("deductOmniDiceCard", (c, e) => e.action.skill.caller.definition.id === AwakenMyKindred)
  .usageCanAppend(1, 3)
  .deductOmniCost(1)
  .done();

/**
 * @id 27021
 * @name 失乡重击
 * @description
 * 造成2点物理伤害。
 */
export const StrikeOfTheDispossessed = skill(27021)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 27022
 * @name 生命流束
 * @description
 * 造成2点草元素伤害，抓1张唤醒眷属，生成1层绿洲之滋养。
 */
export const LifeStream = skill(27022)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 2)
  .drawCards(1, { withDefinition: AwakenMyKindred })
  .combatStatus(OasisNourishment, "my")
  .done();

/**
 * @id 27023
 * @name 终景迸落
 * @description
 * 造成4点草元素伤害，抓1张唤醒眷属，生成2层绿洲之滋养。
 */
export const TheEndFalls = skill(27023)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 4)
  .drawCards(1, { withDefinition: AwakenMyKindred })
  .combatStatus(OasisNourishment, "my", {
    overrideVariables: { usage: 2 }
  })
  .done();

/**
 * @id 27024
 * @name 增殖感召
 * @description
 * 【被动】战斗开始时，生成5张唤醒眷属，随机放入牌库。我方召唤4个增殖生命体后，此角色附属重燃的绿洲之心，并获得1点护盾。
 */
export const InvokationOfPropagation = skill(27024)
  .type("passive")
  .variable("organismCount", 0)
  .on("battleBegin")
  .createPileCards(AwakenMyKindred, 5, "random")
  .combatStatus(HeartOfOasis)
  .done();

/**
 * @id 2702
 * @name 阿佩普的绿洲守望者
 * @description
 * 阿佩普曾独自沉溺于末日的风景当中。所有的人、神、龙、走兽、飞鸟与游鱼，所有记忆、智慧、话语与仇恨将都磨为无色尘粉，最后一轮明月之光则化作白焰之雨落在荒土之上。
 * ……
 * 阿佩普曾视沙海之底为自己的墓场，而非失乡之王的行宫。「智慧」的毒很快就会让它从无数个月亮的仇恨与愤怒中解脱。它已经对终末缺乏颜色的景象感到厌倦了。直到最终年轻的神明与金色的旅人让它再度回想起，即便自己曾经主宰的青绿土地已经化作饰金的荒原，即便自己与子嗣为了在其中生存而变得扭曲丑陋，但它的心中始终珍藏着那一角绿洲的景象。
 */
export const GuardianOfApepsOasis = character(2702)
  .since("v4.7.0")
  .tags("dendro", "monster")
  .health(10)
  .energy(2)
  .skills(StrikeOfTheDispossessed, LifeStream, TheEndFalls, InvokationOfPropagation)
  .done();

/**
 * @id 227021
 * @name 万千子嗣
 * @description
 * 入场时：生成4张唤醒眷属，随机置入我方牌库。
 * 装备有此牌的阿佩普的绿洲守望者在场时:我方增殖生命体造成的伤害+1。
 * （牌组中包含阿佩普的绿洲守望者，才能加入牌组）
 */
export const AThousandYoung = card(227021)
  .since("v4.7.0")
  .costDendro(2)
  .talent(GuardianOfApepsOasis, "none")
  .on("enter")
  .createPileCards(AwakenMyKindred, 4, "random")
  .on("increaseDamage", (c, e) => 
    [
      ProliferatedOrganism01,
      ProliferatedOrganism02,
      ProliferatedOrganism03,
      ProliferatedOrganism04,
    ].includes(e.source.definition.id as SummonHandle))
  .listenToPlayer()
  .increaseDamage(1)
  .done();
