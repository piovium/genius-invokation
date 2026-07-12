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

import { card, character, DamageType, DiceType, skill, summon, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 113041
 * @name 兔兔伯爵
 * @description
 * 我方出战角色受到伤害时：抵消2点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点火元素伤害。
 */
define summon {
  id 113041 as BaronBunny;
  tags barrier;
  hint DamageType.Pyro, "2";
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(2);
  }
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Pyro, 2);
    :dispose();
  }
  on useSkill {
    when :( :$(`@event.skillCaller and character with definition id ${Amber} and has equipment with definition id ${BunnyTriggered}`) &&
        :e.isSkillType("normal") );
    :damage(DamageType.Pyro, 4);
    :dispose();
  }
}

/**
 * @id 13041
 * @name 神射手
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13041 as Sharpshooter;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13042
 * @name 爆弹玩偶
 * @description
 * 召唤兔兔伯爵。
 */
define skill {
  id 13042 as ExplosivePuppet;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :summon(BaronBunny);
}

/**
 * @id 13043
 * @name 箭雨
 * @description
 * 造成2点火元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
define skill {
  id 13043 as FieryRain;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 2, "opp standby");
  :damage(DamageType.Pyro, 2);
}

/**
 * @id 1304
 * @name 安柏
 * @description
 * 如果想要成为一名伟大的牌手…
 * 首先，要有坐上牌桌的勇气。
 */
define character {
  id 1304 as Amber;
  since "v3.7.0";
  tags pyro, bow, mondstadt;
  health 12;
  energy 2;
  skills Sharpshooter, ExplosivePuppet, FieryRain;
}

/**
 * @id 213041
 * @name 一触即发
 * @description
 * 战斗行动：我方出战角色为安柏时，装备此牌。
 * 安柏装备此牌后，立刻使用一次爆弹玩偶。
 * 安柏普通攻击后：如果此牌和兔兔伯爵仍在场，则引爆兔兔伯爵，造成4点火元素伤害。
 * （牌组中包含安柏，才能加入牌组）
 */
define card {
  id 213041 as BunnyTriggered;
  since "v3.7.0";
  cost DiceType.Pyro, 3;
  talent Amber {
    on enter {
      :useSkill(ExplosivePuppet);
    }
  }
}
