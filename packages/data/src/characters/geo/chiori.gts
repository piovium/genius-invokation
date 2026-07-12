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

import { card, character, DamageType, DiceType, skill, status, summon, type CardHandle, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 116091
 * @name 不悦挥刀之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时：我方千织造成的物理伤害变为岩元素伤害，且普通攻击造成的岩元素伤害+1。
 */
define summon {
  id 116091 as GrouchyKnifewieldingTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
  on enter {
    :characterStatus(GeoInfusion, `my character with definition id ${Chiori}`);
  }
  on selfDispose {
    :$(`my status with definition id ${GeoInfusion}`)?.dispose();
  }
}

/**
 * @id 116092
 * @name 无事发生之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时，我方使用技能后：切换至下一个我方角色。（每回合1次）
 */
define summon {
  id 116092 as NothingToSeeHereTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
  on useSkill {
    usage perRound, 1;
    :switchActive("my next");
  }
}

/**
 * @id 116093
 * @name 轻松迎敌之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时，千织以外的我方角色使用技能后：造成1点岩元素伤害。（每回合1次）
 */
define summon {
  id 116093 as EffortlesslyOutclassingOpponentsTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
  on useSkill {
    when :( :e.skill.caller.definition.id !== Chiori );
    usage perRound, 1;
    :damage(DamageType.Geo, 1);
  }
}

/**
 * @id 116094
 * @name 平静养神之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 */
define summon {
  id 116094 as TranquillyTakingTenTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
}

/**
 * @id 116095
 * @name 闭目战斗之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 此牌在场时：我方千织及千织的自动制御人形造成的岩元素伤害+1。（每回合2次）
 */
define summon {
  id 116095 as FightingWithHerEyesShutTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
  on increaseDamage {
    when :( ([...DOLLS, Chiori] as number[]).includes(:e.source.definition.id) && 
        :e.type === DamageType.Geo );
    usage perRound, 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 116096
 * @name 侧目睥睨之袖
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 * 千织进行普通攻击时：少花费1个元素骰。（每回合1次）
 */
define summon {
  id 116096 as BombasticSideeyeTamoto;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
  on deductOmniDiceSkill {
    when :( :e.action.skill.definition.id === WeavingBlade );
    usage perRound, 1;
    :e.deductOmniCost(1);
  }
}

/**
 * @id 116097
 * @name 千织的自动制御人形
 * @description
 * 千织拥有多种自动制御人形，不但能自动发起攻击，还会提供多种增益效果。
 */
define summon {
  id 116097 as ChiorisAutomatonDolls;
  since "v5.1.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
}

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
define status {
  id 116098 as GeoInfusion;
  since "v5.1.0";
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Geo);
  }
}

/**
 * @id 16091
 * @name 心织刀流
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16091 as WeavingBlade;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16092
 * @name 羽袖一触
 * @description
 * 从3个千织的自动制御人形中挑选1个召唤。
 */
define skill {
  id 16092 as FlutteringHasode;
  skillType elemental;
  cost DiceType.Geo, 3;
  let count = 3;
  if (:self.hasEquipment(InFiveColorsDyed)) {
    :summon(TranquillyTakingTenTamoto);
    count = 4;
  }
  const candidates = :randomSubset(USEFUL_DOLLS, count);
  :selectAndSummon(candidates);
}

/**
 * @id 16093
 * @name 二刀之形·比翼
 * @description
 * 造成5点岩元素伤害。
 */
define skill {
  id 16093 as HiyokuTwinBlades;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 5);
}

/**
 * @id 1609
 * @name 千织
 * @description
 * 千红曙染，裁锦缀织。
 */
define character {
  id 1609 as Chiori;
  since "v5.1.0";
  tags geo, sword, inazuma;
  health 10;
  energy 2;
  skills WeavingBlade, FlutteringHasode, HiyokuTwinBlades;
}

/**
 * @id 216091
 * @name 落染五色
 * @description
 * 战斗行动：我方出战角色为千织时，装备此牌。
 * 千织装备此牌后，立刻使用一次羽袖一触。
 * 装备有此牌的千织使用羽袖一触时：额外召唤1个平静养神之袖，并改为从4个千织的自动制御人形中挑选1个并召唤。
 * （牌组中包含千织，才能加入牌组）
 */
define card {
  id 216091 as InFiveColorsDyed;
  since "v5.1.0";
  cost DiceType.Geo, 4;
  talent Chiori {
    on enter {
      :useSkill(FlutteringHasode);
    }
  }
}
