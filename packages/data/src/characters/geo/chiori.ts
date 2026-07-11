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

import { character, skill, summon, status, card, DamageType, type CardHandle, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 116091
 * @name 不悦挥刀之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时：我方千织造成的物理伤害变为岩元素伤害，且普通攻击造成的岩元素伤害+1。
 */
export const GrouchyKnifewieldingTamoto = summon(116091)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .on("enter")
  .do((c) => {
    c.characterStatus(GeoInfusion, `my character with definition id ${Chiori}`);
  })
  .on("selfDispose")
  .do((c) => {
    c.$(`my status with definition id ${GeoInfusion}`)?.dispose();
  })
  .done();

/**
 * @id 116092
 * @name 无事发生之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时，我方使用技能后：切换至下一个我方角色。（每回合1次）
 */
export const NothingToSeeHereTamoto = summon(116092)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .on("useSkill")
  .usagePerRound(1)
  .switchActive("my next")
  .done();

/**
 * @id 116093
 * @name 轻松迎敌之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时，千织以外的我方角色使用技能后：造成1点岩元素伤害。（每回合1次）
 */
export const EffortlesslyOutclassingOpponentsTamoto = summon(116093)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .on("useSkill", (c, e) => e.skill.caller.definition.id !== Chiori)
  .usagePerRound(1)
  .damage(DamageType.Geo, 1)
  .done();

/**
 * @id 116094
 * @name 平静养神之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 */
export const TranquillyTakingTenTamoto = summon(116094)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .done();

/**
 * @id 116095
 * @name 闭目战斗之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时：我方千织及千织的自动制御人形造成的岩元素伤害+1。（每回合2次）
 */
export const FightingWithHerEyesShutTamoto = summon(116095)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .on("increaseDamage", (c, e) =>
    ([...DOLLS, Chiori] as number[]).includes(e.source.definition.id) && 
    e.type === DamageType.Geo)
  .usagePerRound(2)
  .increaseDamage(1)
  .done();

/**
 * @id 116096
 * @name 侧目睥睨之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 千织进行普通攻击时：少花费1个元素骰。（每回合1次）
 */
export const BombasticSideeyeTamoto = summon(116096)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .on("deductOmniDiceSkill", (c, e) => e.action.skill.definition.id === WeavingBlade)
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 116097
 * @name 千织的自动制御人形
 * @description
 * 千织拥有多种自动制御人形，不但能自动发起攻击，还会提供多种增益效果。
 */
export const ChiorisAutomatonDolls = summon(116097)
  .since("v5.1.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(2)
  .done();

const USEFUL_DOLLS: SummonHandle[] = [
  GrouchyKnifewieldingTamoto,
  NothingToSeeHereTamoto,
  EffortlesslyOutclassingOpponentsTamoto,
  FightingWithHerEyesShutTamoto,
  BombasticSideeyeTamoto,
];
const DOLLS: SummonHandle[] = [
  ...USEFUL_DOLLS, 
  TranquillyTakingTenTamoto
];

/**
 * @id 116098
 * @name 岩元素附魔
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为岩元素伤害。
 */
export const GeoInfusion = status(116098)
  .since("v5.1.0")
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Geo)
  .done();

/**
 * @id 16091
 * @name 心织刀流
 * @description
 * 造成2点物理伤害。
 */
export const WeavingBlade = skill(16091)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 16092
 * @name 羽袖一触
 * @description
 * 从3个千织的自动制御人形中挑选1个召唤。
 */
export const FlutteringHasode = skill(16092)
  .type("elemental")
  .costGeo(3)
  .do((c) => {
    let count = 3;
    if (c.self.hasEquipment(InFiveColorsDyed)) {
      c.summon(TranquillyTakingTenTamoto);
      count = 4;
    }
    const candidates = c.randomSubset(USEFUL_DOLLS, count);
    c.selectAndSummon(candidates);
  })
  .done();

/**
 * @id 16093
 * @name 二刀之形·比翼
 * @description
 * 造成5点岩元素伤害。
 */
export const HiyokuTwinBlades = skill(16093)
  .type("burst")
  .costGeo(3)
  .costEnergy(2)
  .damage(DamageType.Geo, 5)
  .done();

/**
 * @id 1609
 * @name 千织
 * @description
 * 千红曙染，裁锦缀织。
 */
export const Chiori = character(1609)
  .since("v5.1.0")
  .tags("geo", "sword", "inazuma")
  .health(10)
  .energy(2)
  .skills(WeavingBlade, FlutteringHasode, HiyokuTwinBlades)
  .done();

/**
 * @id 216091
 * @name 落染五色
 * @description
 * 战斗行动：我方出战角色为千织时，装备此牌。
 * 千织装备此牌后，立刻使用一次羽袖一触。
 * 装备有此牌的千织使用羽袖一触时：额外召唤1个平静养神之袖，并改为从4个千织的自动制御人形中挑选1个并召唤。
 * （牌组中包含千织，才能加入牌组）
 */
export const InFiveColorsDyed = card(216091)
  .since("v5.1.0")
  .costGeo(4)
  .talent(Chiori)
  .on("enter")
  .useSkill(FlutteringHasode)
  .done();
