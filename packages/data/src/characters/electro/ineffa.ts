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

import { character, skill, summon, card, DamageType, Reaction } from "@gi-tcg/core/builder";
import { Conductive, NoTuningAllowed, Shield } from "../../commons";
import type { EntityType } from "@gi-tcg/core";

/**
 * @id 114171
 * @name 薇尔琪塔
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 */
export const Birgitta = summon(114171)
  .since("v6.4.0")
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(2)
  .done();

/**
 * @id 14171
 * @name 除尘旋刃
 * @description
 * 造成2点物理伤害。
 */
export const CyclonicDuster = skill(14171)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14172
 * @name 涤净模式·稳态载频
 * @description
 * 生成2点护盾，召唤薇尔琪塔。
 */
export const CleaningModeCarrierFrequency = skill(14172)
  .type("elemental")
  .costElectro(3)
  .combatStatus(Shield, "my", {
    overrideVariables: { shield: 2 }
  })
  .summon(Birgitta)
  .done();

/**
 * @id 14173
 * @name 至高律令·全域扫灭
 * @description
 * 造成4点雷元素伤害，召唤薇尔琪塔。
 */
export const SupremeInstructionCyclonicExterminator = skill(14173)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 4)
  .summon(Birgitta)
  .done();

/**
 * @id 14174
 * @name 月兆祝赐·象拟中继
 * @description
 * 【被动】本局游戏中，敌方受到感电反应时，改为月感电反应。
 * 自身在场，敌方行动牌被赋予电击时：额外赋予不可调和状态。
 */
export const MoonsignBenedictionAssemblageHub = skill(14174)
  .type("passive")
  .on("enterRelative", (c, e) => !e.entity.isMine() && e.entity.definition.id === Conductive)
  .listenToAll()
  .do((c, e) => {
    const area = e.entity.area;
    if (area.type === "hands" || area.type === "pile") {
      c.attach(NoTuningAllowed, c.get<EntityType>(area.cardId));
    }
  })
  .done();

/**
 * @id 14175
 * @name 月兆祝赐·象拟中继
 * @description
 * 自身在场，敌方行动牌被赋予电击时：额外赋予不可调和状态。
 */
export const MoonsignBenedictionAssemblageHub01 = skill(14175)
  .reserve();

/**
 * @id 1417
 * @name 伊涅芙
 * @description
 * 白铁锻身，赤心铸魂。
 */
export const Ineffa = character(1417)
  .since("v6.4.0")
  .tags("electro", "pole", "nodkrai")
  .health(10)
  .energy(2)
  .skills(CyclonicDuster, CleaningModeCarrierFrequency, SupremeInstructionCyclonicExterminator, MoonsignBenedictionAssemblageHub)
  .enableLunarReactions(Reaction.LunarElectroCharged)
  .done();

/**
 * @id 214171
 * @name 循环整流引擎
 * @description
 * 快速行动：装备给我方的伊涅芙。
 * 赋予敌方随机1张手牌电击，然后重复1次。
 * 我方触发月感电反应后：赋予敌方随机1张手牌费用增加。
 * （牌组中包含伊涅芙，才能加入牌组）
 */
export const RectifyingProcessor = card(214171)
  .since("v6.4.0")
  .costElectro(1)
  .talent(Ineffa, "none")
  .on("enter")
  .do((c) => {
    for (let i = 0; i < 2; i++) {
      const target = c.random(c.oppPlayer.hands);
      if (target) {
        c.attach(Conductive, target);
      }
    }
  })
  .on("dealReaction", (c, e) => e.type === Reaction.LunarElectroCharged)
  .listenToPlayer()
  .do((c) => {
    const target = c.random(c.oppPlayer.hands);
    if (target) {
      c.attachCostIncrease(target);
    }
  })
  .done();
