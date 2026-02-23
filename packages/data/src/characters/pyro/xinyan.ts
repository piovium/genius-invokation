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

import { character, skill, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 113123
 * @name 氛围烈焰
 * @description
 * 我方宣布结束时：如果我方的手牌数量不多于1，则造成1点火元素伤害。
 * 可用次数：2
 */
export const FestiveFires = combatStatus(113123)
  .on("declareEnd", (c) => c.player.hands.length <= 1)
  .usage(2)
  .damage(DamageType.Pyro, 1)
  .done();

/**
 * @id 113121
 * @name 热情护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
export const ShieldOfPassion = combatStatus(113121)
  .shield(2)
  .done();

/**
 * @id 13121
 * @name 炎舞
 * @description
 * 造成2点物理伤害。
 */
export const DanceOnFire = skill(13121)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13122
 * @name 热情拂扫
 * @description
 * 造成2点火元素伤害，随机舍弃1张当前元素骰费用最高的手牌，生成热情护盾。
 */
export const SweepingFervor = skill(13122)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 2)
  .disposeMaxCostHands(1)
  .combatStatus(ShieldOfPassion)
  .done();

/**
 * @id 13123
 * @name 叛逆刮弦
 * @description
 * 造成3点物理伤害，对所有敌方后台角色造成2点穿透伤害；舍弃我方所有手牌，生成氛围烈焰。
 */
export const RiffRevolution = skill(13123)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 2, "opp standby")
  .damage(DamageType.Physical, 3)
  .abortPreview()
  .do((c) => {
    const cards = c.player.hands.toSorted((a, b) => b.diceCost() - a.diceCost());
    c.disposeCard(...cards);
  })
  .combatStatus(FestiveFires)
  .done();

/**
 * @id 1312
 * @name 辛焱
 * @description
 * 摇滚时间到！
 */
export const Xinyan = character(1312)
  .since("v4.7.0")
  .tags("pyro", "claymore", "liyue")
  .health(10)
  .energy(2)
  .skills(DanceOnFire, SweepingFervor, RiffRevolution)
  .done();

/**
 * @id 213121
 * @name 地狱里摇摆
 * @description
 * 战斗行动：我方出战角色为辛焱时，装备此牌。
 * 辛焱装备此牌后，立刻使用一次炎舞。
 * 装备有此牌的辛焱使用技能时：如果我方手牌数量不多于1，则造成的伤害+2。（每回合1次）
 * （牌组中包含辛焱，才能加入牌组）
 */
export const RockinInAFlamingWorld = card(213121)
  .since("v4.7.0")
  .costPyro(1)
  .costVoid(2)
  .talent(Xinyan)
  .on("enter")
  .useSkill(DanceOnFire)
  .on("increaseSkillDamage", (c) => c.player.hands.length <= 1)
  .usagePerRound(1)
  .increaseDamage(2)
  .done();
