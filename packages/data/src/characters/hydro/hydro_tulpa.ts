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

import { character, skill, summon, card, DamageType, status } from "@gi-tcg/core/builder";

/**
 * @id 122061
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
export const HalfTulpa01 = summon(122061)
  .since("v6.1.0")
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(2)
  .on("selfDispose")
  .heal(2, `my characters with definition id 2206`)
  .done();

/**
 * @id 122062
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
export const HalfTulpa02 = summon(122062)
  .since("v6.1.0")
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(2)
  .on("selfDispose")
  .heal(2, `my characters with definition id 2206`)
  .done();

/**
 * @id 122063
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
export const HalfTulpa03 = summon(122063)
  .since("v6.1.0")
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(2)
  .on("selfDispose")
  .heal(2, `my characters with definition id 2206`)
  .done();

/**
 * @id 122064
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
export const HalfTulpa04 = summon(122064)
  .since("v6.1.0")
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(2)
  .on("selfDispose")
  .heal(2, `my characters with definition id 2206`)
  .done();

/**
 * @id 22061
 * @name 涌浪
 * @description
 * 造成1点水元素伤害。
 */
export const SavageSwell = skill(22061)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 22062
 * @name 汛波
 * @description
 * 造成2点水元素伤害，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
export const StormSurge = skill(22062)
  .type("elemental")
  .costHydro(3)
  .noEnergy() // 出于神秘原因，e的所有效果，包括获得充能，都以使用技能后的方式写出
  .done();

/**
 * @id 22063
 * @name 洪啸
 * @description
 * 造成4点水元素伤害，触发我方所有「召唤物」的「结束阶段」效果。
 */
export const ThunderingTide = skill(22063)
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .damage(DamageType.Hydro, 4)
  .done();

/**
 * @id 22064
 * @name 分流
 * @description
 * 自身生命值不低于3，我方半幻人以外的「召唤物」离场时：自身受到2点穿透伤害，召唤1个独立的半幻人。（每回合1次）
 */
export const BranchingFlow = skill(22064)
  .type("passive")
  // 分流：每回合一次在召唤物离场时召唤半幻人
  .on("dispose", (c, e) =>
    e.entity.definition.type === "summon" &&
    !([HalfTulpa01, HalfTulpa02, HalfTulpa03, HalfTulpa04] as number[]).includes(e.entity.definition.id) &&
    c.self.health >= 3
  )
  .listenToPlayer()
  .usagePerRound(1, { name: "usagePerRound1" })
  .do((c) => {
    c.damage(DamageType.Piercing, 2, "@self");
    if (!c.$(`my summon with definition id ${HalfTulpa01}`)) {
      c.summon(HalfTulpa01);
    } else if (!c.$(`my summon with definition id ${HalfTulpa02}`)) {
      c.summon(HalfTulpa02);
    } else if (!c.$(`my summon with definition id ${HalfTulpa03}`)) {
      c.summon(HalfTulpa03);
    } else {
      c.summon(HalfTulpa04);
    }
  })
  // 汛波：造成2点水元素伤害；如果自身生命值不低于2，就造成1点穿透伤害
  .on("useSkill", (c, e) => e.skill.definition.id === StormSurge)
  .damage(DamageType.Hydro, 2)
  .if((c) => c.self.health >= 2)
  .damage(DamageType.Piercing, 1, "@self")
  // 汛波：获得充能
  .on("useSkill", (c, e) => e.skill.definition.id === StormSurge)
  .gainEnergy(1, "@self")
  // 汛波：随机触发一个召唤物的结束阶段技能
  .on("useSkill", (c, e) => e.skill.definition.id === StormSurge && c.$(`my summons`))
  .abortPreview()
  .do((c) => {
    const target = c.random(c.player.summons);
    c.triggerEndPhaseSkill(target);
  })
  // 洪啸：触发所有召唤物的结束阶段技能
  .on("useSkill", (c, e) => e.skill.definition.id === ThunderingTide)
  .do((c) => {
    for (const summon of c.$$(`my summons`)) {
      c.triggerEndPhaseSkill(summon);
    }
  })
  .done();

/**
 * @id 22065
 * @name 汛波
 * @description
 * 造成2点水元素伤害，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
export const StormSurge01 = skill(22065)
  .reserve();

/**
 * @id 22066
 * @name 汛波
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
export const StormSurge02 = skill(22066)
  .reserve();

/**
 * @id 22067
 * @name 洪啸
 * @description
 * 造成4点水元素伤害，触发我方所有「召唤物」的「结束阶段」效果。
 */
export const ThunderingTide01 = skill(22067)
  .reserve();

/**
 * @id 22068
 * @name 洪啸
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，触发我方所有「召唤物」的「结束阶段」效果。
 */
export const ThunderingTide02 = skill(22068)
  .reserve();

/**
 * @id 2206
 * @name 水形幻人
 * @description
 * 由无数的水滴凝聚成的，初具人形的魔物。
 */
export const HydroTulpa = character(2206)
  .since("v6.1.0")
  .tags("hydro", "monster")
  .health(11)
  .energy(3)
  .skills(SavageSwell, StormSurge, ThunderingTide, BranchingFlow)
  .done();

/**
 * @id 222062
 * @name 元素生命·水
 * @description
 * 角色总是附着水元素，并且免疫水元素伤害。
 * 持续回合：2
 */
export const ElementalLifeformHydro = status(222062)
  .duration(2)
  .on("enter")
  .apply(DamageType.Hydro, "@master")
  .on("modifyReaction")
  .reApplyTo(DamageType.Hydro)
  .on("decreaseDamaged", (c, e) => e.type === DamageType.Hydro)
  .do((c, e) => {
    e.decreaseDamage(e.value);
  })
  .done();

/**
 * @id 222061
 * @name 汇流
 * @description
 * 快速行动：装备给我方的水形幻人，使其附属元素生命·水。（角色总是附着水元素，并且免疫水元素伤害。持续回合：2）
 * 装备有此牌的水形幻人在场时，我方宣布结束后，如果所附属角色生命值不低于3，则所附属角色受到2点穿透伤害，召唤1个独立的半幻人。
 * （牌组中包含水形幻人，才能加入牌组）
 */
export const FlowConvergence = card(222061)
  .since("v6.1.0")
  .costHydro(2)
  .talent(HydroTulpa, "none")
  .on("enter")
  .characterStatus(ElementalLifeformHydro, "@master")
  .on("declareEnd", (c, e) => c.self.master.health >= 3)
  .damage(DamageType.Piercing, 2, "@master")
  .do((c) => {
    if (!c.$(`my summon with definition id ${HalfTulpa01}`)) {
      c.summon(HalfTulpa01);
    } else if (!c.$(`my summon with definition id ${HalfTulpa02}`)) {
      c.summon(HalfTulpa02);
    } else if (!c.$(`my summon with definition id ${HalfTulpa03}`)) {
      c.summon(HalfTulpa03);
    } else {
      c.summon(HalfTulpa04);
    }
  })
  .done();
