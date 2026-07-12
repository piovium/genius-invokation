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

import { DamageType, DiceType, card, status } from "@gi-tcg/core/builder";
import { BondOfLife } from "../../../commons.gts";

/**
 * @id 311101
 * @name 魔导绪论
 * @description
 * 角色造成的伤害+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311101 as MagicGuide;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 311102
 * @name 祭礼残章
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311102 as SacrificialFragments;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 1;
      :generateDice(:self.master.element(), 1);
    }
  }
}

/**
 * @id 311103
 * @name 天空之卷
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311103 as SkywardAtlas;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on increaseSkillDamage {
      when :( :e.viaSkillType("normal") );
      usage perRound, 1;
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 311104
 * @name 千夜浮梦
 * @description
 * 角色造成的伤害+1。
 * 我方角色引发元素反应时：造成的伤害+1。（每回合最多触发2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311104 as AThousandFloatingDreams;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on increaseSkillDamage {
      when :( :e.getReaction() );
      listenTo samePlayer;
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 311105
 * @name 盈满之实
 * @description
 * 角色造成的伤害+1。
 * 入场时：抓2张牌。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311105 as FruitOfFulfillment;
  since "v3.8.0";
  cost DiceType.Void, 3;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on enter {
      :drawCards(2);
    }
  }
}

/**
 * @id 311106
 * @name 四风原典
 * @description
 * 此牌每有1点「伤害加成」，角色造成的伤害+1。
 * 结束阶段：此牌累积1点「伤害加成」。（最多累积到2点）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311106 as LostPrayerToTheSacredWinds;
  since "v4.3.0";
  cost DiceType.Aligned, 2;
  weapon catalyst {
    variable extraDamage, 0;
    on increaseSkillDamage {
      :e.increaseDamage(:getVariable("extraDamage"));
    }
    on endPhase {
      :addVariableWithMax("extraDamage", 1, 2);
    }
  }
}

/**
 * @id 311107
 * @name 图莱杜拉的回忆
 * @description
 * 角色造成的伤害+1。
 * 角色进行重击时：少花费1个无色元素。（每回合最多触发2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311107 as TulaytullahsRemembrance;
  since "v4.3.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on deductVoidDiceSkill {
      when :( :e.isChargedAttack() );
      usage perRound, 2;
      :e.deductVoidCost(1);
    }
  }
}

/**
 * @id 301108
 * @name 万世的浪涛
 * @description
 * 角色在本回合中，下次造成的伤害+2。
 */
define status {
  id 301108 as AeonWave;
  oneDuration;
  once increaseSkillDamage {
    :e.increaseDamage(2);
  }
}

/**
 * @id 311108
 * @name 万世流涌大典
 * @description
 * 角色造成的伤害+1。
 * 角色受到伤害或治疗后：如果本回合已受到伤害或治疗累计2次，则角色本回合中下次造成的伤害+2。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311108 as TomeOfTheEternalFlow;
  since "v4.5.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    variable count, 0;
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on damagedOrHealed {
      :addVariable("count", 1);
    }
    on damagedOrHealed {
      when :( :getVariable("count") === 2 );
      usage perRound, 1;
      :characterStatus(AeonWave, "@master");
    }
    on roundEnd {
      :setVariable("count", 0);
    }
  }
}

/**
 * @id 301111
 * @name 金流监督（生效中）
 * @description
 * 本回合中，角色下一次「普通攻击」少花费1个无色元素，且造成的伤害+1。
 */
define status {
  id 301111 as CashflowSupervisionInEffect;
  oneDuration;
  on deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(1);
  }
  once increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
}

/**
 * @id 311109
 * @name 金流监督
 * @description
 * 角色受到伤害或治疗后：使角色本回合中下一次「普通攻击」少花费1个无色元素，且造成的伤害+1。（每回合至多2次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311109 as CashflowSupervision;
  since "v4.7.0";
  cost DiceType.Aligned, 2;
  weapon catalyst {
    on damagedOrHealed {
      usage perRound, 2;
      :characterStatus(CashflowSupervisionInEffect, "@master");
    }
  }
}

/**
 * @id 133099
 * @name 万世涌流大典
 * @description
 * 角色造成的伤害+1。
 * 角色受到伤害或治疗后：如果本回合已受到伤害或治疗累计2次，则角色本回合中下次造成的伤害+2。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 133099 as TombOfTheEternalFlow; // 骗骗花
  reserved;
}

/**
 * @id 301112
 * @name 纯水流华（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
define status {
  id 301112 as FlowingPurityInEffect;
  once increaseSkillDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 311110
 * @name 纯水流华
 * @description
 * 入场时和回合结束时：角色附属1层生命之契。
 * 双方选择行动前：所附属角色如果未附属生命之契，则生成1个随机基础元素骰，并且角色下次造成的伤害+1。（每回合1次）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311110 as FlowingPurity;
  since "v5.2.0";
  cost DiceType.Aligned, 1;
  weapon catalyst {
    on enter {
      :characterStatus(BondOfLife, "@master");
    }
    on endPhase {
      :characterStatus(BondOfLife, "@master");
    }
    on beforeAction {
      when :( !:self.master.hasStatus(BondOfLife) );
      listenTo all;
      usage perRound, 1;
      :generateDice("randomElement", 1);
      :characterStatus(FlowingPurityInEffect, "@master");
    }
  }
}

/**
 * @id 311111
 * @name 不灭月华
 * @description
 * 所附属角色生命值至少为11时：造成的伤害+2。
 * 入场时：所附属角色获得1点最大生命值。
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311111 as EverlastingMoonglow;
  since "v6.1.0";
  cost DiceType.Aligned, 2;
  weapon catalyst {
    on increaseSkillDamage {
      when :( :self.master.health >= 11 );
      :e.increaseDamage(2);
    }
    on enter {
      :increaseMaxHealth(1, "@master");
    }
  }
}

/**
 * @id 301113
 * @name 祭星者之望（生效中）
 * @description
 * 每层使所附属角色下次造成的伤害+1。（可叠加，最多叠加到2）
 */
define status {
  id 301113 as StarcallersWatchInEffect;
  variable increaseDmg, 1 {
    append 2;
  };
  once increaseSkillDamage {
    :e.increaseDamage(:getVariable("increaseDmg"));
  }
}

/**
 * @id 311112
 * @name 祭星者之望
 * @description
 * 我方每回合首次打出名称不属于初始牌组的牌时：少花费1个元素骰，所附属角色下次造成的伤害+1。（可叠加，最多叠加到2）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311112 as StarcallersWatch;
  since "v6.3.0";
  cost DiceType.Aligned, 1;
  weapon catalyst {
    on deductOmniDiceCard {
      when :( !:isInInitialPile(:e.action.skill.caller) );
      usage perRound, 1;
      :e.deductOmniCost(1);
      :characterStatus(StarcallersWatchInEffect, "@master");
    }
  }
}
