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

import { character, skill, status, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 122022
 * @name 水光破镜
 * @description
 * 所附属角色受到的水元素伤害+1。
 * 所附属角色切换到其他角色时：需要多花费1个元素骰。
 * 持续回合：3
 * （同一方场上最多存在一个此状态）
 */
define status {
  id 122022 as Refraction01;
  conflictWith crossCharacter, 122021;
  duration 3;
  on increaseDamaged {
    when :( :e.type === DamageType.Hydro );
    :e.increaseDamage(1);
  }
  on addDice {
    when :( :e.action.type === "switchActive" && :self.master.id === :e.action.from?.id );
    :e.addCost(DiceType.Void, 1);
  }
}

/**
 * @id 122021
 * @name 水光破镜
 * @description
 * 所附属角色切换到其他角色时：需要多花费1个元素骰。
 * 持续回合：2
 * （同一方场上最多存在一个此状态）
 */
define status {
  id 122021 as Refraction;
  conflictWith crossCharacter, 122022;
  duration 2;
  on addDice {
    when :( :e.action.type === "switchActive" && :self.master.id === :e.action.from?.id );
    :e.addCost(DiceType.Void, 1);
  }
}

/**
 * @id 22021
 * @name 水弹
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 22021 as WaterBall;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成3点水元素伤害，目标角色附属水光破镜。
 */
define skill {
  id 22022 as InfluxBlast;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 3);
  if (:self.hasEquipment(MirrorCage)) {
    :characterStatus(Refraction01, "opp active");
  }
  else {
    :characterStatus(Refraction, "opp active");
  }
}

/**
 * @id 22023
 * @name 粼镜折光
 * @description
 * 造成5点水元素伤害。
 */
define skill {
  id 22023 as RippledReflection;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 5);
}

/**
 * @id 2202
 * @name 愚人众·藏镜仕女
 * @description
 * 一切隐秘，都将深藏于潋光的水镜之中吧…
 */
define character {
  id 2202 as MirrorMaiden;
  since "v3.3.0";
  tags hydro, fatui;
  health 10;
  energy 2;
  skills WaterBall, InfluxBlast, RippledReflection;
}

/**
 * @id 222021
 * @name 镜锢之笼
 * @description
 * 战斗行动：我方出战角色为愚人众·藏镜仕女时，装备此牌。
 * 愚人众·藏镜仕女装备此牌后，立刻使用一次潋波绽破。
 * 装备有此牌的愚人众·藏镜仕女生成的水光破镜初始持续回合+1，并且会使所附属角色受到的水元素伤害+1。
 * （牌组中包含愚人众·藏镜仕女，才能加入牌组）
 */
define card {
  id 222021 as MirrorCage;
  since "v3.3.0";
  cost DiceType.Hydro, 3;
  talent MirrorMaiden {
    on enter {
      :useSkill(InfluxBlast);
    }
  }
}
