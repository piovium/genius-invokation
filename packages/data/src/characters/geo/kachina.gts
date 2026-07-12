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

import { character, skill, summon, status, combatStatus, card, DamageType, customEvent, DiceType, $ } from "@gi-tcg/core/builder";

export const TurboTwirlyTriggered = customEvent("kachina/turboTwirlyTriggered");

/**
 * @id 116103
 * @name 冲天转转·脱离
 * @description
 * 结束阶段：造成1点岩元素伤害，对下一个敌方后台角色造成1点穿透伤害。
 * 可用次数：1
 */
define summon {
  id 116103 as TurboTwirlyLetItRip;
  since "v5.5.0";
  hint DamageType.Geo, "1";
  on endPhase {
    usage 1;
    const field = :$(`my combat status with definition id ${TurboDrillField}`);
    if (field) {
      :damage(DamageType.Geo, 2);
      :damage(DamageType.Piercing, 2, "opp next");
      :consumeUsage(1, field);
    } else {
      :damage(DamageType.Geo, 1);
      :damage(DamageType.Piercing, 1, "opp next");
    }
    :emitCustomEvent(TurboTwirlyTriggered);
  }
}

/**
 * @id 116104
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
define status {
  id 116104 as NightsoulsBlessing;
  since "v5.5.0";
  nightsoulsBlessing 2;
}

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
define card {
  id 116102 as TurboTwirly;
  since "v5.5.0";
  technique {
    nightsoul;
    on  switchActive {
      when :( :e.switchInfo.from?.id === :self.master.id );
      :consumeNightsoul("@master");
      :summon(TurboTwirlyLetItRip);
    }
    skill {
      id 1161021;
      cost DiceType.Geo, 1;
      :consumeNightsoul("@master")
      const field = :query($.my.combatStatus.def(TurboDrillField));
      if (field) {
        :damage(DamageType.Geo, 3);
        :damage(DamageType.Piercing, 2, "opp next");
        :consumeUsage(1, field);
      } else {
        :damage(DamageType.Geo, 2);
        :damage(DamageType.Piercing, 1, "opp next");
      }
      :emitCustomEvent(TurboTwirlyTriggered);
    }
  }
}

/**
 * @id 116101
 * @name 超级钻钻领域
 * @description
 * 我方冲天转转造成的岩元素伤害+1，造成的穿透伤害+1。
 * 可用次数：3
 */
define combatStatus {
  id 116101 as TurboDrillField;
  since "v5.5.0";
  usage 3;
}

/**
 * @id 16101
 * @name 嵴之啮咬
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16101 as Cragbiter;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16102
 * @name 出击，冲天转转！
 * @description
 * 自身附属冲天转转，然后进入夜魂加持，并获得2点「夜魂值」。（角色进入夜魂加持后不可使用此技能）
 * （附属冲天转转的角色可以使用特技：转转冲击）
 */
define skill {
  id 16102 as GoGoTurboTwirly;
  skillType elemental;
  cost DiceType.Geo, 2;
  filter :( !:self.hasStatus(NightsoulsBlessing) );
  :equip(TurboTwirly, "@self");
  :gainNightsoul("@self", 2);
}

/**
 * @id 16103
 * @name 现在，认真时间！
 * @description
 * 造成3点岩元素伤害，生成超级钻钻领域。
 */
define skill {
  id 16103 as TimeToGetSerious;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Geo, 3);
  :combatStatus(TurboDrillField);
}

/**
 * @id 1610
 * @name 卡齐娜
 * @description
 * 眼泪与勇气熔铸出的宝石。
 */
define character {
  id 1610 as Kachina;
  since "v5.5.0";
  tags geo, pole, natlan;
  health 10;
  energy 3;
  skills Cragbiter, GoGoTurboTwirly, TimeToGetSerious;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 216101
 * @name 夜域赐礼·团结炉心
 * @description
 * 我方冲天转转或冲天转转·脱离触发效果后，抓1张牌。（每回合1次）
 * （牌组中包含卡齐娜，才能加入牌组）
 */
define card {
  id 216101 as NightRealmsGiftHeartOfUnity;
  since "v5.5.0";
  cost DiceType.Geo, 1;
  talent Kachina, none {
    on TurboTwirlyTriggered {
      listenTo samePlayer;
      usage perRound, 1;
      :drawCards(1);
    }
  }
}
