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
import { SourcewaterDroplet } from "./neuvillette";
import { BondOfLife } from "../../commons";

/**
 * @id 12135
 * @name 满满心意药剂冲击
 * @description
 * 造成2点水元素伤害。
 */
export const MedicalInterventionOfPureIntention = skill(12135)
  .type("burst")
  .prepared()
  .damage(DamageType.Hydro, 2)
  .done();

/**
 * @id 112134
 * @name 满满心意药剂冲击
 * @description
 * 本角色将在下次行动时，直接使用技能：满满心意药剂冲击。
 */
export const MedicalInterventionOfPureIntentionStatus = status(112134)
  .since("v5.2.0")
  .prepare(MedicalInterventionOfPureIntention)
  .done();

/**
 * @id 112135
 * @name 静养
 * @description
 * 我方「元素战技」或召唤物造成的伤害+1。
 * 可用次数：2
 */
export const Convalescence = combatStatus(112135)
  .since("v5.2.0")
  .on("increaseDamage", (c, e) => e.viaSkillType("elemental") || e.source.definition.type === "summon")
  .usage(2)
  .increaseDamage(1)
  .done();

// 所附属角色的生命之契完全移除后，提高此角色1点最大生命值。
export const DetailedDiagnosisThoroughTreatmentStatus = status(112136)
  .noDefaultDispose()
  .on("dispose", (c, e) => e.entity.definition.id === BondOfLife)
  .usage(3)
  .increaseMaxHealth(1, "@master")
  .done();

/**
 * @id 112133
 * @name 激愈水球·小
 * @description
 * 抓到此牌时：治疗所有我方角色1点，生成源水之滴。
 */
export const SmallBolsteringBubblebalm = card(112133)
  .since("v5.2.0")
  .unobtainable()
  .descriptionOnHCI()
  .heal(1, "all my characters")
  .combatStatus(SourcewaterDroplet)
  .done();


/**
 * @id 112132
 * @name 激愈水球·中
 * @description
 * 抓到此牌时：对所在阵营的出战角色造成2点水元素伤害。生成1张激愈水球·小，将其置于对方牌库顶部。
 */
export const MediumBolsteringBubblebalm = card(112132)
  .since("v5.2.0")
  .unobtainable()
  .descriptionOnHCI()
  .damage(DamageType.Hydro, 2, "my active")
  .createPileCards(SmallBolsteringBubblebalm, 1, "top", "opp")
  .done();

/**
 * @id 112131
 * @name 激愈水球·大
 * @description
 * 抓到此牌时：治疗我方出战角色3点。生成1张激愈水球·中，将其置于对方牌库顶部第2张牌的位置。
 */
export const LargeBolsteringBubblebalm = card(112131)
  .since("v5.2.0")
  .unobtainable()
  .descriptionOnHCI()
  .heal(3, "my active")
  .createPileCards(MediumBolsteringBubblebalm, 1, "topIndex1", "opp")
  .done();

/**
 * @id 12131
 * @name 靶向治疗
 * @description
 * 造成2点物理伤害。
 */
export const TargetedTreatment = skill(12131)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12132
 * @name 弹跳水疗法
 * @description
 * 生成1张激愈水球·大，将其置于我方牌库顶部第3张牌的位置，本角色附属3层生命之契。（触发激愈水球·大的效果后，会生成激愈水球·中并置入对方牌库；触发激愈水球·中的效果后，会生成激愈水球·小并置入我方牌库）
 */
export const ReboundHydrotherapy = skill(12132)
  .type("elemental")
  .costHydro(3)
  .createPileCards(LargeBolsteringBubblebalm, 1, "topIndex2")
  .characterStatus(BondOfLife, "@self", {
    overrideVariables: {
      usage: 3
    }
  })
  .done();

/**
 * @id 12133
 * @name 过饱和心意注射
 * @description
 * 造成2点水元素伤害，然后准备技能：满满心意药剂冲击。
 */
export const SuperSaturatedSyringing = skill(12133)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .characterStatus(MedicalInterventionOfPureIntentionStatus, "@self")
  .done();

/**
 * @id 12134
 * @name 细致入微的诊疗
 * @description
 * 【被动】我方角色所附属的生命之契被完全移除后，该角色获得1点额外最大生命值。（对每名角色最多生效3次）
 * 我方切换到本角色时：如果我方场上存在源水之滴，则使其可用次数-1，本角色获得1点充能。
 */
export const DetailedDiagnosisThoroughTreatment01 = skill(12134)
  .type("passive") // 希格雯入场时：为所有我方角色附属 112136
  .on("battleBegin")
  .characterStatus(DetailedDiagnosisThoroughTreatmentStatus, "all my characters")
  .on("revive")
  .characterStatus(DetailedDiagnosisThoroughTreatmentStatus, "all my characters")
  .done();

/**
 * @id 12136
 * @name 细致入微的诊疗
 * @description
 *
 */
export const DetailedDiagnosisThoroughTreatment02 = skill(12136)
  .type("passive") // 希格雯倒下时：清除所有我方 112136 状态
  .on("defeated")
  .dispose(`all my status with definition id ${DetailedDiagnosisThoroughTreatmentStatus}`)
  .done();

/**
 * @id 12137
 * @name 细致入微的诊疗
 * @description
 * 【被动】我方切换到本角色时：如果我方场上存在源水之滴，则使其可用次数-1，本角色获得1点充能。
 */
export const DetailedDiagnosisThoroughTreatment03 = skill(12137)
  .type("passive")
  .on("switchActive", (c, e) => e.switchInfo.to.id === c.self.id)
  .do((c) => {
    const droplet = c.$(`my combat status with definition id ${SourcewaterDroplet}`);
    if (droplet) {
      c.consumeUsage(1, droplet);
      c.gainEnergy(1, "@self");
    }
  })
  .done();

/**
 * @id 1213
 * @name 希格雯
 * @description
 * 「圣洁之灵，请听我愿。」
 */
export const Sigewinne = character(1213)
  .since("v5.2.0")
  .tags("hydro", "bow", "fontaine", "pneuma")
  .health(12)
  .energy(2)
  .skills(TargetedTreatment, ReboundHydrotherapy, SuperSaturatedSyringing, DetailedDiagnosisThoroughTreatment01, MedicalInterventionOfPureIntention,
    DetailedDiagnosisThoroughTreatment02, DetailedDiagnosisThoroughTreatment03)
  .done();

/**
 * @id 212131
 * @name 应当有适当的休憩
 * @description
 * 战斗行动：我方出战角色为希格雯时，装备此牌。
 * 希格雯装备此牌后，立刻使用一次弹跳水疗法。
 * 装备有此牌的希格雯使用弹跳水疗法后，使我方接下来2次「元素战技」或召唤物造成的伤害+1。
 * （牌组中包含希格雯，才能加入牌组）
 */
export const RequiresAppropriateRest = card(212131)
  .since("v5.2.0")
  .costHydro(3)
  .talent(Sigewinne)
  .on("enter")
  .useSkill(ReboundHydrotherapy)
  .on("useSkill", (c, e) => e.skill.definition.id === ReboundHydrotherapy)
  .combatStatus(Convalescence)
  .done();
