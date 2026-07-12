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

import { DiceType, card, combatStatus, status } from "@gi-tcg/core/builder";

/**
 * @id 311201
 * @name 鸦羽弓
 * @description
 * 角色造成的伤害+1。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311201 as RavenBow;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  weapon bow {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 311202
 * @name 祭礼弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311202 as SacrificialBow;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon bow {
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
 * @id 311203
 * @name 天空之翼
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311203 as SkywardHarp;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon bow {
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
 * @id 311204
 * @name 阿莫斯之弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用原本元素骰费用+充能费用至少为5的技能时，伤害额外+2。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311204 as AmosBow;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  weapon bow {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on increaseSkillDamage {
      when :( :e.via.definition.initiativeSkillConfig!.computed$costSize >= 5 );
      usage perRound, 1;
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 301102
 * @name 千年的大乐章·别离之歌
 * @description
 * 我方角色造成的伤害+1。
 * 持续回合：2
 */
define combatStatus {
  id 301102 as private MillennialMovementFarewellSong;
  duration 2;
  on increaseSkillDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 311205
 * @name 终末嗟叹之诗
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素爆发」后：生成「千年的大乐章·别离之歌」。（我方角色造成的伤害+1，持续回合：2）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311205 as ElegyForTheEnd;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  weapon bow {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( :e.isSkillType("burst") );
      :combatStatus(MillennialMovementFarewellSong);
    }
  }
}


/**
 * @id 301103
 * @name 王下近侍（生效中）
 * @description
 * 在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时：少花费2个元素骰。
 */
define status {
  id 301103 as KingsSquireStatus;
  oneDuration;
  once deductOmniDice {
    when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
    :e.deductOmniCost(2);
  }
}

/**
 * @id 311206
 * @name 王下近侍
 * @description
 * 角色造成的伤害+1。
 * 入场时：在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时，少花费2个元素骰。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311206 as KingsSquire;
  since "v4.0.0";
  cost DiceType.Aligned, 3;
  weapon bow {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on enter {
      :characterStatus(KingsSquireStatus, "@master");
    }
  }
}

/**
 * @id 311207
 * @name 竭泽
 * @description
 * 我方打出名称不存在于本局最初牌组中的行动牌后：此牌累积1点「渔猎」。（最多累积2点，每回合最多累积2点）
 * 角色使用技能时：如果此牌已有「渔猎」，则消耗所有「渔猎」，使此技能伤害+1，并且每消耗1点「渔猎」就抓1张牌。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311207 as EndOfTheLine;
  since "v4.7.0";
  cost DiceType.Aligned, 2;
  weapon bow {
    variable fishing, 0;
    variable additivePerRound, 0 {
      visible false;
    };
    on roundEnd {
      :setVariable("additivePerRound", 0);
    }
    on playCard {
      when :( !:isInInitialPile(:e.card) );
      if (:getVariable("additivePerRound") < 2) {
        :addVariableWithMax("fishing", 1, 2);
        :addVariable("additivePerRound", 1);
      }
    }
    on increaseSkillDamage {
      const fishing = :getVariable("fishing");
      if (fishing > 0) {
        :e.increaseDamage(1)
        :drawCards(fishing);
        :setVariable("fishing", 0);
      }
    }
  }
}

/**
 * @id 133092
 * @name 王下近待
 * @description
 * 角色造成的伤害+1。
 * 入场时：在本回合中，下次对角色打出「天赋」或角色使用「元素战技」时，少花费2个元素骰。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 133092 as KingsValet;
  reserved;
}

/**
 * @id 133093
 * @name 阿斯莫之弓
 * @description
 * 角色造成的伤害+1。
 * 角色使用原本元素骰费用+充能费用至少为5的技能时，伤害额外+2。（每回合1次）
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 133093 as AsmosBow; // 骗骗花
  reserved;
}

/**
 * @id 311208
 * @name 若水
 * @description
 * 所附属角色生命值至少为11时：造成的伤害+2。
 * 入场时：所附属角色获得1点最大生命值。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311208 as AquaSimulacra;
  since "v6.0.0";
  cost DiceType.Aligned, 2;
  weapon bow {
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
 * @id 311209
 * @name 罗网勾针
 * @description
 * 角色使用「元素爆发」造成的伤害+2。
 * 我方引发元素反应时：累计1层矫捷无影，当矫捷无影不低于2层时，消耗2层矫捷无影使所附属角色获得1点充能。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311209 as SnareHook;
  since "v6.5.0";
  cost DiceType.Void, 2;
  weapon bow {
    variable agile, 0;
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      :e.increaseDamage(2);
    }
    on dealReaction {
      listenTo samePlayer;
      :addVariable("agile", 1);
      if (:getVariable("agile") >= 2 && :self.master.energy < :self.master.maxEnergy) {
        :addVariable("agile", -2);
        :gainEnergy(1, :self.master);
      }
    }
  }
}
