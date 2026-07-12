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

import { character, skill, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 113011
 * @name 火元素附魔
 * @description
 * 所附属角色造成的物理伤害，变为火元素伤害。
 * 持续回合：2
 */
define status {
  id 113011 as PyroInfusion;
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
}

/**
 * @id 13011
 * @name 淬炼之剑
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13011 as TemperedSword;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13012
 * @name 逆焰之刃
 * @description
 * 造成3点火元素伤害。每回合第三次使用本技能时，伤害+2。
 */
define skill {
  id 13012 as SearingOnslaught;
  skillType elemental;
  cost DiceType.Pyro, 3;
  if (:countOfSkill() === 2) {
    :damage(DamageType.Pyro, 5);
  }
  else {
    :damage(DamageType.Pyro, 3);
  }
}

/**
 * @id 13013
 * @name 黎明
 * @description
 * 造成8点火元素伤害，本角色附属火元素附魔。
 */
define skill {
  id 13013 as Dawn;
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 3;
  :damage(DamageType.Pyro, 8);
  :characterStatus(PyroInfusion);
}

/**
 * @id 1301
 * @name 迪卢克
 * @description
 * 他的心是他最大的敌人。
 */
define character {
  id 1301 as Diluc;
  since "v3.3.0";
  tags pyro, claymore, mondstadt;
  health 10;
  energy 3;
  skills TemperedSword, SearingOnslaught, Dawn;
}

/**
 * @id 213011
 * @name 流火焦灼
 * @description
 * 战斗行动：我方出战角色为迪卢克时，装备此牌。
 * 迪卢克装备此牌后，立刻使用一次逆焰之刃。
 * 装备有此牌的迪卢克每回合第2次与第3次使用逆焰之刃时：少花费1个火元素。
 * （牌组中包含迪卢克，才能加入牌组）
 */
define card {
  id 213011 as FlowingFlame;
  since "v3.3.0";
  cost DiceType.Pyro, 3;
  talent Diluc {
    on enter {
      :useSkill(SearingOnslaught);
    }
    on deductElementDiceSkill {
      when :( :e.action.skill.definition.id === SearingOnslaught && 
          [1, 2].includes(:countOfSkill(Diluc, SearingOnslaught)) &&
          :e.canDeductCostOfType(DiceType.Pyro) );
      :e.deductCost(DiceType.Pyro, 1);
    }
  }
}
