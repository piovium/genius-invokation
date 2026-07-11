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

import { character, skill, summon, combatStatus, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 111093
 * @name 饰梦天球
 * @description
 * 结束阶段：造成1点冰元素伤害。如果飞星在场，则使其累积1枚「晚星」。
 * 可用次数：2
 */
export const CelestialDreamsphere = summon(111093)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .do((c) => {
    const star = c.$(`my combat status with definition id ${ShootingStar}`);
    if (star) {
      star.addVariable("star", 1);
    }
  })
  .done();

/**
 * @id 111091
 * @name 安眠帷幕护盾
 * @description
 * 提供2点护盾，保护我方出战角色。
 */
export const CurtainOfSlumberShield = combatStatus(111091)
  .shield(2)
  .done();

/**
 * @id 111092
 * @name 飞星
 * @description
 * 我方角色使用技能后：累积1枚「晚星」。如果「晚星」已有至少4枚，则消耗4枚「晚星」，造成1点冰元素伤害。（生成此出战状态的技能，也会触发此效果）
 * 重复生成此出战状态时：累积2枚「晚星」。
 */
export const ShootingStar = combatStatus(111092)
  .variableCanAppend("star", 0, Infinity, 2)
  .on("useSkill")
  .do((c) => {
    c.addVariable("star", 1);
    if (c.getVariable("star") >= 4) {
      c.addVariable("star", -4);
      c.damage(DamageType.Cryo, 1);
      if (c.$(`my equipment with definition id ${LightsRemit}`)) {
        c.drawCards(1);
      }
    }
  })
  .done();

/**
 * @id 11091
 * @name 熠辉轨度剑
 * @description
 * 造成2点物理伤害。
 */
export const SwordOfTheRadiantPath = skill(11091)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11092
 * @name 垂裳端凝之夜
 * @description
 * 生成安眠帷幕护盾和飞星。
 */
export const NightsOfFormalFocus = skill(11092)
  .type("elemental")
  .costCryo(3)
  .combatStatus(CurtainOfSlumberShield)
  .combatStatus(ShootingStar)
  .done();

/**
 * @id 11093
 * @name 星流摇床之梦
 * @description
 * 造成3点冰元素伤害，召唤饰梦天球。
 */
export const DreamOfTheStarstreamShaker = skill(11093)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 3)
  .summon(CelestialDreamsphere)
  .done();

/**
 * @id 1109
 * @name 莱依拉
 * @description
 * 夜沉星移，月笼梦行。
 */
export const Layla = character(1109)
  .since("v4.3.0")
  .tags("cryo", "sword", "sumeru")
  .health(10)
  .energy(2)
  .skills(SwordOfTheRadiantPath, NightsOfFormalFocus, DreamOfTheStarstreamShaker)
  .done();

/**
 * @id 211091
 * @name 归芒携信
 * @description
 * 战斗行动：我方出战角色为莱依拉时，装备此牌。
 * 莱依拉装备此牌后，立刻使用一次垂裳端凝之夜。
 * 装备有此牌的莱依拉在场时，每当飞星造成伤害，就抓1张牌。
 * （牌组中包含莱依拉，才能加入牌组）
 */
export const LightsRemit = card(211091)
  .since("v4.3.0")
  .costCryo(3)
  .talent(Layla)
  .on("enter")
  .useSkill(NightsOfFormalFocus)
  .done();
