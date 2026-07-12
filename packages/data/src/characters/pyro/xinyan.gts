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

import { card, character, combatStatus, DamageType, DiceType, skill } from "@gi-tcg/core/builder";

/**
 * @id 113123
 * @name 氛围烈焰
 * @description
 * 我方宣布结束时：如果我方的手牌数量不多于1，则造成1点火元素伤害。
 * 可用次数：2
 */
define combatStatus {
  id 113123 as FestiveFires;
  on declareEnd {
    when :( :player.hands.length <= 1 );
    usage 2;
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 113121
 * @name 热情护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
define combatStatus {
  id 113121 as ShieldOfPassion;
  shield 2;
}

/**
 * @id 13121
 * @name 炎舞
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13121 as DanceOnFire;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13122
 * @name 热情拂扫
 * @description
 * 造成2点火元素伤害，随机舍弃1张当前元素骰费用最高的手牌，生成热情护盾。
 */
define skill {
  id 13122 as SweepingFervor;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 2);
  :disposeMaxCostHands(1);
  :combatStatus(ShieldOfPassion);
}

/**
 * @id 13123
 * @name 叛逆刮弦
 * @description
 * 造成3点物理伤害，对所有敌方后台角色造成2点穿透伤害；舍弃我方所有手牌，生成氛围烈焰。
 */
define skill {
  id 13123 as RiffRevolution;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 2, "opp standby");
  :damage(DamageType.Physical, 3);
  :abortPreview();
  const cards = :player.hands.toSorted((a, b) => b.diceCost() - a.diceCost());
  :disposeCard(...cards);
  :combatStatus(FestiveFires);
}

/**
 * @id 1312
 * @name 辛焱
 * @description
 * 摇滚时间到！
 */
define character {
  id 1312 as Xinyan;
  since "v4.7.0";
  tags pyro, claymore, liyue;
  health 10;
  energy 2;
  skills DanceOnFire, SweepingFervor, RiffRevolution;
}

/**
 * @id 213121
 * @name 地狱里摇摆
 * @description
 * 战斗行动：我方出战角色为辛焱时，装备此牌。
 * 辛焱装备此牌后，立刻使用一次炎舞。
 * 装备有此牌的辛焱使用技能时：如果我方手牌数量不多于1，则造成的伤害+2。（每回合1次）
 * （牌组中包含辛焱，才能加入牌组）
 */
define card {
  id 213121 as RockinInAFlamingWorld;
  since "v4.7.0";
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  talent Xinyan {
    on enter {
      :useSkill(DanceOnFire);
    }
    on increaseSkillDamage {
      when :( :player.hands.length <= 1 );
      usage perRound, 1;
      :e.increaseDamage(2);
    }
  }
}
