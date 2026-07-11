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

import { character, skill, status, card, DamageType, type CardHandle } from "@gi-tcg/core/builder";

/**
 * @id 23046
 * @name 炽烈轰破
 * @description
 * （需准备1个行动轮）
 * 造成1点火元素伤害，对敌方所有后台角色造成2点穿透伤害。本角色每附属有2层重甲蟹壳，就使此技能造成的火元素伤害+1。
 */
export const SearingBlast = skill(23046)
  .type("burst")
  .prepared()
  .damage(DamageType.Piercing, 2, "opp standby")
  .do((c) => {
    const value = c.$(`status with definition id ${ArmoredCrabCarapace} at @self`)?.getVariable("shield") ?? 0;
    c.damage(DamageType.Pyro, 1 + Math.floor(value / 2));
  })
  .done();

/**
 * @id 123043
 * @name 积蓄烈威
 * @description
 * 本角色将在下次行动时，直接使用技能：炽烈轰破。
 */
export const AccruingPower = status(123043)
  .prepare(SearingBlast)
  .done();

/**
 * @id 123041
 * @name 重甲蟹壳
 * @description
 * 每层提供1点护盾，保护所附属角色。
 */
export const ArmoredCrabCarapace = status(123041)
  .shield(0, Infinity)
  .done();

/**
 * @id 123044
 * @name 披甲钳进
 * @description
 * 行动阶段开始时：如果所附属角色未附属重甲蟹壳，则附属3层重甲蟹壳。
 */
export const HeavyClampdown = status(123044)
  .reserve();

/**
 * @id 23041
 * @name 重钳碎击
 * @description
 * 造成2点物理伤害。
 */
export const ShatterclampStrike = skill(23041)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 23042
 * @name 烈焰燃绽
 * @description
 * 造成1点火元素伤害；如果本角色附属有至少7层重甲蟹壳，则此伤害+1。
 * 然后，本角色附属2层重甲蟹壳。
 */
export const BusterBlaze = skill(23042)
  .type("elemental")
  .costPyro(3)
  .do((c) => {
    const value = c.$(`status with definition id ${ArmoredCrabCarapace} at @self`)?.getVariable("shield") ?? 0;
    if (value >= 7) {
      c.damage(DamageType.Pyro, 2);
    } else {
      c.damage(DamageType.Pyro, 1);
    }
  })
  .characterStatus(ArmoredCrabCarapace, "@self", {
    overrideVariables: {
      shield: 2
    }
  })
  .done();

/**
 * @id 23043
 * @name 战阵爆轰
 * @description
 * 本角色准备技能：炽烈轰破。
 */
export const BattlelineDetonation = skill(23043)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .characterStatus(AccruingPower, "@self")
  .done();

/**
 * @id 23044
 * @name 帝王甲胄
 * @description
 * 【被动】战斗开始时：初始附属5层重甲蟹壳。
 * 我方执行任意行动后：如果我方场上存在重甲蟹壳以外的护盾状态或护盾出战状态，则将其全部移除；每移除1个，就使角色附属2层重甲蟹壳。
 */
export const ImperialPanoply = skill(23044)
  .type("passive")
  .on("battleBegin")
  .characterStatus(ArmoredCrabCarapace, "@master", {
    overrideVariables: {
      shield: 5
    }
  })
  .on("action", (c) => c.$(`(my statuses with tag (shield) or my combat statuses with tag (shield)) and not with definition id ${ArmoredCrabCarapace}`))
  .do((c) => {
    const shields = c.$$(`my statuses with tag (shield) or my combat statuses with tag (shield)`);
    let shieldValue = 0;
    for (const shield of shields) {
      if (shield.definition.id === ArmoredCrabCarapace) {
        shieldValue += shield.getVariable("shield");
      } else {
        shieldValue += 2;
      }
      shield.dispose();
    }
    if (shieldValue > 0) {
      c.characterStatus(ArmoredCrabCarapace, "@master", {
        overrideVariables: {
          shield: shieldValue
        }
      });
    }
  })
  .done();

/**
 * @id 23047
 * @name 帝王甲胄
 * @description
 * 
 */
export const ImperialPanoply01 = skill(23047)
  .type("passive")
  .reserve();

/**
 * @id 2304
 * @name 铁甲熔火帝皇
 * @description
 * 矗立在原海异种顶端的两位霸主之一，不遇天敌，不倦狩猎并成长之蟹。有着半是敬畏，半是戏谑的「帝皇」之称。
 */
export const EmperorOfFireAndIron = character(2304)
  .since("v4.6.0")
  .tags("pyro", "monster")
  .health(5)
  .energy(2)
  .skills(ShatterclampStrike, BusterBlaze, BattlelineDetonation, ImperialPanoply, SearingBlast)
  .done();

/**
 * @id 223041
 * @name 熔火铁甲
 * @description
 * 入场时：对装备有此牌的铁甲熔火帝皇附着火元素。
 * 我方除重甲蟹壳以外的护盾状态或护盾出战状态被移除后：装备有此牌的铁甲熔火帝皇附属2层重甲蟹壳。（每回合1次）
 * （牌组中包含铁甲熔火帝皇，才能加入牌组）
 */
export const MoltenMail = card(223041)
  .since("v4.6.0")
  .costPyro(1)
  .talent(EmperorOfFireAndIron, "none")
  .on("enter")
  .apply(DamageType.Pyro, "@master")
  .on("dispose", (c, e) => {
    return (e.entity.definition.type === "combatStatus" || e.entity.definition.type === "status") &&
      e.entity.definition.id !== ArmoredCrabCarapace &&
      e.entity.definition.tags.includes("shield");
  })
  .listenToPlayer()
  .usagePerRound(1)
  .characterStatus(ArmoredCrabCarapace, "@master", {
    overrideVariables: {
      shield: 2
    }
  })
  .done();
