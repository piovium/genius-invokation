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

import { character, skill, summon, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 117022
 * @name 藏蕴花矢
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define summon {
  id 117022 as ClusterbloomArrow;
  hint DamageType.Dendro, 1;
  on endPhase {
    usage 1 {
      append 2;
    };
    :damage(DamageType.Dendro, 1);
  }
}

/**
 * @id 117021
 * @name 通塞识
 * @description
 * 所附属角色进行重击时：造成的物理伤害变为草元素伤害，并且会在技能结算后召唤藏蕴花矢。
 * 可用次数：2
 */
define status {
  id 117021 as VijnanaSuffusion;
  on modifySkillDamageType {
    when :( :e.viaChargedAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Dendro);
  }
  on useSkill {
    when :( :e.isChargedAttack() );
    usage 2;
    :summon(ClusterbloomArrow);
  }
}

/**
 * @id 17021
 * @name 藏蕴破障
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17021 as KhandaBarrierbuster;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17022
 * @name 识果种雷
 * @description
 * 造成2点草元素伤害，本角色附属通塞识。
 */
define skill {
  id 17022 as VijnanaphalaMine;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 2);
  :characterStatus(VijnanaSuffusion);
}

/**
 * @id 17023
 * @name 造生缠藤箭
 * @description
 * 造成4点草元素伤害，对所有敌方后台角色造成1点穿透伤害。
 */
define skill {
  id 17023 as FashionersTanglevineShaft;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Dendro, 4);
}

/**
 * @id 1702
 * @name 提纳里
 * @description
 * 从某种角度来说，经验并不等同于智慧。
 */
define character {
  id 1702 as Tighnari;
  since "v3.6.0";
  tags dendro, bow, sumeru;
  health 10;
  energy 2;
  skills KhandaBarrierbuster, VijnanaphalaMine, FashionersTanglevineShaft;
}

/**
 * @id 217021
 * @name 眼识殊明
 * @description
 * 战斗行动：我方出战角色为提纳里时，装备此牌。
 * 提纳里装备此牌后，立刻使用一次识果种雷。
 * 装备有此牌的提纳里在附属通塞识状态期间，进行重击时少花费1个无色元素。
 * （牌组中包含提纳里，才能加入牌组）
 */
define card {
  id 217021 as KeenSight;
  since "v3.6.0";
  cost DiceType.Dendro, 3;
  talent Tighnari {
    on enter {
      :useSkill(VijnanaphalaMine);
    }
    on deductVoidDiceSkill {
      when :( :self.master.hasStatus(VijnanaSuffusion) && 
          :e.isChargedAttack() );
      :e.deductVoidCost(1);
    }
  }
}
