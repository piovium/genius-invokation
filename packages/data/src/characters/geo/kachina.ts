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

import { character, skill, summon, status, combatStatus, card, DamageType, customEvent } from "@gi-tcg/core/builder";

export const TurboTwirlyTriggered = customEvent("kachina/turboTwirlyTriggered");

/**
 * @id 116103
 * @name 冲天转转·脱离
 * @description
 * 结束阶段：造成1点岩元素伤害，对下一个敌方后台角色造成1点穿透伤害。
 * 可用次数：1
 */
export const TurboTwirlyLetItRip = summon(116103)
  .since("v5.5.0")
  .hint(DamageType.Geo, "1")
  .on("endPhase")
  .usage(1)
  .do((c) => {
    const field = c.$(`my combat status with definition id ${TurboDrillField}`);
    if (field) {
      c.damage(DamageType.Geo, 2);
      c.damage(DamageType.Piercing, 2, "opp next");
      c.consumeUsage(1, field);
    } else {
      c.damage(DamageType.Geo, 1);
      c.damage(DamageType.Piercing, 1, "opp next");
    }
    c.emitCustomEvent(TurboTwirlyTriggered);
  })
  .done();

/**
 * @id 116104
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
export const NightsoulsBlessing = status(116104)
  .since("v5.5.0")
  .nightsoulsBlessing(2)
  .done();

/**
 * @id 116102
 * @name 冲天转转
 * @description
 * 附属角色切换至后台时：消耗1点夜魂值，召唤冲天转转·脱离。
 * 特技：转转冲击
 * （角色最多装备1个「特技」）
 * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持。
 * [1161021: 转转冲击] (1*Geo) 附属角色消耗1点「夜魂值」，造成2点岩元素伤害，对敌方下一个后台角色造成1点穿透伤害。
 * [1161022: ] ()
 * [1161023: ] ()
 * [1161024: ] ()
 */
export const TurboTwirly = card(116102)
  .since("v5.5.0")
  .nightsoulTechnique()
  .on("switchActive", (c, e) => e.switchInfo.from?.id === c.self.master.id)
  .consumeNightsoul("@master")
  .summon(TurboTwirlyLetItRip)
  .endOn()
  .provideSkill(1161021)
  .costGeo(1)
  .consumeNightsoul("@master")
  .do((c) => {
    const field = c.$(`my combat status with definition id ${TurboDrillField}`);
    if (field) {
      c.damage(DamageType.Geo, 3);
      c.damage(DamageType.Piercing, 2, "opp next");
      c.consumeUsage(1, field);
    } else {
      c.damage(DamageType.Geo, 2);
      c.damage(DamageType.Piercing, 1, "opp next");
    }
    c.emitCustomEvent(TurboTwirlyTriggered);
  })
  .done();

/**
 * @id 116101
 * @name 超级钻钻领域
 * @description
 * 我方冲天转转造成的岩元素伤害+1，造成的穿透伤害+1。
 * 可用次数：3
 */
export const TurboDrillField = combatStatus(116101)
  .since("v5.5.0")
  .usage(3)
  .done();

/**
 * @id 16101
 * @name 嵴之啮咬
 * @description
 * 造成2点物理伤害。
 */
export const Cragbiter = skill(16101)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 16102
 * @name 出击，冲天转转！
 * @description
 * 自身附属冲天转转，然后进入夜魂加持，并获得2点「夜魂值」。（角色进入夜魂加持后不可使用此技能）
 * （附属冲天转转的角色可以使用特技：转转冲击）
 */
export const GoGoTurboTwirly = skill(16102)
  .type("elemental")
  .costGeo(2)
  .filter((c) => !c.self.hasStatus(NightsoulsBlessing))
  .equip(TurboTwirly, "@self")
  .gainNightsoul("@self", 2)
  .done();

/**
 * @id 16103
 * @name 现在，认真时间！
 * @description
 * 造成3点岩元素伤害，生成超级钻钻领域。
 */
export const TimeToGetSerious = skill(16103)
  .type("burst")
  .costGeo(3)
  .costEnergy(3)
  .damage(DamageType.Geo, 3)
  .combatStatus(TurboDrillField)
  .done();

/**
 * @id 1610
 * @name 卡齐娜
 * @description
 * 眼泪与勇气熔铸出的宝石。
 */
export const Kachina = character(1610)
  .since("v5.5.0")
  .tags("geo", "pole", "natlan")
  .health(10)
  .energy(3)
  .skills(Cragbiter, GoGoTurboTwirly, TimeToGetSerious)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 216101
 * @name 夜域赐礼·团结炉心
 * @description
 * 我方冲天转转或冲天转转·脱离触发效果后，抓1张牌。（每回合1次）
 * （牌组中包含卡齐娜，才能加入牌组）
 */
export const NightRealmsGiftHeartOfUnity = card(216101)
  .since("v5.5.0")
  .costGeo(1)
  .talent(Kachina, "none")
  .on(TurboTwirlyTriggered)
  .listenToPlayer()
  .usagePerRound(1)
  .drawCards(1)
  .done();
