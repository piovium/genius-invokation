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

import { card, character, DamageType, DiceType, skill, status, summon, type SkillHandle, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 125012
 * @name 剑影·霜驰
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 */
define summon {
  id 125012 as ShadowswordGallopingFrost;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  }
  on useSkill {
    when :( :e.skill.definition.id === PseudoTenguSweeper );
    :damage(DamageType.Cryo, 1);
  }
}

/**
 * @id 125011
 * @name 剑影·孤风
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：2
 */
define summon {
  id 125011 as ShadowswordLoneGale;
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Anemo, 1);
  }
  on useSkill {
    when :( :e.skill.definition.id === PseudoTenguSweeper );
    :damage(DamageType.Anemo, 1);
  }
}

/**
 * @id 125013
 * @name 凶面归位
 * @description
 * 结束阶段：切换到所附属角色。
 */
define status {
  id 125013 as TerrormasksReturn;
  reserved;
}

/**
 * @id 25011
 * @name 一文字
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 25011 as Ichimonji;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 25012
 * @name 孤风刀势
 * @description
 * 召唤剑影·孤风。
 */
define skill {
  id 25012 as BlusteringBlade;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :summon(ShadowswordLoneGale);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive("my next");
  }
}

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 召唤剑影·霜驰。
 */
define skill {
  id 25013 as FrostyAssault;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :summon(ShadowswordGallopingFrost);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive("my prev");
  }
}

/**
 * @id 25014
 * @name 机巧伪天狗抄
 * @description
 * 造成4点风元素伤害，触发所有我方剑影召唤物的效果。（不消耗其可用次数）
 */
define skill {
  id 25014 as PseudoTenguSweeper;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Anemo, 4);
}

/**
 * @id 2501
 * @name 魔偶剑鬼
 * @description
 * 今日，其仍徘徊在因缘断绝之地。
 */
define character {
  id 2501 as MaguuKenki;
  since "v3.3.0";
  tags anemo, monster;
  health 10;
  energy 3;
  skills Ichimonji, BlusteringBlade, FrostyAssault, PseudoTenguSweeper;
}

/**
 * @id 225011
 * @name 机巧神通
 * @description
 * 战斗行动：我方出战角色为魔偶剑鬼时，装备此牌。
 * 魔偶剑鬼装备此牌后，立刻使用一次孤风刀势。
 * 装备有此牌的魔偶剑鬼使用孤风刀势后，我方切换到后一个角色；使用霜驰影突后，我方切换到前一个角色。
 * （牌组中包含魔偶剑鬼，才能加入牌组）
 */
define card {
  id 225011 as TranscendentAutomaton;
  since "v3.3.0";
  cost DiceType.Anemo, 3;
  talent MaguuKenki {
    on enter {
      :useSkill(BlusteringBlade);
    }
  }
}
