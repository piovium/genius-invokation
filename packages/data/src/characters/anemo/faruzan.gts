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

import { character, skill, summon, status, combatStatus, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115093
 * @name 赫耀多方面体
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：3
 * 此召唤物在场时：敌方角色受到的风元素伤害+1。
 */
define summon {
  id 115093 as DazzlingPolyhedron;
  conflictWith 115096;
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Anemo, 1);
  }
  on increaseDamaged {
    when :( !:e.target.isMine() && :e.type === DamageType.Anemo );
    listenTo all;
    :e.increaseDamage(1);
  }
}

/**
 * @id 115095
 * @name 妙道合真（生效中）
 * @description
 * 行动阶段开始时：移除此效果，生成1个风元素。
 */
define combatStatus {
  id 115095 as TheWondrousPathOfTruthActive;
  reserved;
}

/**
 * @id 115096
 * @name 赫耀多方面体
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：3
 * 此召唤物在场时：敌方角色受到的风元素伤害+1。
 * 入场时和行动阶段开始时：生成1个风元素。
 */
define summon {
  id 115096 as DazzlingPolyhedron01;
  conflictWith 115093;
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Anemo, 1);
  }
  on increaseDamaged {
    when :( !:e.target.isMine() && :e.type === DamageType.Anemo );
    listenTo all;
    :e.increaseDamage(1);
  }
  on actionPhase {
    :generateDice(DiceType.Anemo, 1);
  }
}

/**
 * @id 115091
 * @name 疾风示现
 * @description
 * 所附属角色进行重击时：少花费1个无色元素，造成的物理伤害变为风元素伤害，并且使目标角色附属风压坍陷。
 * 可用次数：1
 */
define status {
  id 115091 as ManifestGale;
  on deductVoidDiceSkill {
    when :( :e.isChargedAttack() );
    :e.deductVoidCost(1);
  }
  on modifySkillDamageType {
    when :( :e.viaChargedAttack() );
    usage 1;
    if (:e.type === DamageType.Physical){
      :e.changeDamageType(DamageType.Anemo);
    }
    :characterStatus(PressurizedCollapse, :e.target);
  }
}

/**
 * @id 115092
 * @name 风压坍陷
 * @description
 * 结束阶段：将所附属角色切换为「出战角色」。
 * 可用次数：1
 * （同一方场上最多存在一个此状态）
 */
define status {
  id 115092 as PressurizedCollapse;
  conflictWith crossCharacter;
  on endPhase {
    usage 1;
    :switchActive("@master");
  }
}

/**
 * @id 15091
 * @name 迴身箭术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15091 as ParthianShot;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15092
 * @name 非想风天
 * @description
 * 造成3点风元素伤害，本角色附属疾风示现。
 */
define skill {
  id 15092 as WindRealmOfNasamjnin;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 3);
  :characterStatus(ManifestGale, "@self");
}

/**
 * @id 15093
 * @name 抟风秘道
 * @description
 * 造成1点风元素伤害，召唤赫耀多方面体。
 */
define skill {
  id 15093 as TheWindsSecretWays;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 1);
  if (:self.hasEquipment(TheWondrousPathOfTruth)) {
    :summon(DazzlingPolyhedron01);
    :generateDice(DiceType.Anemo, 1);
  } else {
    :summon(DazzlingPolyhedron);
  }
}

/**
 * @id 1509
 * @name 珐露珊
 * @description
 * 机巧易解，世殊难算。
 */
define character {
  id 1509 as Faruzan;
  since "v4.6.0";
  tags anemo, bow, sumeru;
  health 10;
  energy 2;
  skills ParthianShot, WindRealmOfNasamjnin, TheWindsSecretWays;
}

/**
 * @id 215091
 * @name 妙道合真
 * @description
 * 战斗行动：我方出战角色为珐露珊时，装备此牌。
 * 珐露珊装备此牌后，立刻使用一次抟风秘道。
 * 装备有此牌的珐露珊所生成的赫耀多方面体，会在其入场时和行动阶段开始时生成1个风元素。
 * （牌组中包含珐露珊，才能加入牌组）
 */
define card {
  id 215091 as TheWondrousPathOfTruth;
  since "v4.6.0";
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  talent Faruzan {
    on enter {
      :useSkill(TheWindsSecretWays);
    }
  }
}
