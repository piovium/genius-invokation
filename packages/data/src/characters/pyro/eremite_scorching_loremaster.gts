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

import { card, character, combatStatus, DamageType, DiceType, skill, status, summon, type PassiveSkillHandle, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 123032
 * @name 魔蝎祝福
 * @description
 * 我方使用厄灵·炎之魔蝎的特技时：移除此效果，每有1层「魔蝎祝福」，就使此特技造成的伤害+1。
 * （「魔蝎祝福」的层数可叠加，没有上限）
 */
define combatStatus {
  id 123032 as ScorpionBlessing;
  variable blessing, 1 {
    append;
  };
  on increaseTechniqueDamage {
    when :( :e.via.definition.id === 1230311 );
    :e.increaseDamage(:getVariable("blessing"));
    :dispose();
  }
}

/**
 * @id 123031
 * @name 厄灵·炎之魔蝎
 * @description
 * 所附属角色受到伤害时：如可能，失去1点充能，以抵消1点伤害，然后生成魔蝎祝福。（每回合至多2次）
 * 特技：炙烧攻势
 * 可用次数：1
 * （角色最多装备1个「特技」）
 * [1230311: 炙烧攻势] (2*Aligned) 造成2点火元素伤害。
 * [1230312: ] ()
 */
define card {
  id 123031 as SpiritOfOmenPyroScorpion;
  since "v5.1.0";
  undiscoverable;
  technique {
    tags barrier;
    variable barrierUsage, 0; // no io hint for now
    on decreaseDamaged {
      when :( :self.master.energy > 0 );
      usage perRound, 2;
      :self.master.loseEnergy(1);
      :e.decreaseDamage(1);
      :combatStatus(ScorpionBlessing);
    }
    skill {
      id 1230311;
      cost DiceType.Aligned, 2;
      usage 1;
      :damage(DamageType.Pyro, 2);
    }
  }
}

/**
 * @id 23031
 * @name 烧蚀之光
 * @description
 * 造成1点火元素伤害。
 */
define skill {
  id 23031 as SearingGlare;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Pyro, 1);
}

/**
 * @id 23032
 * @name 炎晶迸击
 * @description
 * 造成3点火元素伤害，生成1层魔蝎祝福。
 */
define skill {
  id 23032 as BlazingStrike;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  :combatStatus(ScorpionBlessing);
}

/**
 * @id 23033
 * @name 厄灵苏醒·炎之魔蝎
 * @description
 * 造成3点火元素伤害。整场牌局限制1次，将1张厄灵·炎之魔蝎加入我方手牌。
 * （装备有厄灵·炎之魔蝎的角色可以使用特技：炙烧攻势）
 */
define skill {
  id 23033 as SpiritOfOmensAwakeningPyroScorpion;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 23034
 * @name 厄灵之能
 * @description
 * 【被动】此角色受到伤害后：如果此角色生命值不多于7，则获得1点充能。（每回合1次）
 */
define skill {
  id 23034 as SpiritOfOmensPower;
  skillType passive {
    on damaged {
      when :( :self.health <= 7 && :self.energy < :self.maxEnergy );
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :gainEnergy(1, "@self");
    }
    on useSkill {
      when :( :e.skill.definition.id === SpiritOfOmensAwakeningPyroScorpion );
      usage 1 {
        name "createCardUsage";
      };
      :createHandCard(SpiritOfOmenPyroScorpion);
    }
  }
}

/**
 * @id 2303
 * @name 镀金旅团·炽沙叙事人
 * @description
 * 如今仍然能记起许多故事的人，是不会背叛流淌在体内的沙漠血脉的。
 */
define character {
  id 2303 as EremiteScorchingLoremaster;
  since "v4.3.0";
  tags pyro, eremite;
  health 10;
  energy 2;
  skills SearingGlare, BlazingStrike, SpiritOfOmensAwakeningPyroScorpion, SpiritOfOmensPower;
}

/**
 * @id 223031
 * @name 魔蝎烈祸
 * @description
 * 战斗行动：我方出战角色为镀金旅团·炽沙叙事人时，装备此牌。
 * 镀金旅团·炽沙叙事人装备此牌后，立刻使用一次炎晶迸击。
 * 装备有此牌的镀金旅团·炽沙叙事人在场，我方使用炙烧攻势击倒敌方角色后：将1张厄灵·炎之魔蝎加入手牌。
 * 回合结束时：生成1层魔蝎祝福。
 * （牌组中包含镀金旅团·炽沙叙事人，才能加入牌组）
 */
define card {
  id 223031 as Scorpocalypse;
  since "v4.3.0";
  cost DiceType.Pyro, 3;
  talent EremiteScorchingLoremaster {
    on enter {
      :useSkill(BlazingStrike);
    }
    on defeated {
      when :( !:e.target.isMine() && :e.via.definition.id === 1230311 );
      listenTo all;
      :createHandCard(SpiritOfOmenPyroScorpion);
    }
    on roundEnd {
      :combatStatus(ScorpionBlessing);
    }
  }
}

/**
 * @id 123033
 * @name 炎之魔蝎·守势
 * @description
 * 厄灵·炎之魔蝎在场时：所附属角色受到的伤害-1。（每回合1次）
 */
define status {
  id 123033 as PyroScorpionGuardianStance01;
  tags barrier;
  reserved;
}

/**
 * @id 123034
 * @name 炎之魔蝎·守势
 * @description
 * 魔蝎祝福在场时：所附属角色受到的伤害-1。（每回合至多2次）
 */
define status {
  id 123034 as PyroScorpionGuardianStance;
  tags barrier;
  reserved;
}
