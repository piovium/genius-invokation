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
 * @id 113081
 * @name 丹火印
 * @description
 * 角色进行重击时：造成的伤害+2。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define status {
  id 113081 as ScarletSeal;
  on increaseSkillDamage {
    when :( :e.viaChargedAttack() );
    usage 1 {
      append 2;
    };
    :e.increaseDamage(2);
  }
}

/**
 * @id 113082
 * @name 灼灼
 * @description
 * 角色进行重击时：少花费1个火元素。（每回合1次）
 * 结束阶段：角色附属丹火印。
 * 持续回合：2
 */
define status {
  id 113082 as Brilliance;
  duration 2;
  on deductElementDiceSkill {
    when :( :e.isChargedAttack() && :e.canDeductCostOfType(DiceType.Pyro) );
    usage perRound, 1;
    :e.deductCost(DiceType.Pyro, 1);
  }
  on endPhase {
    :characterStatus(ScarletSeal, "@master");
  }
}

/**
 * @id 13081
 * @name 火漆制印
 * @description
 * 造成1点火元素伤害。
 */
define skill {
  id 13081 as SealOfApproval;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Pyro, 1);
}

/**
 * @id 13082
 * @name 丹书立约
 * @description
 * 造成3点火元素伤害，本角色附属丹火印。
 */
define skill {
  id 13082 as SignedEdict;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  :characterStatus(ScarletSeal);
}

/**
 * @id 13083
 * @name 凭此结契
 * @description
 * 造成4点火元素伤害，本角色附属丹火印和灼灼。
 */
define skill {
  id 13083 as DoneDeal;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 4);
  :characterStatus(ScarletSeal);
  :characterStatus(Brilliance);
}

/**
 * @id 1308
 * @name 烟绯
 * @description
 * 不期修古，不法常可。
 */
define character {
  id 1308 as Yanfei;
  since "v3.8.0";
  tags pyro, catalyst, liyue;
  health 10;
  energy 2;
  skills SealOfApproval, SignedEdict, DoneDeal;
}

/**
 * @id 213081
 * @name 最终解释权
 * @description
 * 战斗行动：我方出战角色为烟绯时，装备此牌。
 * 烟绯装备此牌后，立刻使用一次火漆制印。
 * 装备有此牌的烟绯进行重击时：对生命值不多于6的敌人造成的伤害+1；如果触发了丹火印，则在技能结算后抓1张牌。
 * （牌组中包含烟绯，才能加入牌组）
 */
define card {
  id 213081 as RightOfFinalInterpretation;
  since "v3.8.0";
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  talent Yanfei {
    variable triggerSeal, 0;
    on enter {
      :useSkill(SealOfApproval);
    }
    on increaseSkillDamage {
      when :( :e.viaChargedAttack() && :e.target.health <= 6 );
      :e.increaseDamage(1);
      if (:self.master.hasStatus(ScarletSeal)) {
        :setVariable("triggerSeal", 1);
      }
    }
    on useSkill {
      when :( :getVariable("triggerSeal") );
      :drawCards(1);
      :setVariable("triggerSeal", 0);
    }
  }
}
