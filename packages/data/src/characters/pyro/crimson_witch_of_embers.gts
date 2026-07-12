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

import { card, character, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 163011
 * @name 炽热
 * @description
 * 结束阶段：对所附属角色造成1点火元素伤害。
 * 可用次数：1
 * 所附属角色被附属严寒时，移除此效果。
 */
define status {
  id 163011 as BlazingHeat;
  conflictWith 121022;
  on endPhase {
    usage 1;
    :damage(DamageType.Pyro, 1, "@master");
  }
}

/**
 * @id 63014
 * @name 红莲旋火
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 63014 as CrimsonFlamespin;
  skillType passive;
  reserved;
}

/**
 * @id 163012
 * @name 红莲的旋风
 * @description
 * 本角色将在下次行动时，直接使用技能：造成3点火元素伤害，移除护盾。
 * 准备技能期间：提供3点护盾，保护所附属的角色。
 */
define status {
  id 163012 as EncarmineVortex;
  reserved;
}

/**
 * @id 63011
 * @name 红莲之蛾
 * @description
 * 造成1点火元素伤害。
 */
define skill {
  id 63011 as CrimsonLotusMoth;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Pyro, 1);
}

/**
 * @id 63012
 * @name 烬灭之鞭
 * @description
 * 造成2点火元素伤害，并使目标角色附属炽热。
 */
define skill {
  id 63012 as DecimatingLash;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 2);
  :characterStatus(BlazingHeat, "opp active");
}

/**
 * @id 63013
 * @name 燃焰旋织
 * @description
 * 造成6点火元素伤害。
 */
define skill {
  id 63013 as WhirlingBlaze;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 6);
}

/**
 * @id 6301
 * @name 焚尽的炽炎魔女
 * @description
 * 
 */
define character {
  id 6301 as CrimsonWitchOfEmbers;
  since "v4.3.0";
  tags pyro, fatui;
  health 10;
  energy 2;
  skills CrimsonLotusMoth, DecimatingLash, WhirlingBlaze;
}
