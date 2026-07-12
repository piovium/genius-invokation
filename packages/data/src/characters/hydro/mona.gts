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

import { card, character, combatStatus, DamageType, DiceType, skill, summon } from "@gi-tcg/core/builder";

/**
 * @id 112031
 * @name 虚影
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 结束阶段：弃置此牌，造成1点水元素伤害。
 */
define summon {
  id 112031 as Reflection;
  tags barrier;
  hint DamageType.Hydro, 1;
  on endPhase {
    :damage(DamageType.Hydro, 1);
    :dispose();
  }
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
}

/**
 * @id 112032
 * @name 泡影
 * @description
 * 我方造成技能伤害时：移除此状态，使本次伤害加倍。
 */
define combatStatus {
  id 112032 as IllusoryBubble;
  on multiplySkillDamage {
    :e.multiplyDamage(2);
    :dispose();
  }
}

/**
 * @id 12031
 * @name 因果点破
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 12031 as RippleOfFate;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 12032
 * @name 水中幻愿
 * @description
 * 造成1点水元素伤害，召唤虚影。
 */
define skill {
  id 12032 as MirrorReflectionOfDoom;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 1);
  :summon(Reflection);
}

/**
 * @id 12033
 * @name 星命定轨
 * @description
 * 造成4点水元素伤害，生成泡影。
 */
define skill {
  id 12033 as StellarisPhantasm;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Hydro, 4);
  :combatStatus(IllusoryBubble);
}

/**
 * @id 12034
 * @name 虚实流动
 * @description
 * 【被动】此角色为出战角色，我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
define skill {
  id 12034 as IllusoryTorrent;
  skillType passive {
    on beforeFastSwitch {
      when :( :self.isActive() );
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :e.setFastAction();
    }
  }
}

/**
 * @id 1203
 * @name 莫娜
 * @description
 * 无论胜负平弃，都是命当如此。
 */
define character {
  id 1203 as Mona;
  since "v3.3.0";
  tags hydro, catalyst, mondstadt;
  health 10;
  energy 3;
  skills RippleOfFate, MirrorReflectionOfDoom, StellarisPhantasm, IllusoryTorrent;
}

/**
 * @id 212031
 * @name 沉没的预言
 * @description
 * 战斗行动：我方出战角色为莫娜时，装备此牌。
 * 莫娜装备此牌后，立刻使用一次星命定轨。
 * 装备有此牌的莫娜出战期间，我方引发的水元素相关反应伤害额外+2。
 * （牌组中包含莫娜，才能加入牌组）
 */
define card {
  id 212031 as ProphecyOfSubmersion;
  since "v3.3.0";
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  talent Mona {
    on increaseDamage {
      when :( :self.master.isActive() &&
          :e.isReactionRelatedTo(DamageType.Hydro) );
      listenTo samePlayer;
      :e.increaseDamage(2);
    }
  }
}
