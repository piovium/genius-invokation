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

import { character, skill, summon, card, DamageType, SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 113041
 * @name 兔兔伯爵
 * @description
 * 我方出战角色受到伤害时：抵消2点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点火元素伤害。
 */
export const BaronBunny: SummonHandle = summon(113041)
  .tags("barrier")
  .hint(DamageType.Pyro, "2")
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(1, { autoDispose: false })
  .decreaseDamage(2)
  .on("endPhase", (c) => c.getVariable("usage") <= 0)
  .damage(DamageType.Pyro, 2)
  .dispose()
  .on("useSkill", (c, e) =>
    c.$(`@event.skillCaller and character with definition id ${Amber} and has equipment with definition id ${BunnyTriggered}`) &&
    e.isSkillType("normal"))
  .damage(DamageType.Pyro, 4)
  .dispose()
  .done();

/**
 * @id 13041
 * @name 神射手
 * @description
 * 造成2点物理伤害。
 */
export const Sharpshooter = skill(13041)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13042
 * @name 爆弹玩偶
 * @description
 * 召唤兔兔伯爵。
 */
export const ExplosivePuppet = skill(13042)
  .type("elemental")
  .costPyro(3)
  .summon(BaronBunny)
  .done();

/**
 * @id 13043
 * @name 箭雨
 * @description
 * 造成2点火元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
export const FieryRain = skill(13043)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 2, "opp standby")
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 1304
 * @name 安柏
 * @description
 * 如果想要成为一名伟大的牌手…
 * 首先，要有坐上牌桌的勇气。
 */
export const Amber = character(1304)
  .since("v3.7.0")
  .tags("pyro", "bow", "mondstadt")
  .health(12)
  .energy(2)
  .skills(Sharpshooter, ExplosivePuppet, FieryRain)
  .done();

/**
 * @id 213041
 * @name 一触即发
 * @description
 * 战斗行动：我方出战角色为安柏时，装备此牌。
 * 安柏装备此牌后，立刻使用一次爆弹玩偶。
 * 安柏普通攻击后：如果此牌和兔兔伯爵仍在场，则引爆兔兔伯爵，造成4点火元素伤害。
 * （牌组中包含安柏，才能加入牌组）
 */
export const BunnyTriggered = card(213041)
  .since("v3.7.0")
  .costPyro(3)
  .talent(Amber)
  .on("enter")
  .useSkill(ExplosivePuppet)
  .done();
