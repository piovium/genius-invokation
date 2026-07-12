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

import { card, character, combatStatus, DamageType, DiceType, skill, type CombatStatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 116011
 * @name 璇玑屏
 * @description
 * 我方出战角色受到至少为2的伤害时：抵消1点伤害。
 * 可用次数：2
 */
define combatStatus {
  id 116011 as JadeScreenStatus;
  tags barrier;
  on decreaseDamaged {
    when :( :e.target.isActive() && :e.value >= 2 );
    usage 2;
    :e.decreaseDamage(1);
  }
  on increaseDamage {
    when :( :e.type === DamageType.Geo && 
        :$(`my equipment with definition id ${StrategicReserve}`) );
    listenTo samePlayer;
    :e.increaseDamage(1);
  }
}

/**
 * @id 16011
 * @name 千金掷
 * @description
 * 造成1点岩元素伤害。
 */
define skill {
  id 16011 as SparklingScatter;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Geo, 1);
}

/**
 * @id 16012
 * @name 璇玑屏
 * @description
 * 造成2点岩元素伤害，生成璇玑屏。
 */
define skill {
  id 16012 as JadeScreen;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 2);
  :combatStatus(JadeScreenStatus);
}

/**
 * @id 16013
 * @name 天权崩玉
 * @description
 * 造成6点岩元素伤害；如果璇玑屏在场，就使此伤害+2。
 */
define skill {
  id 16013 as Starshatter;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 3;
  if (:$(`my combat status with definition id ${JadeScreenStatus}`)) {
    :damage(DamageType.Geo, 8);
  }
  else {
    :damage(DamageType.Geo, 6);
  }
}

/**
 * @id 1601
 * @name 凝光
 * @description
 * 她保守着一个最大的秘密，那就是自己保守着璃月港的许多秘密。
 */
define character {
  id 1601 as Ningguang;
  since "v3.3.0";
  tags geo, catalyst, liyue;
  health 10;
  energy 3;
  skills SparklingScatter, JadeScreen, Starshatter;
}

/**
 * @id 216011
 * @name 储之千日，用之一刻
 * @description
 * 战斗行动：我方出战角色为凝光时，装备此牌。
 * 凝光装备此牌后，立刻使用一次璇玑屏。
 * 装备有此牌的凝光在场时，璇玑屏会使我方造成的岩元素伤害+1。
 * （牌组中包含凝光，才能加入牌组）
 */
define card {
  id 216011 as StrategicReserve;
  since "v3.3.0";
  cost DiceType.Geo, 3;
  talent Ningguang {
    on enter {
      :useSkill(JadeScreen);
    }
  }
}
