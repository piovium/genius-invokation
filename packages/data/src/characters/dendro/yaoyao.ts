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

import { character, skill, summon, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 117042
 * @name 月桂·抛掷型
 * @description
 * 结束阶段：造成1点草元素伤害，治疗我方受伤最多的角色1点；如果可用次数仅剩余1，则此效果造成的伤害和治疗各+1。
 * 可用次数：2
 */
export const YueguiThrowingMode01 = summon(117042)
  .conflictWith(117041)
  .hint(DamageType.Dendro, "1")
  .on("endPhase")
  .usage(2)
  .do((c) => {
    if (c.getVariable("usage") === 1) {
      c.damage(DamageType.Dendro, 2);
      c.heal(2, "my characters order by health - maxHealth limit 1");
    } else {
      c.damage(DamageType.Dendro, 1);
      c.heal(1, "my characters order by health - maxHealth limit 1");
    }
  })
  .done();

/**
 * @id 117041
 * @name 月桂·抛掷型
 * @description
 * 结束阶段：造成1点草元素伤害，治疗我方受伤最多的角色1点。
 * 可用次数：2
 */
export const YueguiThrowingMode = summon(117041)
  .conflictWith(117042)
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(2)
  .heal(1, "my characters order by health - maxHealth limit 1")
  .done();

/**
 * @id 117043
 * @name 桂子仙机
 * @description
 * 我方切换角色后：造成1点草元素伤害，治疗我方出战角色1点。
 * 可用次数：3
 */
export const AdeptalLegacy = combatStatus(117043)
  .on("switchActive")
  .usage(3)
  .damage(DamageType.Dendro, 1)
  .heal(1, "my active")
  .done();

/**
 * @id 17041
 * @name 颠扑连环枪
 * @description
 * 造成2点物理伤害。
 */
export const TossNTurnSpear = skill(17041)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 17042
 * @name 云台团团降芦菔
 * @description
 * 召唤月桂·抛掷型。
 */
export const RaphanusSkyCluster: SkillHandle = skill(17042)
  .type("elemental")
  .costDendro(3)
  .if((c) => c.self.hasEquipment(Beneficent))
  .summon(YueguiThrowingMode01)
  .else()
  .summon(YueguiThrowingMode)
  .done();

/**
 * @id 17043
 * @name 玉颗珊珊月中落
 * @description
 * 造成1点草元素伤害，生成桂子仙机。
 */
export const MoonjadeDescent = skill(17043)
  .type("burst")
  .costDendro(4)
  .costEnergy(2)
  .damage(DamageType.Dendro, 1)
  .combatStatus(AdeptalLegacy)
  .done();

/**
 * @id 1704
 * @name 瑶瑶
 * @description
 * 玲珑玉质，身含仙骨。
 */
export const Yaoyao = character(1704)
  .since("v4.1.0")
  .tags("dendro", "pole", "liyue")
  .health(10)
  .energy(2)
  .skills(TossNTurnSpear, RaphanusSkyCluster, MoonjadeDescent)
  .done();

/**
 * @id 217041
 * @name 慈惠仁心
 * @description
 * 战斗行动：我方出战角色为瑶瑶时，装备此牌。
 * 瑶瑶装备此牌后，立刻使用一次云台团团降芦菔。
 * 装备有此牌的瑶瑶生成的月桂·抛掷型，在可用次数仅剩余最后1次时造成的伤害和治疗各+1。
 * （牌组中包含瑶瑶，才能加入牌组）
 */
export const Beneficent = card(217041)
  .since("v4.1.0")
  .costDendro(3)
  .talent(Yaoyao)
  .on("enter")
  .useSkill(RaphanusSkyCluster)
  .done();
