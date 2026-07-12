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
 * @id 113021
 * @name 锅巴
 * @description
 * 结束阶段：造成2点火元素伤害。
 * 可用次数：2
 */
define summon {
  id 113021 as Guoba;
  hint DamageType.Pyro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Pyro, 2);
  }
}

/**
 * @id 113022
 * @name 旋火轮
 * @description
 * 我方角色使用技能后：造成2点火元素伤害。
 * 可用次数：2
 */
define combatStatus {
  id 113022 as PyronadoStatus;
  on useSkill {
    when :( :e.skill.definition.id !== Pyronado );
    usage 2;
    :damage(DamageType.Pyro, 2);
  }
}

/**
 * @id 13021
 * @name 白案功夫
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13021 as DoughFu;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13022
 * @name 锅巴出击
 * @description
 * 召唤锅巴。
 */
define skill {
  id 13022 as GuobaAttack;
  skillType elemental;
  cost DiceType.Pyro, 3;
  if (:self.hasEquipment(Crossfire)) {
    :damage(DamageType.Pyro, 1);
  }
  :summon(Guoba);
}

/**
 * @id 13023
 * @name 旋火轮
 * @description
 * 造成3点火元素伤害，生成旋火轮。
 */
define skill {
  id 13023 as Pyronado;
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :combatStatus(PyronadoStatus);
}

/**
 * @id 1302
 * @name 香菱
 * @description
 * 身为一个厨师，她几乎什么都做得到。
 */
define character {
  id 1302 as Xiangling;
  since "v3.3.0";
  tags pyro, pole, liyue;
  health 10;
  energy 2;
  skills DoughFu, GuobaAttack, Pyronado;
}

/**
 * @id 213021
 * @name 交叉火力
 * @description
 * 战斗行动：我方出战角色为香菱时，装备此牌。
 * 香菱装备此牌后，立刻使用一次锅巴出击。
 * 装备有此牌的香菱使用锅巴出击时：自身也会造成1点火元素伤害。
 * （牌组中包含香菱，才能加入牌组）
 */
define card {
  id 213021 as Crossfire;
  since "v3.3.0";
  cost DiceType.Pyro, 3;
  talent Xiangling {
    on enter {
      :useSkill(GuobaAttack);
    }
  }
}
