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

import { character, skill, summon, combatStatus, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 117011
 * @name 柯里安巴
 * @description
 * 结束阶段：造成2点草元素伤害。
 * 可用次数：2
 */
export const CuileinAnbar = summon(117011)
  .endPhaseDamage(DamageType.Dendro, 2)
  .usage(2)
  .done();

/**
 * @id 117012
 * @name 新叶
 * @description
 * 我方角色使用技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * 持续回合：1
 */
export const Sprout = combatStatus(117012)
  .duration(1)
  .on("skillReaction", (c, e) => e.relatedTo(DamageType.Dendro))
  .usagePerRound(1)
  .damage(DamageType.Dendro, 1)
  .done();

/**
 * @id 17011
 * @name 祈颂射艺
 * @description
 * 造成2点物理伤害。
 */
export const SupplicantsBowmanship = skill(17011)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 17012
 * @name 拂花偈叶
 * @description
 * 造成3点草元素伤害。
 */
export const FloralBrush: SkillHandle = skill(17012)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 3)
  .if((c) => c.self.hasEquipment(FloralSidewinder))
  .combatStatus(Sprout)
  .done();

/**
 * @id 17013
 * @name 猫猫秘宝
 * @description
 * 造成2点草元素伤害，召唤柯里安巴。
 */
export const TrumpcardKitty = skill(17013)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 2)
  .summon(CuileinAnbar)
  .done();

/**
 * @id 1701
 * @name 柯莱
 * @description
 * 「大声喊出卡牌的名字会让它威力加倍…这一定是虚构的吧？」
 */
export const Collei = character(1701)
  .since("v3.3.0")
  .tags("dendro", "bow", "sumeru")
  .health(11)
  .energy(2)
  .skills(SupplicantsBowmanship, FloralBrush, TrumpcardKitty)
  .done();

/**
 * @id 217011
 * @name 飞叶迴斜
 * @description
 * 战斗行动：我方出战角色为柯莱时，装备此牌。
 * 柯莱装备此牌后，立刻使用一次拂花偈叶。
 * 装备有此牌的柯莱使用了拂花偈叶的回合中，我方角色的技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * （牌组中包含柯莱，才能加入牌组）
 */
export const FloralSidewinder = card(217011)
  .since("v3.3.0")
  .costDendro(3)
  .talent(Collei)
  .on("enter")
  .useSkill(FloralBrush)
  .done();
