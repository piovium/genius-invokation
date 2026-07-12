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
 * @id 115042
 * @name 降魔·忿怒显相
 * @description
 * 所附属角色使用风轮两立时：少花费1个风元素。
 * 可用次数：2
 * 所附属角色不再附属夜叉傩面时：移除此效果。
 */
define status {
  id 115042 as ConquerorOfEvilWrathDeity;
  on deductElementDiceSkill {
    when :( :e.action.skill.definition.id === LemniscaticWindCycling && 
        :e.canDeductCostOfType(DiceType.Anemo) );
    usage 2;
    :e.deductCost(DiceType.Anemo, 1);
  }
  on dispose {
    when :( :e.entity.definition.id === YakshasMask );
    :dispose();
  }
}

/**
 * @id 115041
 * @name 夜叉傩面
 * @description
 * 所附属角色造成的物理伤害变为风元素伤害，且角色造成的风元素伤害+1。
 * 所附属角色进行下落攻击时：伤害额外+2。
 * 所附属角色为出战角色，我方执行「切换角色」行动时：少花费1个元素骰。（每回合1次）
 * 持续回合：2
 */
define status {
  id 115041 as YakshasMask;
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Anemo);
  }
  on increaseSkillDamage {
    when :( :e.type === DamageType.Anemo );
    :e.increaseDamage(1);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(2);
  }
  on deductOmniDiceSwitch {
    when :( :self.master.isActive() );
    usage perRound, 1;
    :e.deductOmniCost(1);
  }
}

/**
 * @id 15041
 * @name 卷积微尘
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15041 as WhirlwindThrust;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15042
 * @name 风轮两立
 * @description
 * 造成3点风元素伤害。
 */
define skill {
  id 15042 as LemniscaticWindCycling;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 3);
}

/**
 * @id 15043
 * @name 靖妖傩舞
 * @description
 * 造成4点风元素伤害，本角色附属夜叉傩面。
 */
define skill {
  id 15043 as BaneOfAllEvil;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 4);
  :characterStatus(YakshasMask);
  if (:self.hasEquipment(ConquerorOfEvilGuardianYaksha)) {
    :characterStatus(ConquerorOfEvilWrathDeity);
  }
}

/**
 * @id 1504
 * @name 魈
 * @description
 * 护法夜叉，靖妖降魔。
 */
define character {
  id 1504 as Xiao;
  since "v3.7.0";
  tags anemo, pole, liyue;
  health 10;
  energy 2;
  skills WhirlwindThrust, LemniscaticWindCycling, BaneOfAllEvil;
}

/**
 * @id 215041
 * @name 降魔·护法夜叉
 * @description
 * 战斗行动：我方出战角色为魈时，装备此牌。
 * 魈装备此牌后，立刻使用一次靖妖傩舞。
 * 装备有此牌的魈附属夜叉傩面期间，使用风轮两立时少花费1个风元素。（每附属1次夜叉傩面，可触发2次）
 * （牌组中包含魈，才能加入牌组）
 */
define card {
  id 215041 as ConquerorOfEvilGuardianYaksha;
  since "v3.7.0";
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  talent Xiao {
    on enter {
      :useSkill(BaneOfAllEvil);
    }
  }
}
