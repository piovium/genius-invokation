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

import { $, card, character, combatStatus, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 117011
 * @name 柯里安巴
 * @description
 * 结束阶段：造成2点草元素伤害。
 * 可用次数：2
 */
define summon {
  id 117011 as CuileinAnbar;
  hint DamageType.Dendro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Dendro, 2);
  }
}

/**
 * @id 117012
 * @name 新叶
 * @description
 * 我方角色使用技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * 持续回合：1
 */
define combatStatus {
  id 117012 as Sprout;
  duration 1;
  on useSkill {
    when :( :hasPhaseReaction("my", (e) => e.relatedTo(DamageType.Dendro)) );
    usage perRound, 1;
    :damage(DamageType.Dendro, 1);
  }
}

/**
 * @id 117013
 * @name 新叶(已创建)
 * @description
 * 本回合中无法再生成新的新叶。
 */
define combatStatus {
  id 117013 as SproutCreated;
  oneDuration;
}

/**
 * @id 17011
 * @name 祈颂射艺
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17011 as SupplicantsBowmanship;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17012
 * @name 拂花偈叶
 * @description
 * 造成3点草元素伤害。
 */
define skill {
  id 17012 as FloralBrush;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 3);
  if (:self.hasEquipment(FloralSidewinder) && !:query($.my.combatStatus.def(SproutCreated))) {
    :combatStatus(Sprout);
    :combatStatus(SproutCreated);
  }
}

/**
 * @id 17013
 * @name 猫猫秘宝
 * @description
 * 造成2点草元素伤害，召唤柯里安巴。
 */
define skill {
  id 17013 as TrumpcardKitty;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 2);
  :summon(CuileinAnbar);
}

/**
 * @id 1701
 * @name 柯莱
 * @description
 * 「大声喊出卡牌的名字会让它威力加倍…这一定是虚构的吧？」
 */
define character {
  id 1701 as Collei;
  since "v3.3.0";
  tags dendro, bow, sumeru;
  health 11;
  energy 2;
  skills SupplicantsBowmanship, FloralBrush, TrumpcardKitty;
}

/**
 * @id 217011
 * @name 飞叶迴斜
 * @description
 * 战斗行动：我方出战角色为柯莱时，装备此牌。
 * 柯莱装备此牌后，立刻使用一次拂花偈叶。
 * 装备有此牌的柯莱使用了拂花偈叶的回合中，我方角色的技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * （牌组中包含柯莱，才能加入牌组）
 */
define card {
  id 217011 as FloralSidewinder;
  since "v3.3.0";
  cost DiceType.Dendro, 3;
  talent Collei {
    on enter {
      :useSkill(FloralBrush);
    }
  }
}
