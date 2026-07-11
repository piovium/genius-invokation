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
 * @id 126012
 * @name 坚岩之力
 * @description
 * 角色造成的物理伤害变为岩元素伤害。
 * 每回合1次：角色造成的伤害+1。
 * 角色所附属的「岩盔」被移除后：也移除此状态。
 */
export const StoneForce = status(126012)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Geo)
  .on("increaseSkillDamage")
  .usagePerRound(1)
  .increaseDamage(1)
  .on("dispose", (c, e) => e.entity.definition.id === Stonehide)
  .dispose()
  .done();

/**
 * @id 126011
 * @name 岩盔
 * @description
 * 所附属角色受到伤害时：抵消1点伤害。抵消岩元素伤害时，需额外消耗1次可用次数。
 * 可用次数：3
 */
export const Stonehide = status(126011)
  .tags("barrier")
  .on("decreaseDamaged")
  .usage(3)
  .decreaseDamage(1)
  .if((c, e) => e.type === DamageType.Geo)
  .addVariable("usage", -1)
  .done();

/**
 * @id 26011
 * @name Plama Lawa
 * @description
 * 造成2点物理伤害。
 */
export const PlamaLawa = skill(26011)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 26012
 * @name Movo Lawa
 * @description
 * 造成3点物理伤害。
 */
export const MovoLawa = skill(26012)
  .type("elemental")
  .costGeo(3)
  .damage(DamageType.Physical, 3)
  .done();

/**
 * @id 26013
 * @name Upa Shato
 * @description
 * 造成5点物理伤害。
 */
export const UpaShato = skill(26013)
  .type("burst")
  .costGeo(3)
  .costEnergy(2)
  .damage(DamageType.Physical, 5)
  .done();

/**
 * @id 26014
 * @name 魔化：岩盔
 * @description
 * 【被动】战斗开始时，初始附属岩盔和坚岩之力。
 */
export const InfusedStonehide = skill(26014)
  .type("passive")
  .on("battleBegin")
  .characterStatus(Stonehide)
  .characterStatus(StoneForce)
  .done();

/**
 * @id 2601
 * @name 丘丘岩盔王
 * @description
 * 绕道而行吧，因为前方是属于「王」的领域。
 */
export const StonehideLawachurl = character(2601)
  .since("v3.3.0")
  .tags("geo", "monster", "hilichurl")
  .health(10)
  .energy(2)
  .skills(PlamaLawa, MovoLawa, UpaShato, InfusedStonehide)
  .done();

/**
 * @id 226011
 * @name 重铸：岩盔
 * @description
 * 战斗行动：我方出战角色为丘丘岩盔王时，装备此牌。
 * 丘丘岩盔王装备此牌后，立刻使用一次Upa Shato。
 * 装备有此牌的丘丘岩盔王击倒敌方角色后：丘丘岩盔王重新附属岩盔和坚岩之力。
 * （牌组中包含丘丘岩盔王，才能加入牌组）
 */
export const StonehideReforged = card(226011)
  .since("v3.3.0")
  .costGeo(4)
  .costEnergy(2)
  .talent(StonehideLawachurl)
  .on("enter")
  .useSkill(UpaShato)
  .on("defeated", (c, e) => e.source.id === c.self.master.id)
  .listenToAll()
  .characterStatus(Stonehide, "@master")
  .characterStatus(StoneForce, "@master")
  .done();
