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

import { card, character, customEvent, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 114131
 * @name 寂想瞑影
 * @description
 * 所附属角色使用普通攻击时：造成的物理伤害变为雷元素伤害，伤害+1，少花费1个无色元素，并且对敌方生命值最低的角色造成1点穿透伤害。
 * 持续回合：2
 */
define status {
  id 114131 as TwilightMeditation;
  since "v5.6.0";
  duration 2;
  on deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(1);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Piercing, 1, "opp character order by health limit 1");
  }
}

/**
 * @id 114132
 * @name 轰雷凝集
 * @description
 * 我方角色引发雷元素相关反应后:所附属角色获得1点充能。
 * 可用次数：1
 */
define status {
  id 114132 as ThunderConvergence;
  since "v5.6.0";
  on useSkill {
    when :( :hasPhaseReaction("my", (e) => e.relatedTo(DamageType.Electro)) );
    listenTo samePlayer;
    usage 1;
    :gainEnergy(1, "@master");
  }
}

/**
 * @id 14131
 * @name 王家苇箭术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14131 as RoyalReedArchery;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  noEnergy;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14132
 * @name 古仪·鸣砂掣雷
 * @description
 * 敌方出战角色附着雷元素，我方切换到下一个角色。自身附属轰雷凝集。
 */
define skill {
  id 14132 as AncientRiteTheThunderingSands;
  skillType elemental;
  cost DiceType.Electro, 2;
  :apply(DamageType.Electro, "opp active");
  :switchActive("my next");
  :characterStatus(ThunderConvergence, "@self");
}

/**
 * @id 14133
 * @name 秘仪·瞑光贯影
 * @description
 * 造成3点雷元素伤害，自身附属寂想瞑影。
 */
define skill {
  id 14133 as SecretRiteTwilightShadowpiercer;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 4;
  :damage(DamageType.Electro, 3);
  :characterStatus(TwilightMeditation, "@self");
}

const EnergyLost = customEvent("sethos/energyLost");

/**
 * @id 14134
 * @name 黑鸢的密喻
 * @description
 * 自身「普通攻击」不会获得充能。
 * 自身「普通攻击」后：如可能，消耗全部充能，对生命值最低的敌方造成等额+1的穿透伤害。
 */
define skill {
  id 14134 as BlackKitesEnigma;
  skillType passive {
    on useSkill {
      when :( :e.isSkillType("normal") );
      const energy = :self.energy;
      if (energy) {
        :self.loseEnergy(energy);
        :damage(DamageType.Piercing, energy + 1, "opp character order by health limit 1");
        :emitCustomEvent(EnergyLost);
      }
    }
  }
}

/**
 * @id 1413
 * @name 赛索斯
 * @description
 * 沙海来客，慧心慧业。
 */
define character {
  id 1413 as Sethos;
  since "v5.6.0";
  tags electro, bow, sumeru;
  health 10;
  energy 4;
  skills RoyalReedArchery, AncientRiteTheThunderingSands, SecretRiteTwilightShadowpiercer, BlackKitesEnigma;
}

/**
 * @id 214131
 * @name 巡日塔门书
 * @description
 * 我方赛索斯获得1点充能。
 * 我方赛索斯因黑鸢的密喻扣除充能后，获得1点充能。（每回合1次）
 * （牌组中包含赛索斯，才能加入牌组）
 */
define card {
  id 214131 as PylonOfTheSojourningSunTemple;
  since "v5.6.0";
  cost DiceType.Electro, 1;
  talent Sethos, none {
    on enter {
      :gainEnergy(1, "@master");
    }
    on EnergyLost {
      usage perRound, 1;
      :gainEnergy(1, "@master");
    }
  }
}
