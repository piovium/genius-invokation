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

import { card, character, combatStatus, DamageType, DiceType, skill, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 112022
 * @name 虹剑势
 * @description
 * 我方角色普通攻击后：造成1点水元素伤害。
 * 可用次数：3
 */
define combatStatus {
  id 112022 as RainbowBladework;
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 3;
    :damage(DamageType.Hydro, 1);
  }
}

/**
 * @id 112023
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为2的伤害时：抵消1点伤害。
 * 可用次数：3
 */
define combatStatus {
  id 112023 as RainSword01;
  conflictWith 112021;
  on decreaseDamaged {
    when :( :e.target.isActive() && :e.value >= 2 );
    usage 3;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 112021
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为3的伤害时：抵消1点伤害。
 * 可用次数：2
 */
define combatStatus {
  id 112021 as RainSword;
  tags barrier;
  conflictWith 112023;
  on decreaseDamaged {
    when :( :e.target.isActive() && :e.value >= 3 );
    usage 2;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 12021
 * @name 古华剑法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12021 as GuhuaStyle;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12022
 * @name 画雨笼山
 * @description
 * 造成2点水元素伤害，本角色附着水元素，生成雨帘剑。
 */
define skill {
  id 12022 as FatalRainscreen;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 2);
  :apply(DamageType.Hydro, "@self");
  if (:self.hasEquipment(TheScentRemained)) {
    :combatStatus(RainSword01);
  }
  else {
    :combatStatus(RainSword);
  }
}

/**
 * @id 12023
 * @name 裁雨留虹
 * @description
 * 造成2点水元素伤害，本角色附着水元素，生成虹剑势。
 */
define skill {
  id 12023 as Raincutter;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :apply(DamageType.Hydro, "@self");
  :combatStatus(RainbowBladework);
}

/**
 * @id 1202
 * @name 行秋
 * @description
 * 「怎么最近小说里的主角，都是些私塾里的学生…」
 */
define character {
  id 1202 as Xingqiu;
  since "v3.3.0";
  tags hydro, sword, liyue;
  health 10;
  energy 2;
  skills GuhuaStyle, FatalRainscreen, Raincutter;
}

/**
 * @id 212021
 * @name 重帘留香
 * @description
 * 战斗行动：我方出战角色为行秋时，装备此牌。
 * 行秋装备此牌后，立刻使用一次画雨笼山。
 * 装备有此牌的行秋生成的雨帘剑改为可以抵挡至少为2的伤害，并且初始可用次数+1。
 * （牌组中包含行秋，才能加入牌组）
 */
define card {
  id 212021 as TheScentRemained;
  since "v3.3.0";
  cost DiceType.Hydro, 3;
  talent Xingqiu {
    on enter {
      :useSkill(FatalRainscreen);
    }
  }
}
