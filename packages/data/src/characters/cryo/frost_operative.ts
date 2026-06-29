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
import { BondOfLife } from "../../commons.gts";

/**
 * @id 121042
 * @name 掠袭锐势
 * @description
 * 结束阶段：对所有附属有生命之契的敌方角色造成1点穿透伤害。
 * 持续回合：2
 */
export const OnslaughtStance = status(121042)
  .since("v4.8.0")
  .duration(2)
  .on("endPhase")
  .damage(DamageType.Piercing, 1, `opp characters has status with definition id ${BondOfLife}`)
  .done();

/**
 * @id 21041
 * @name 迅捷剑锋
 * @description
 * 造成2点物理伤害。
 */
export const SwiftPoint = skill(21041)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 21042
 * @name 霜刃截击
 * @description
 * 造成3点冰元素伤害。
 */
export const FrostyInterjection = skill(21042)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 3)
  .done();

/**
 * @id 21043
 * @name 掠袭之刺
 * @description
 * 造成5点冰元素伤害，本角色附属掠袭锐势。
 */
export const ThornyOnslaught = skill(21043)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 5)
  .characterStatus(OnslaughtStance, "@self")
  .done();

/**
 * @id 21044
 * @name 血契掠影
 * @description
 * 【被动】本角色使用技能后：对敌方出战角色附属可用次数为（本技能最终伤害值-2）的生命之契。（最多5层）
 */
export const BloodbondedShadow = skill(21044)
  .type("passive")
  .variable("damageValue", 0)
  .on("skillDamage")
  .do((c, e) => c.addVariable("damageValue", e.damageInfo.value))
  .on("useSkill")
  .do((c) => {
    const usage = Math.min(c.getVariable("damageValue") - 2, 5);
    c.setVariable("damageValue", 0);
    if (usage > 0) {
      c.characterStatus(BondOfLife, "opp active", {
        overrideVariables: { usage }
      });
      if (c.self.hasEquipment(RimeflowRapier)) {
        const bondSt = c.$(`status with definition id ${BondOfLife} at opp active`);
        if (bondSt) {
          const oldUsage = bondSt.getVariable("usage");
          bondSt.setVariable("usage", oldUsage * 2);
        }
      }
    }
  })
  .done();

/**
 * @id 2104
 * @name 愚人众·霜役人
 * @description
 * 自幼就被选中的人，经长久年月的教化与训练，在无数次的汰换后才能成为所谓的「役人」。
 */
export const FrostOperative = character(2104)
  .since("v4.8.0")
  .tags("cryo", "fatui")
  .health(11)
  .energy(2)
  .skills(SwiftPoint, FrostyInterjection, ThornyOnslaught, BloodbondedShadow)
  .done();

/**
 * @id 221041
 * @name 冰雅刺剑
 * @description
 * 战斗行动：我方出战角色为愚人众·霜役人时，装备此牌。
 * 愚人众·霜役人装备此牌后，立刻使用一次霜刃截击。
 * 装备有此牌的愚人众·霜役人触发血契掠影后：使敌方出战角色的生命之契层数翻倍。
 * （牌组中包含愚人众·霜役人，才能加入牌组）
 */
export const RimeflowRapier = card(221041)
  .since("v4.8.0")
  .costCryo(3)
  .talent(FrostOperative)
  .on("enter")
  .useSkill(FrostyInterjection)
  .done();
