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

import { character, skill, status, combatStatus, card, DamageType, CombatStatusHandle, Reaction } from "@gi-tcg/core/builder";

/**
 * @id 111141
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 持续回合：2
 */
export const NightsoulsBlessing = status(111141)
  .since("v5.7.0")
  .duration(2)
  .nightsoulsBlessing(2)
  .done();

/**
 * @id 111142
 * @name 白曜护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加）
 */
export const OpalShield = combatStatus(111142)
  .since("v5.7.0")
  .shield(1, Infinity)
  .done();

/**
 * @id 111143
 * @name 伊兹帕帕
 * @description
 * 我方角色受到伤害后：减少1点茜特菈莉的「夜魂值」，生成1层白曜护盾。
 * 当茜特菈莉获得「夜魂值」并使自身「夜魂值」等于2时，优先对敌方出战角色造成1点冰元素伤害。
 * 持续回合：2
 */
export const Itzpapa: CombatStatusHandle = combatStatus(111143)
  .since("v5.7.0")
  .duration(2)
  .on("damaged", (c) => {
    const st = c.$(`my character with definition id ${Citlali}`)?.hasNightsoulsBlessing();
    return st && st.variables.nightsoul > 0
  })
  .listenToPlayer()
  .do((c) => {
    c.consumeNightsoul(`my character with definition id ${Citlali}`)
  })
  .combatStatus(OpalShield)
  .on("gainNightsoul", (c, e) => {
    if (e.entity.definition.id !== NightsoulsBlessing) {
      return false;
    }
    return e.entity.getVariable("nightsoul") === 2;
  })
  .damage(DamageType.Cryo, 1, "opp characters with health > 0 limit 1")
  .done();

/**
 * @id 11141
 * @name 宿灵捕影
 * @description
 * 造成1点冰元素伤害。
 */
export const ShadowstealingSpiritVessel = skill(11141)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 11142
 * @name 霜昼黑星
 * @description
 * 造成1点冰元素伤害。
 * 自身进入夜魂加持，并获得1点「夜魂值」；生成1点白曜护盾和伊兹帕帕。（角色进入夜魂加持后不可使用此技能）
 */
export const DawnfrostDarkstar = skill(11142)
  .type("elemental")
  .costCryo(3)
  .filter((c) => !c.self.hasStatus(NightsoulsBlessing))
  .damage(DamageType.Cryo, 1)
  .gainNightsoul("@self", 1)
  .combatStatus(OpalShield)
  .combatStatus(Itzpapa)
  .done();

/**
 * @id 11143
 * @name 诸曜饬令
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成1点穿透伤害。如可能，获得2点「夜魂值」。
 */
export const EdictOfEntwinedSplendor = skill(11143)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Cryo, 2)
  .if((c) => c.self.hasStatus(NightsoulsBlessing))
  .gainNightsoul("@self", 2)
  .done();

/**
 * @id 11144
 * @name 奥秘传唱
 * @description
 * 我方进行挑选或造成元素反应伤害后：如可能，获得1点「夜魂值」。（每回合1次）
 */
export const SongsOfProfoundMystery = skill(11144)
  .type("passive")
  .variable("gainNightsoulUsagePerRound", 1)
  .on("selectCard", (c) => c.getVariable("gainNightsoulUsagePerRound") > 0 && c.self.hasStatus(NightsoulsBlessing))
  .gainNightsoul("@self")
  .addVariable("gainNightsoulUsagePerRound", -1)
  .on("dealDamage", (c, e) => e.getReaction() && c.getVariable("gainNightsoulUsagePerRound") > 0 && c.self.hasStatus(NightsoulsBlessing))
  .listenToPlayer()
  .gainNightsoul("@self")
  .addVariable("gainNightsoulUsagePerRound", -1)
  .on("roundEnd")
  .setVariable("gainNightsoulUsagePerRound", 1)
  .done();

/**
 * @id 1114
 * @name 茜特菈莉
 * @description
 * 谜烟流彩，曜石映心。
 */
export const Citlali = character(1114)
  .since("v5.7.0")
  .tags("cryo", "catalyst", "natlan")
  .health(10)
  .energy(2)
  .skills(ShadowstealingSpiritVessel, DawnfrostDarkstar, EdictOfEntwinedSplendor, SongsOfProfoundMystery)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 211142
 * @name 五重天的寒雨（生效中）
 * @description
 * 我方造成的水元素伤害和火元素伤害+1。
 * 可用次数：2
 */
export const MamaloacosFrigidRainInEffect = combatStatus(211142)
  .since("v5.7.0")
  .on("enter", (c, e) =>
    c.$(`my character with definition id ${Citlali}`)?.hasNightsoulsBlessing())
  .do((c, e) => {
    c.gainNightsoul(`my character with definition id ${Citlali}`);
  })
  .on("increaseDamage", (c, e) => e.type === DamageType.Hydro || e.type === DamageType.Pyro)
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 211141
 * @name 五重天的寒雨
 * @description
 * 敌方受到冻结或融化反应伤害后：我方下2次造成的水元素伤害和火元素伤害+1，并使茜特菈莉获得1点「夜魂值」。（每回合1次）
 * （牌组中包含茜特菈莉，才能加入牌组）
 */
export const MamaloacosFrigidRain = card(211141)
  .since("v5.7.0")
  .costCryo(2)
  .talent(Citlali, "none")
  .on("dealDamage", (c, e) =>
    (e.getReaction() === Reaction.Frozen || e.getReaction() === Reaction.Melt)) // 实为我方造成
  .listenToAll()
  .usagePerRound(1)
  .combatStatus(MamaloacosFrigidRainInEffect)
  .done();
