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
 * @id 111031
 * @name 寒冰之棱
 * @description
 * 我方切换角色后：造成2点冰元素伤害。
 * 可用次数：3
 */
define combatStatus {
  id 111031 as Icicle;
  on switchActive {
    usage 3;
    :damage(DamageType.Cryo, 2);
  }
}

/**
 * @id 11031
 * @name 仪典剑术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11031 as CeremonialBladework;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11032
 * @name 霜袭
 * @description
 * 造成3点冰元素伤害。
 */
define skill {
  id 11032 as Frostgnaw;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
}

/**
 * @id 11033
 * @name 凛冽轮舞
 * @description
 * 造成1点冰元素伤害，生成寒冰之棱。
 */
define skill {
  id 11033 as GlacialWaltz;
  skillType burst;
  cost DiceType.Cryo, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 1);
  :combatStatus(Icicle);
}

/**
 * @id 1103
 * @name 凯亚
 * @description
 * 他很擅长在他人身上发掘出「骑士般的美德」。
 */
define character {
  id 1103 as Kaeya;
  since "v3.3.0";
  tags cryo, sword, mondstadt;
  health 10;
  energy 2;
  skills CeremonialBladework, Frostgnaw, GlacialWaltz;
}

/**
 * @id 211031
 * @name 冷血之剑
 * @description
 * 战斗行动：我方出战角色为凯亚时，装备此牌。
 * 凯亚装备此牌后，立刻使用一次霜袭。
 * 装备有此牌的凯亚使用霜袭后：治疗自身2点。（每回合1次）
 * （牌组中包含凯亚，才能加入牌组）
 */
define card {
  id 211031 as ColdbloodedStrike;
  since "v3.3.0";
  cost DiceType.Cryo, 3;
  talent Kaeya {
    on enter {
      :useSkill(Frostgnaw);
    }
    on useSkill {
      when :( :e.skill.definition.id === Frostgnaw );
      usage perRound, 1;
      :heal(2, "@master");
    }
  }
}
