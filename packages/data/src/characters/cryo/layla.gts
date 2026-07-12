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

import { card, character, combatStatus, DamageType, DiceType, skill, summon } from "@gi-tcg/core/builder";

/**
 * @id 111093
 * @name 饰梦天球
 * @description
 * 结束阶段：造成1点冰元素伤害。如果飞星在场，则使其累积1枚「晚星」。
 * 可用次数：2
 */
define summon {
  id 111093 as CelestialDreamsphere;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
    const star = :$(`my combat status with definition id ${ShootingStar}`);
    if (star) {
      star.addVariable("star", 1);
    }
  }
}

/**
 * @id 111091
 * @name 安眠帷幕护盾
 * @description
 * 提供2点护盾，保护我方出战角色。
 */
define combatStatus {
  id 111091 as CurtainOfSlumberShield;
  shield 2;
}

/**
 * @id 111092
 * @name 飞星
 * @description
 * 我方角色使用技能后：累积1枚「晚星」。如果「晚星」已有至少4枚，则消耗4枚「晚星」，造成1点冰元素伤害。（生成此出战状态的技能，也会触发此效果）
 * 重复生成此出战状态时：累积2枚「晚星」。
 */
define combatStatus {
  id 111092 as ShootingStar;
  variable star, 0 {
    append {
    limit Infinity;
    value 2;
  };
  };
  on useSkill {
    :addVariable("star", 1);
    if (:getVariable("star") >= 4) {
      :addVariable("star", -4);
      :damage(DamageType.Cryo, 1);
      if (:$(`my equipment with definition id ${LightsRemit}`)) {
        :drawCards(1);
      }
    }
  }
}

/**
 * @id 11091
 * @name 熠辉轨度剑
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11091 as SwordOfTheRadiantPath;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11092
 * @name 垂裳端凝之夜
 * @description
 * 生成安眠帷幕护盾和飞星。
 */
define skill {
  id 11092 as NightsOfFormalFocus;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :combatStatus(CurtainOfSlumberShield);
  :combatStatus(ShootingStar);
}

/**
 * @id 11093
 * @name 星流摇床之梦
 * @description
 * 造成3点冰元素伤害，召唤饰梦天球。
 */
define skill {
  id 11093 as DreamOfTheStarstreamShaker;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 3);
  :summon(CelestialDreamsphere);
}

/**
 * @id 1109
 * @name 莱依拉
 * @description
 * 夜沉星移，月笼梦行。
 */
define character {
  id 1109 as Layla;
  since "v4.3.0";
  tags cryo, sword, sumeru;
  health 10;
  energy 2;
  skills SwordOfTheRadiantPath, NightsOfFormalFocus, DreamOfTheStarstreamShaker;
}

/**
 * @id 211091
 * @name 归芒携信
 * @description
 * 战斗行动：我方出战角色为莱依拉时，装备此牌。
 * 莱依拉装备此牌后，立刻使用一次垂裳端凝之夜。
 * 装备有此牌的莱依拉在场时，每当飞星造成伤害，就抓1张牌。
 * （牌组中包含莱依拉，才能加入牌组）
 */
define card {
  id 211091 as LightsRemit;
  since "v4.3.0";
  cost DiceType.Cryo, 3;
  talent Layla {
    on enter {
      :useSkill(NightsOfFormalFocus);
    }
  }
}
