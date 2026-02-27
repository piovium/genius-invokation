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

import { character, skill, summon, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 112141
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
export const NightsoulsBlessing = status(112141)
  .since("v5.3.0")
  .nightsoulsBlessing(2)
  .done();

/**
 * @id 112143
 * @name 啃咬目标
 * @description
 * 受到玛拉妮或鲨鲨飞弹伤害时：移除此效果，每层使此伤害+2。
 * （层数可叠加，没有上限）
 */
export const BiteTarget = status(112143)
  .since("v5.3.0")
  .variableCanAppend("count", 1, Infinity)
  .on("increaseDamaged", (c, e) => e.source.definition.id === Mualani || e.source.definition.id === SharkMissile)
  .do((c, e) => {
    e.increaseDamage(2 * c.getVariable("count"));
  })
  .dispose()
  .done();

/**
 * @id 112142
 * @name 咬咬鲨鱼
 * @description
 * 双方切换角色后，且玛拉妮为出战角色时：消耗1点「夜魂值」，使敌方出战角色附属啃咬目标。
 * 特技：鲨鲨冲浪板
 * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持。
 * [1121421: ] ()
 * [1121422: 鲨鲨冲浪板] (1*Hydro) 切换到上一个我方角色，使敌方出战角色附属1层啃咬目标。（若我方后台角色均被击倒，则额外消耗1点「夜魂值」）
 * [1121423: ] ()
 */
export const BiteyShark = card(112142)
  .since("v5.3.0")
  .nightsoulTechnique()
  .on("switchActive", (c) => c.self.master.isActive())
  .listenToAll()
  .consumeNightsoul("@master")
  .characterStatus(BiteTarget, "opp active")
  .endOn()
  .provideSkill(1121422)
  .costHydro(1)
  .switchActive("my prev")
  .characterStatus(BiteTarget, "opp active")
  .if((c) => c.$$(`my standby`).length === 0)
  .consumeNightsoul("@master")
  .done();

/**
 * @id 112144
 * @name 鲨鲨飞弹
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2（可叠加，没有上限）
 */
export const SharkMissile = summon(112144)
  .since("v5.3.0")
  .endPhaseDamage(DamageType.Hydro, 2)
  .usageCanAppend(2, Infinity)
  .done();

/**
 * @id 12141
 * @name 降温处理
 * @description
 * 造成1点水元素伤害。
 */
export const CoolingTreatment = skill(12141)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12142
 * @name 踏鲨破浪
 * @description
 * 自身附属咬咬鲨鱼，然后进入夜魂加持，并获得2点「夜魂值」。（角色进入夜魂加持后不可使用此技能）
 * （附属咬咬鲨鱼的角色可以使用特技：鲨鲨冲浪板）
 */
export const SurfsharkWavebreaker: SkillHandle = skill(12142)
  .type("elemental")
  .costHydro(2)
  .filter((c) => !c.self.hasStatus(NightsoulsBlessing))
  .equip(BiteyShark, "@self")
  .gainNightsoul("@self", 2)
  .done();

/**
 * @id 12143
 * @name 爆瀑飞弹
 * @description
 * 造成2点水元素伤害，召唤鲨鲨飞弹。
 */
export const BoomsharkaLaka = skill(12143)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .summon(SharkMissile)
  .done();

/**
 * @id 1214
 * @name 玛拉妮
 * @description
 * 流泉不息，踏浪前行。
 */
export const Mualani = character(1214)
  .since("v5.3.0")
  .tags("hydro", "catalyst", "natlan")
  .health(10)
  .energy(2)
  .skills(CoolingTreatment, SurfsharkWavebreaker, BoomsharkaLaka)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 212141
 * @name 夜域赐礼·波涛顶底
 * @description
 * 装备有此牌的玛拉妮切换为「出战角色」时：触发1个随机我方「召唤物」的「结束阶段」效果。（每回合1次）
 * （牌组中包含玛拉妮，才能加入牌组）
 */
export const NightRealmsGiftCrestsAndTroughs = card(212141)
  .since("v5.3.0")
  .costHydro(1)
  .talent(Mualani, "none")
  .on("switchActive", (c, e) =>
    e.switchInfo.to.id === c.self.master.id &&
    c.$$(`my summon`).length > 0)
  .usagePerRound(1)
  .do((c) => {
    const summons = c.$$(`my summon`);
    if (summons.length > 0) {
      const targetSummon = c.random(summons);
      c.triggerEndPhaseSkill(targetSummon);
    }
  })
  .done();
