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

import { $, Aura, card, character, DamageType, DiceType, Reaction, skill, status, type StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 115151
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
define status {
  id 115151 as NightsoulsBlessing;
  since "v6.1.0";
  nightsoulsBlessing 2;
}


/**
 * @id 115153
 * @name 镇静标记·冰
 * @description
 * 所在阵营选择行动前：对所附属角色造成2点冰元素伤害。
 * 可用次数：1
 */
define status {
  id 115153 as SedationMarkCryo;
  since "v6.1.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Cryo, 2, "@master");
  }
}

/**
 * @id 115154
 * @name 镇静标记·水
 * @description
 * 所在阵营选择行动前：对所附属角色造成2点水元素伤害。
 * 可用次数：1
 */
define status {
  id 115154 as SedationMarkHydro;
  since "v6.1.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Hydro, 2, "@master");
  }
}

/**
 * @id 115155
 * @name 镇静标记·火
 * @description
 * 所在阵营选择行动前：对所附属角色造成2点火元素伤害。
 * 可用次数：1
 */
define status {
  id 115155 as SedationMarkPyro;
  since "v6.1.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Pyro, 2, "@master");
  }
}

/**
 * @id 115156
 * @name 镇静标记·雷
 * @description
 * 所在阵营选择行动前：对所附属角色造成2点雷元素伤害。
 * 可用次数：1
 */
define status {
  id 115156 as SedationMarkElectro;
  since "v6.1.0";
  on beforeAction {
    usage 1;
    :damage(DamageType.Electro, 2, "@master");
  }
}

/**
 * @id 115152
 * @name 咔库库
 * @description
 * 特技：援护射击
 * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持
 * [1151521: 援护射击] (2*Void) 消耗1点「夜魂值」，对上一个敌方角色造成1点风元素伤害，并治疗我方受伤最多的角色2点。
 * [1151522: ] ()
 * [1151523: ] ()
 */
define card {
  id 115152 as Cacucu;
  since "v6.1.0";
  technique {
    nightsoul;
    skill {
      id 1151521;
      cost DiceType.Void, 2;
      :consumeNightsoul("@master", 1);
      :damage(DamageType.Anemo, 1, $.opp.prev.orElse($.opp.active));
      :heal(2, $.macros.myMostInjured);
    }
  }
}

/**
 * @id 15151
 * @name 祛风妙仪
 * @description
 * 造成1点风元素伤害。
 */
define skill {
  id 15151 as RiteOfDispellingWinds;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15152
 * @name 空天疾护
 * @description
 * 造成1点风元素伤害，自身进入夜魂加持，获得2点「夜魂值」，并附属咔库库。（角色进入夜魂加持后不可使用此技能）
 * （附属咔库库的角色可以使用特技：援护射击）
 */
define skill {
  id 15152 as AirborneDiseasePrevention;
  skillType elemental;
  cost DiceType.Anemo, 2;
  filter :( !:self.hasStatus(NightsoulsBlessing) );
  :damage(DamageType.Anemo, 1);
  :gainNightsoul("@self", 2);
  :equip(Cacucu, "@self");
}

/**
 * @id 15153
 * @name 复合镇静域
 * @description
 * 造成2点风元素伤害，治疗我方受伤最多的角色2点。如果此技能引发了风元素相关反应，则敌方出战角色附属对应元素的镇静标记。
 */
define skill {
  id 15153 as CompoundSedationField;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  const aura = :$(`opp active`)?.aura;
  :damage(DamageType.Anemo, 2);
  :heal(2, `my characters order by health - maxHealth limit 1`);
  let mark: StatusHandle | null = null;
  switch (aura) {
    case Aura.Cryo:
      mark = SedationMarkCryo;
      break;
    case Aura.Hydro:
      mark = SedationMarkHydro;
      break;
    case Aura.Pyro:
      mark = SedationMarkPyro;
      break;
    case Aura.Electro:
      mark = SedationMarkElectro;
      break;
  }
  if (mark) {
    :characterStatus(mark, "opp active");
  }
}

/**
 * @id 1515
 * @name 伊法
 * @description
 * 急救如急袭。
 */
define character {
  id 1515 as Ifa;
  since "v6.1.0";
  tags anemo, catalyst, natlan;
  health 10;
  energy 2;
  skills RiteOfDispellingWinds, AirborneDiseasePrevention, CompoundSedationField;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 215151
 * @name 温敷战术包扎
 * @description
 * 快速行动：装备给我方的伊法，治疗我方受伤最多的角色1点。
 * 装备有此牌的伊法在场时，我方触发风元素相关反应、感电或月感电反应后，治疗我方受伤最多的角色1点。（每回合2次）
 * （牌组中包含伊法，才能加入牌组）
 */
define card {
  id 215151 as TacticalWarmCompressBandaging;
  since "v6.1.0";
  cost DiceType.Anemo, 1;
  talent Ifa, none {
    on enter {
      :heal(1, "my characters order by health - maxHealth limit 1");
    }
    on dealReaction {
      when :( :e.relatedTo(DamageType.Anemo) || 
          ([Reaction.ElectroCharged, Reaction.LunarElectroCharged] as Reaction[]).includes(:e.type) );
      listenTo samePlayer;
      usage perRound, 2;
      :heal(1, "my characters order by health - maxHealth limit 1");
    }
  }
}
