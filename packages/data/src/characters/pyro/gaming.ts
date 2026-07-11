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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 13164
 * @name 踏云献瑞
 * @description
 * 造成2点火元素伤害。
 */
export const CharmedCloudstrider = skill(13164)
  .type("normal")
  .hidden()
  .forcePlunging()
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 113163
 * @name 踏云献瑞
 * @description
 * 本角色将在下次行动时，直接使用技能：踏云献瑞。
 */
export const CharmedCloudstriderStatus = status(113163)
  .reserve();

/**
 * @id 113161
 * @name 舞兽之法
 * @description
 * 我方选择行动前，如果所附属角色为出战角色，则使用技能踏云献瑞。
 */
export const WushouArts = status(113161)
  .since("v6.2.0")
  .once("replaceActionBySkill")
  .useSkill(CharmedCloudstrider)
  .done();

/**
 * @id 113162
 * @name 猊兽·文仔
 * @description
 * 所附属角色的「元素战技」少花费1个元素骰，造成的伤害+1。
 * 所附属角色使用「元素战技」时：如果当前生命值不低于5，则不消耗可用次数，改为对所附属角色造成1点穿透伤害。
 * 可用次数：2
 */
export const SuanniManChai = status(113162)
  .since("v6.2.0")
  .on("deductOmniDiceSkill", (c, e) => e.isSkillType("elemental"))
  .deductOmniCost(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("elemental"))
  .usage(2, { autoDecrease: false })
  .do((c, e) => {
    e.increaseDamage(1);
    if (c.self.master.health >= 5) {
      c.damage(DamageType.Piercing, 1, "@master");
    } else {
      c.consumeUsage();
    }
  })
  .done();

/**
 * @id 13161
 * @name 刃爪悬星
 * @description
 * 造成2点物理伤害。
 */
export const StellarRend = skill(13161)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13162
 * @name 瑞兽登高楼
 * @description
 * 造成1点火元素伤害，自身附属舞兽之法，我方切换到下一个角色。
 */
export const BestialAscent = skill(13162)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 1)
  .characterStatus(WushouArts, "@self")
  .switchActive("my next")
  .done();

/**
 * @id 13163
 * @name 璨焰金猊舞
 * @description
 * 造成2点火元素伤害，自身附属猊兽·文仔。
 */
export const SuannisGildedDance = skill(13163)
  .type("burst")
  .costPyro(3)
  .costEnergy(3)
  .damage(DamageType.Pyro, 2)
  .characterStatus(SuanniManChai, "@self")
  .done();

/**
 * @id 13165
 * @name 踏云献瑞
 * @description
 * 造成D__KEY__DAMAGE点物理伤害。
 */
export const BestialAscentPassive = skill(13165)
  .reserve();

/**
 * @id 1316
 * @name 嘉明
 * @description
 * 威姿劲步，踔厉猛进。
 */
export const Gaming = character(1316)
  .since("v6.2.0")
  .tags("pyro", "claymore", "liyue")
  .health(10)
  .energy(3)
  .skills(StellarRend, BestialAscent, SuannisGildedDance, CharmedCloudstrider)
  .done();

/**
 * @id 213161
 * @name 通明庇佑
 * @description
 * 战斗行动：我方出战角色为嘉明时，装备此牌。
 * 嘉明装备此牌后，立刻使用一次璨焰金猊舞。
 * 所附属角色进行下落攻击时：伤害额外+1。
 * 所附属角色使用「元素战技」后：治疗所附属角色2点。（每回合1次）
 * （牌组中包含嘉明，才能加入牌组）
 */
export const BringerOfBlessing = card(213161)
  .since("v6.2.0")
  .costPyro(3)
  .costEnergy(3)
  .talent(Gaming)
  .on("enter")
  .useSkill(SuannisGildedDance)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .usagePerRound(1)
  .heal(2, "@master")
  .done();
