// Copyright (C) 2026 Piovium Labs
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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 123061
 * @name 金焰形态
 * @description
 * 结束阶段：如果所附属角色为出战角色，则造成1点火元素伤害，对所有敌方后台角色造成1点穿透伤害。
 * 可用次数：1（可叠加，没有上限）
 */
export const GoldflameState = status(123061)
  .since("v6.4.0")
  .on("endPhase", (c, e) => c.self.master.isActive())
  .usageCanAppend(1, Infinity)
  .do((c) => {
    const chosen = c.$(`my equipment with definition id ${FlamelordsBlessing}`)
      ? c.random(c.player.hands)
      : null;
    const damageValue = 1 + (chosen?.diceCost() ?? 0);
    c.damage(DamageType.Piercing, 1, "opp standby");
    c.damage(DamageType.Pyro, damageValue);
    if (chosen) {
      c.disposeCard(chosen);
    }
  })
  .done();

/**
 * @id 123062
 * @name 飞旋
 * @description
 * 自身下次受到的伤害-1。
 * 可用次数：1（可叠加，没有上限）
 */
export const FlyingSwirl = status(123062)
  .since("v6.4.0")
  .tags("barrier")
  .on("decreaseDamaged")
  .usageCanAppend(1, Infinity)
  .decreaseDamage(1)
  .done();

/**
 * @id 23061
 * @name 翼斩
 * @description
 * 造成2点物理伤害。
 */
export const Wingcleave = skill(23061)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 23062
 * @name 升腾炽风
 * @description
 * 造成1点火元素伤害，自身附属2层飞旋。
 */
export const HotRisingWind = skill(23062)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 1)
  .characterStatus(FlyingSwirl, "@self", {
    overrideVariables: {
      usage: 2
    }
  })
  .done();

/**
 * @id 23063
 * @name 金焰爆轰
 * @description
 * 造成3点火元素伤害，对所有敌方后台角色造成1点穿透伤害，自身附属1层金焰形态。
 */
export const GoldflameExplosion = skill(23063)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Pyro, 3)
  .characterStatus(GoldflameState, "@self")
  .done();

/**
 * @id 23064
 * @name 古老者的血脉
 * @description
 * 【被动】偶数行动阶段开始时：自身附属1层金焰形态。
 */
export const AncientBloodline = skill(23064)
  .type("passive")
  .on("actionPhase", (c) => c.roundNumber % 2 === 0)
  .characterStatus(GoldflameState, "@self")
  .done();

/**
 * @id 2306
 * @name 金焰绒翼龙暴君
 * @description
 * 因承受了如今龙众的身躯无法驭使的伟力，而拥有超然形体的异种绒翼龙。
 */
export const GoldflameQucusaurTyrant = character(2306)
  .since("v6.4.0")
  .tags("pyro", "monster")
  .health(11)
  .energy(2)
  .skills(Wingcleave, HotRisingWind, GoldflameExplosion, AncientBloodline)
  .done();

/**
 * @id 223061
 * @name 「焰主之祝」
 * @description
 * 战斗行动：我方出战角色为金焰绒翼龙暴君时，装备此牌。
 * 金焰绒翼龙暴君装备此牌后，立刻使用一次金焰爆轰。
 * 我方金焰形态触发时，额外舍弃1张随机手牌，金焰形态造成的伤害额外提高，其数值等同于所舍弃手牌的当前元素骰费用。
 * （牌组中包含金焰绒翼龙暴君，才能加入牌组）
 */
export const FlamelordsBlessing = card(223061)
  .since("v6.4.0")
  .costPyro(3)
  .costEnergy(2)
  .talent(GoldflameQucusaurTyrant)
  .on("enter")
  .useSkill(GoldflameExplosion)
  .done();
