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

import { card, character, combatStatus, DamageType, DiceType, skill, summon, type CombatStatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 117051
 * @name 游丝徵灵
 * @description
 * 结束阶段：造成1点草元素伤害，治疗我方出战角色1点。
 * 可用次数：1
 */
define summon {
  id 117051 as GossamerSprite;
  hint DamageType.Dendro, 1;
  on endPhase {
    usage 1;
    :damage(DamageType.Dendro, 1);
    :heal(1, "my active");
  }
}

/**
 * @id 117053
 * @name 无郤气护盾
 * @description
 * 提供1点护盾，保护我方出战角色。
 * 此效果被移除，或被重复生成时：造成1点草元素伤害，治疗我方出战角色1点。
 */
define combatStatus {
  id 117053 as SeamlessShield;
  shield 1;
  defineSnippet :{
    :damage(DamageType.Dendro, 1)
    const active = :$("my active");
    if (!active) {
      // 出战角色被击倒，治疗和生成骰子不生效
      return;
    }
    :heal(1, active);
    if (:$(`my equipment with definition id ${AllThingsAreOfTheEarth}`)) {
      :generateDice(active.element(), 1);
    }
  };
  on enter {
    when :( :e.overridden );
    :callSnippet();
  }
  on selfDispose {
    :callSnippet();
  }
}

/**
 * @id 117052
 * @name 脉摄宣明
 * @description
 * 行动阶段开始时：生成无郤气护盾。
 * 可用次数：2
 */
define combatStatus {
  id 117052 as PulsingClarity;
  on actionPhase {
    usage 2;
    :combatStatus(SeamlessShield);
  }
}

/**
 * @id 17051
 * @name 金匮针解
 * @description
 * 造成1点草元素伤害。
 */
define skill {
  id 17051 as TheClassicsOfAcupuncture;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Dendro, 1);
}

/**
 * @id 17052
 * @name 太素诊要
 * @description
 * 造成1点草元素伤害，召唤游丝徵灵。
 */
define skill {
  id 17052 as UniversalDiagnosis;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 1);
  :summon(GossamerSprite);
}

/**
 * @id 17053
 * @name 愈气全形论
 * @description
 * 生成脉摄宣明和无郤气护盾。
 */
define skill {
  id 17053 as HolisticRevivification;
  skillType burst;
  cost DiceType.Dendro, 4;
  cost DiceType.Energy, 2;
  :combatStatus(PulsingClarity);
  :combatStatus(SeamlessShield);
}

/**
 * @id 1705
 * @name 白术
 * @description
 * 生老三千疾，何处可问医。
 */
define character {
  id 1705 as Baizhu;
  since "v4.2.0";
  tags dendro, catalyst, liyue;
  health 11;
  energy 2;
  skills TheClassicsOfAcupuncture, UniversalDiagnosis, HolisticRevivification;
}

/**
 * @id 217051
 * @name 在地为化
 * @description
 * 战斗行动：我方出战角色为白术时，装备此牌。
 * 白术装备此牌后，立刻使用一次愈气全形论。
 * 装备有此牌的白术在场，无郤气护盾触发治疗效果时：生成1个出战角色类型的元素骰。
 * （牌组中包含白术，才能加入牌组）
 */
define card {
  id 217051 as AllThingsAreOfTheEarth;
  since "v4.2.0";
  cost DiceType.Dendro, 4;
  cost DiceType.Energy, 2;
  talent Baizhu {
    on enter {
      :useSkill(HolisticRevivification);
    }
  }
}
