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

import { $, card, character, combatStatus, DamageType, DiceType, skill } from "@gi-tcg/core/builder";

/**
 * @id 114111
 * @name 越祓草轮
 * @description
 * 我方切换角色后：造成1点雷元素伤害，治疗我方受伤最多的角色1点。（每回合1次）
 * 可用次数：3
 */
define combatStatus {
  id 114111 as GrassRingOfSanctification;
  on switchActive {
    usage 3;
    usage perRound, 1;
    :damage(DamageType.Electro, 1, $.macros.oppActivePrioritized);
    :heal(1, $.macros.myMostInjured);
  }
}

/**
 * @id 14111
 * @name 忍流飞刃斩
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14111 as ShinobusShadowsword;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14112
 * @name 越祓雷草之轮
 * @description
 * 生成越祓草轮。如果本角色生命值至少为6，则对自身造成2点穿透伤害。
 */
define skill {
  id 14112 as SanctifyingRing;
  skillType elemental;
  cost DiceType.Electro, 3;
  :combatStatus(GrassRingOfSanctification);
  if (:self.health >= 6) {
    :damage(DamageType.Piercing, 2, "@self");
  }
}

/**
 * @id 14113
 * @name 御咏鸣神刈山祭
 * @description
 * 造成4点雷元素伤害，治疗本角色2点。
 */
define skill {
  id 14113 as GyoeiNarukamiKariyamaRite;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 4);
  :heal(2, "@self");
}

/**
 * @id 1411
 * @name 久岐忍
 * @description
 * 百业通才，鬼之副手。
 */
define character {
  id 1411 as KukiShinobu;
  since "v4.6.0";
  tags electro, sword, inazuma;
  health 10;
  energy 2;
  skills ShinobusShadowsword, SanctifyingRing, GyoeiNarukamiKariyamaRite;
}

/**
 * @id 214111
 * @name 割舍软弱之心
 * @description
 * 战斗行动：我方出战角色为久岐忍时，装备此牌。
 * 久岐忍装备此牌后，立刻使用一次御咏鸣神刈山祭。
 * 装备有此牌的久岐忍被击倒时：角色免于被击倒，并治疗该角色到1点生命值。（每回合1次）
 * 如果装备有此牌的久岐忍生命值不多于5，则该角色造成的伤害+1。
 * （牌组中包含久岐忍，才能加入牌组）
 */
define card {
  id 214111 as ToWardWeakness;
  since "v4.6.0";
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 2;
  talent KukiShinobu {
    on enter {
      :useSkill(GyoeiNarukamiKariyamaRite);
    }
    on beforeDefeated {
      usage perRound, 1;
      :immune(1);
    }
    on increaseSkillDamage {
      when :( :e.source.cast<"character">().health <= 5 );
      :e.increaseDamage(1);
    }
  }
}
