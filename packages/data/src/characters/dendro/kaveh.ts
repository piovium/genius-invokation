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

import { EntityState, character, skill, status, combatStatus, card, DamageType, CardHandle, customEvent } from "@gi-tcg/core/builder";
import { BountifulCore } from "../hydro/nilou";
import { DendroCore } from "../../commons";

export const ShouldTriggerTalent = customEvent<EntityState>("kaveh/shouldTriggerTalent");
/**
 * @id 117082
 * @name 迸发扫描
 * @description
 * 双方选择行动前：如果我方场上存在草原核或丰穰之核，则使其可用次数-1，并舍弃我方牌库顶的1张卡牌。然后，造成所舍弃卡牌当前元素骰费用的草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
export const BurstScan = combatStatus(117082)
  .on("beforeAction", (c) => c.$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`))
  .listenToAll()
  .do((c) => {
    c.disposeCard(c.player.pile[0]);
  })
  .on("disposeCard", (c, e) => e.via?.caller.id === c.self.id)
  .usageCanAppend(1, 3)
  .do((c, e) => {
    c.$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`)?.consumeUsage(1);
    const cost = e.entity.diceCost();
    c.damage(DamageType.Dendro, cost);
    c.emitCustomEvent(ShouldTriggerTalent, e.entity.latest());
  })
  .done();

/**
 * @id 117081
 * @name 梅赫拉克的助力
 * @description
 * 角色「普通攻击」造成的伤害+1，且造成的物理伤害变为草元素伤害。
 * 角色普通攻击后：生成迸发扫描。
 * 持续回合：2
 */
export const MehraksAssistance = status(117081)
  .duration(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Dendro)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .combatStatus(BurstScan)
  .done();

/**
 * @id 117083
 * @name 预算师的技艺（生效中）
 * @description
 * 我方下次打出「场地」支援牌时：少花费2个元素骰。
 */
export const TheArtOfBudgetingInEffect = combatStatus(117083)
  .once("deductOmniDiceCard", (c, e) => e.action.skill.caller.definition.tags.includes("place"))
  .deductOmniCost(2)
  .done();

/**
 * @id 17081
 * @name 旋规设矩
 * @description
 * 造成2点物理伤害。
 */
export const SchematicSetup = skill(17081)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 17082
 * @name 画则巧施
 * @description
 * 造成2点草元素伤害，生成迸发扫描。
 */
export const ArtisticIngenuity = skill(17082)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 2)
  .combatStatus(BurstScan)
  .done();

/**
 * @id 17083
 * @name 繁绘隅穹
 * @description
 * 造成3点草元素伤害，本角色附属梅赫拉克的助力，生成2层迸发扫描。
 */
export const PaintedDome = skill(17083)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 3)
  .characterStatus(MehraksAssistance, "@self")
  .combatStatus(BurstScan, "my", {
    overrideVariables: { usage: 2 }
  })
  .done();

/**
 * @id 1708
 * @name 卡维
 * @description
 * 体悟、仁爱与识美之知。
 */
export const Kaveh = character(1708)
  .since("v4.7.0")
  .tags("dendro", "claymore", "sumeru")
  .health(12)
  .energy(2)
  .skills(SchematicSetup, ArtisticIngenuity, PaintedDome)
  .done();

/**
 * @id 217081
 * @name 预算师的技艺
 * @description
 * 战斗行动：我方出战角色为卡维时，装备此牌。
 * 卡维装备此牌后，立刻使用一次画则巧施。
 * 装备有此牌的卡维在场，我方触发迸发扫描的效果后：将1张所舍弃卡牌的复制加入你的手牌。如果该牌为「场地」牌，则使本回合中我方下次打出「场地」时少花费2个元素骰。（每回合1次）
 * （牌组中包含卡维，才能加入牌组）
 */
export const TheArtOfBudgeting = card(217081)
  .since("v4.7.0")
  .costDendro(3)
  .talent(Kaveh)
  .on("enter")
  .useSkill(ArtisticIngenuity)
  .on(ShouldTriggerTalent)
  .listenToPlayer()
  .usagePerRound(1)
  .do((c, e) => {
    const cardDef = e.arg.definition;
    c.createHandCard(cardDef.id as CardHandle);
    if (cardDef.tags.includes("place")) {
      c.combatStatus(TheArtOfBudgetingInEffect);
    }
  })
  .done();
