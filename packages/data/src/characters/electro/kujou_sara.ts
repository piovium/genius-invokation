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

import { character, skill, summon, status, card, DamageType, SkillHandle, $, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 114063
 * @name 鸣煌护持
 * @description
 * 所附属角色元素战技和元素爆发造成的伤害+1。
 * 可用次数：2
 */
export const CrowfeatherCover = status(114063)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("elemental") || e.viaSkillType("burst"))
  .usage(2)
  .increaseDamage(1)
  .if((c) => c.self.master.element() === DiceType.Electro && c.query($.my.typeEquipment.def(SinOfPride)))
  .increaseDamage(1)
  .done();

/**
 * @id 114061
 * @name 天狗咒雷·伏
 * @description
 * 结束阶段：造成1点雷元素伤害，我方出战角色附属鸣煌护持。
 * 可用次数：1
 */
export const TenguJuuraiAmbush = summon(114061)
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(1)
  .characterStatus(CrowfeatherCover, "my active")
  .done();

/**
 * @id 114062
 * @name 天狗咒雷·雷砾
 * @description
 * 结束阶段：造成2点雷元素伤害，我方出战角色附属鸣煌护持。
 * 可用次数：2
 */
export const TenguJuuraiStormcluster = summon(114062)
  .endPhaseDamage(DamageType.Electro, 2)
  .usage(2)
  .characterStatus(CrowfeatherCover, "my active")
  .done();

/**
 * @id 14061
 * @name 天狗传弓术
 * @description
 * 造成2点物理伤害。
 */
export const TenguBowmanship = skill(14061)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14062
 * @name 鸦羽天狗霆雷召咒
 * @description
 * 造成1点雷元素伤害，召唤天狗咒雷·伏。
 */
export const TenguStormcall: SkillHandle = skill(14062)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 1)
  .summon(TenguJuuraiAmbush)
  .done();

/**
 * @id 14063
 * @name 煌煌千道镇式
 * @description
 * 造成1点雷元素伤害，召唤天狗咒雷·雷砾。
 */
export const SubjugationKoukouSendou: SkillHandle = skill(14063)
  .type("burst")
  .costElectro(4)
  .costEnergy(2)
  .damage(DamageType.Electro, 1)
  .summon(TenguJuuraiStormcluster)
  .done();

/**
 * @id 1406
 * @name 九条裟罗
 * @description
 * 「此为，大义之举。」
 */
export const KujouSara = character(1406)
  .since("v3.5.0")
  .tags("electro", "bow", "inazuma")
  .health(10)
  .energy(2)
  .skills(TenguBowmanship, TenguStormcall, SubjugationKoukouSendou)
  .done();

/**
 * @id 214061
 * @name 我界
 * @description
 * 战斗行动：我方出战角色为九条裟罗时，装备此牌。
 * 九条裟罗装备此牌后，立刻使用一次鸦羽天狗霆雷召咒。
 * 装备有此牌的九条裟罗在场时，我方附属有鸣煌护持的雷元素角色，元素战技和元素爆发造成的伤害额外+1。
 * （牌组中包含九条裟罗，才能加入牌组）
 */
export const SinOfPride = card(214061)
  .since("v3.5.0")
  .costElectro(3)
  .talent(KujouSara)
  .on("enter")
  .useSkill(TenguStormcall)
  .done();
