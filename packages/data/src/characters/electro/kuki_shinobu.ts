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

import { character, skill, combatStatus, card, DamageType, $ } from "@gi-tcg/core/builder";

/**
 * @id 114111
 * @name 越祓草轮
 * @description
 * 我方切换角色后：造成1点雷元素伤害，治疗我方受伤最多的角色1点。（每回合1次）
 * 可用次数：3
 */
export const GrassRingOfSanctification = combatStatus(114111)
  .on("switchActive")
  .usage(3)
  .usagePerRound(1)
  .damage(DamageType.Electro, 1, $.macros.oppActivePrioritized)
  .heal(1, $.macros.myMostInjured)
  .done();

/**
 * @id 14111
 * @name 忍流飞刃斩
 * @description
 * 造成2点物理伤害。
 */
export const ShinobusShadowsword = skill(14111)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14112
 * @name 越祓雷草之轮
 * @description
 * 生成越祓草轮。如果本角色生命值至少为6，则对自身造成2点穿透伤害。
 */
export const SanctifyingRing = skill(14112)
  .type("elemental")
  .costElectro(3)
  .combatStatus(GrassRingOfSanctification)
  .if((c) => c.self.health >= 6)
  .damage(DamageType.Piercing, 2, "@self")
  .done();

/**
 * @id 14113
 * @name 御咏鸣神刈山祭
 * @description
 * 造成4点雷元素伤害，治疗本角色2点。
 */
export const GyoeiNarukamiKariyamaRite = skill(14113)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 4)
  .heal(2, "@self")
  .done();

/**
 * @id 1411
 * @name 久岐忍
 * @description
 * 百业通才，鬼之副手。
 */
export const KukiShinobu = character(1411)
  .since("v4.6.0")
  .tags("electro", "sword", "inazuma")
  .health(10)
  .energy(2)
  .skills(ShinobusShadowsword, SanctifyingRing, GyoeiNarukamiKariyamaRite)
  .done();

/**
 * @id 214111
 * @name 割舍软弱之心
 * @description
 * 战斗行动：我方出战角色为久岐忍时，装备此牌。
 * 久岐忍装备此牌后，立刻使用一次御咏鸣神刈山祭。
 * 装备有此牌的久岐忍被击倒时：角色免于被击倒，并治疗该角色到1点生命值。（每回合1次）
 * 如果装备有此牌的久岐忍生命值不多于5，则该角色造成的伤害+1。
 * （牌组中包含久岐忍，才能加入牌组）
 */
export const ToWardWeakness = card(214111)
  .since("v4.6.0")
  .costElectro(4)
  .costEnergy(2)
  .talent(KukiShinobu)
  .on("enter")
  .useSkill(GyoeiNarukamiKariyamaRite)
  .on("beforeDefeated")
  .usagePerRound(1)
  .immune(1)
  .on("increaseSkillDamage", (c, e) => e.source.cast<"character">().health <= 5)
  .increaseDamage(1)
  .done();
