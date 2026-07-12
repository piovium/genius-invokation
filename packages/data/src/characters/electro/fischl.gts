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

import { card, character, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 114012
 * @name 奥兹
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 * 菲谢尔普通攻击后：造成2点雷元素伤害。（需消耗可用次数）
 */
define summon {
  id 114012 as Oz01;
  conflictWith 114011;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 1);
  }
  on useSkill {
    when :( :e.skill.caller.definition.id === Fischl && :e.isSkillType("normal") );
    :damage(DamageType.Electro, 2);
    :consumeUsage();
  }
}

/**
 * @id 114011
 * @name 奥兹
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 */
define summon {
  id 114011 as Oz;
  conflictWith 114012;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 14011
 * @name 罪灭之矢
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14011 as BoltsOfDownfall;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14012
 * @name 夜巡影翼
 * @description
 * 造成1点雷元素伤害，召唤奥兹。
 */
define skill {
  id 14012 as Nightrider;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 1);
  if (:self.hasEquipment(StellarPredator)) {
    :summon(Oz01);
  }
  else {
    :summon(Oz);
  }
}

/**
 * @id 14013
 * @name 至夜幻现
 * @description
 * 造成4点雷元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
define skill {
  id 14013 as MidnightPhantasmagoria;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Piercing, 2, "opp standby");
  :damage(DamageType.Electro, 4);
}

/**
 * @id 1401
 * @name 菲谢尔
 * @description
 * 「奥兹！我之眷属，展开羽翼，替我在幽夜中寻求全新的命运之线吧！」
 * 「小姐，我可没办法帮你换一张牌啊…」
 */
define character {
  id 1401 as Fischl;
  since "v3.3.0";
  tags electro, bow, mondstadt;
  health 10;
  energy 3;
  skills BoltsOfDownfall, Nightrider, MidnightPhantasmagoria;
}

/**
 * @id 214011
 * @name 噬星魔鸦
 * @description
 * 战斗行动：我方出战角色为菲谢尔时，装备此牌。
 * 菲谢尔装备此牌后，立刻使用一次夜巡影翼。
 * 装备有此牌的菲谢尔生成的奥兹，会在菲谢尔普通攻击后造成2点雷元素伤害。（需消耗可用次数）
 * （牌组中包含菲谢尔，才能加入牌组）
 */
define card {
  id 214011 as StellarPredator;
  since "v3.3.0";
  cost DiceType.Electro, 3;
  talent Fischl {
    on enter {
      :useSkill(Nightrider);
    }
  }
}
