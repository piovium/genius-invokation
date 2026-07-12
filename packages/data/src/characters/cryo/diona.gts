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

import { card, character, combatStatus, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111023
 * @name 酒雾领域
 * @description
 * 结束阶段：造成1点冰元素伤害，治疗我方出战角色2点。
 * 可用次数：2
 */
define summon {
  id 111023 as DrunkenMist;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
    :heal(2, "my active");
  }
}

/**
 * @id 111022
 * @name 猫爪护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
define combatStatus {
  id 111022 as CatclawShield01;
  conflictWith 111021;
  shield 2;
}

/**
 * @id 111021
 * @name 猫爪护盾
 * @description
 * 为我方出战角色提供1点护盾。
 */
define combatStatus {
  id 111021 as CatclawShield;
  conflictWith 111022;
  shield 1;
}

/**
 * @id 11021
 * @name 猎人射术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11021 as KatzleinStyle;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11022
 * @name 猫爪冻冻
 * @description
 * 造成2点冰元素伤害，生成猫爪护盾。
 */
define skill {
  id 11022 as IcyPaws;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 2);
  if (:self.hasEquipment(ShakenNotPurred)) {
    :combatStatus(CatclawShield01);
  }
  else {
    :combatStatus(CatclawShield);
  }
}

/**
 * @id 11023
 * @name 最烈特调
 * @description
 * 造成1点冰元素伤害，治疗此角色2点，召唤酒雾领域。
 */
define skill {
  id 11023 as SignatureMix;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Cryo, 1);
  :heal(2, "@self");
  :summon(DrunkenMist);
}

/**
 * @id 1102
 * @name 迪奥娜
 * @description
 * 用1%的力气调酒，99%的力气…拒绝失败。
 */
define character {
  id 1102 as Diona;
  since "v3.3.0";
  tags cryo, bow, mondstadt;
  health 12;
  energy 3;
  skills KatzleinStyle, IcyPaws, SignatureMix;
}

/**
 * @id 211021
 * @name 猫爪冰摇
 * @description
 * 战斗行动：我方出战角色为迪奥娜时，装备此牌。
 * 迪奥娜装备此牌后，立刻使用一次猫爪冻冻。
 * 装备有此牌的迪奥娜生成的猫爪护盾，所提供的护盾值+1。
 * （牌组中包含迪奥娜，才能加入牌组）
 */
define card {
  id 211021 as ShakenNotPurred;
  since "v3.3.0";
  cost DiceType.Cryo, 3;
  talent Diona {
    on enter {
      :useSkill(IcyPaws);
    }
  }
}
