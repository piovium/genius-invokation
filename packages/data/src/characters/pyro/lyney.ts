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

import { character, skill, summon, status, card, DamageType, Aura } from "@gi-tcg/core/builder";

/**
 * @id 113101
 * @name 怪笑猫猫帽
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
export const GrinmalkinHat = summon(113101)
  .endPhaseDamage(DamageType.Pyro, 1)
  .usageCanAppend(1, 2)
  .done();

/**
 * @id 113102
 * @name 隐具余数
 * @description
 * 隐具余数最多可以叠加到3层。
 * 角色使用眩惑光戏法时：每层隐具余数使伤害+1。技能结算后，耗尽隐具余数，每层治疗角色1点。
 */
export const PropSurplus = status(113102)
  .variable("surplus", 1)
  .on("increaseSkillDamage", (c, e) => e.via.definition.id === BewilderingLights)
  .do((c, e) => {
    e.increaseDamage(c.getVariable("surplus"));
  })
  .on("useSkill", (c, e) => e.skill.definition.id === BewilderingLights)
  .do((c) => {
    const surplus = c.getVariable("surplus");
    c.heal(surplus, "@master");
    c.dispose();
  })
  .done();

/**
 * @id 13101
 * @name 迫牌易位式
 * @description
 * 造成2点物理伤害。
 */
export const CardForceTranslocation = skill(13101)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13102
 * @name 隐具魔术箭
 * @description
 * 造成2点火元素伤害，召唤怪笑猫猫帽，累积1层隐具余数。
 * 如果本角色生命值至少为6，则对自身造成1点穿透伤害。
 */
export const PropArrow = skill(13102)
  .type("normal")
  .costPyro(3)
  .do((c) => {
    c.damage(DamageType.Pyro, 2);
    c.summon(GrinmalkinHat);
    const surplusSt = c.self.hasStatus(PropSurplus);
    if (surplusSt) {
      c.addVariableWithMax("surplus", 1, 3, surplusSt);
    } else {
      c.self.addStatus(PropSurplus);  
    }
    if (c.self.health >= 6) {
      c.damage(DamageType.Piercing, 1, "@self");
    }
  })
  .done();

/**
 * @id 13103
 * @name 眩惑光戏法
 * @description
 * 造成3点火元素伤害。
 */
export const BewilderingLights = skill(13103)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .done();

/**
 * @id 13104
 * @name 大魔术·灵迹巡游
 * @description
 * 造成3点火元素伤害，召唤怪笑猫猫帽，累积1层隐具余数。
 */
export const WondrousTrickMiracleParade = skill(13104)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .do((c) => {
    c.damage(DamageType.Pyro, 3);
    c.summon(GrinmalkinHat);
    const surplusSt = c.self.hasStatus(PropSurplus);
    if (surplusSt) {
      c.addVariableWithMax("surplus", 1, 3, surplusSt);
    } else {
      c.self.addStatus(PropSurplus);
    }
  })
  .done();

/**
 * @id 1310
 * @name 林尼
 * @description
 * 镜中捧花，赠予何人。
 */
export const Lyney = character(1310)
  .since("v4.3.0")
  .tags("pyro", "bow", "fontaine", "fatui", "ousia")
  .health(10)
  .energy(2)
  .skills(CardForceTranslocation, PropArrow, BewilderingLights, WondrousTrickMiracleParade)
  .done();

/**
 * @id 213101
 * @name 完场喝彩
 * @description
 * 战斗行动：我方出战角色为林尼时，装备此牌。
 * 林尼装备此牌后，立刻使用一次隐具魔术箭。
 * 装备有此牌的林尼在场时，林尼自身和怪笑猫猫帽对具有火元素附着的角色造成的伤害+2。（每回合1次）
 * （牌组中包含林尼，才能加入牌组）
 */
export const ConclusiveOvation = card(213101)
  .since("v4.3.0")
  .costPyro(3)
  .talent(Lyney)
  .on("enter")
  .useSkill(PropArrow)
  .on("increaseSkillDamage", (c, e) =>
    [Lyney as number, GrinmalkinHat as number].includes(e.source.definition.id) && 
    e.target.aura === Aura.Pyro)
  .usagePerRound(1)
  .increaseDamage(2)
  .done();
