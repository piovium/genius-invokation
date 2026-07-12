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

import { DiceType, card, status } from "@gi-tcg/core/builder";

/**
 * @id 311501
 * @name 旅行剑
 * @description
 * 角色造成的伤害+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311501 as TravelersHandySword;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  weapon sword {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 311502
 * @name 祭礼剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：生成1个此角色类型的元素骰。（每回合1次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311502 as SacrificialSword;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon sword {
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
 * @id 311503
 * @name 风鹰剑
 * @description
 * 角色造成的伤害+1。
 * 对方使用技能后：如果所附属角色为「出战角色」，则治疗该角色1点。（每回合至多2次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311503 as AquilaFavonia;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  weapon sword {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( !:e.skill.caller.isMine() && :self.master.isActive() );
      listenTo all;
      usage perRound, 2;
      :heal(1, "@master");
    }
  }
}

/**
 * @id 311504
 * @name 天空之刃
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311504 as SkywardBlade;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  weapon sword {
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
 * @id 311505
 * @name 西风剑
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」后：角色额外获得1点充能。（每回合1次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311505 as FavoniusSword;
  since "v3.6.0";
  cost DiceType.Aligned, 3;
  weapon sword {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 1;
      :gainEnergy(1, "@master");
    }
  }
}

/**
 * @id 311506
 * @name 裁叶萃光
 * @description
 * 角色造成的伤害+1。
 * 角色使用「普通攻击」后：生成1个随机基础元素骰。（每回合最多触发2次）
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311506 as LightOfFoliarIncision;
  since "v4.3.0";
  cost DiceType.Aligned, 3;
  weapon sword {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 2;
      :generateDice("randomElement", 1);
    }
  }
}

/**
 * @id 301107
 * @name 原木刀（生效中）
 * @description
 * 角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 */
define status {
  id 301107 as SapwoodBladeStatus;
  oneDuration;
  once useSkill {
    when :( :e.isSkillType("normal") );
    :generateDice(:self.master.element(), 2);
  }
}

/**
 * @id 311507
 * @name 原木刀
 * @description
 * 角色造成的伤害+1。
 * 入场时：所附属角色在本回合中，下次使用「普通攻击」后：生成2个此角色类型的元素骰。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311507 as SapwoodBlade;
  since "v4.4.0";
  cost DiceType.Void, 3;
  weapon sword {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on enter {
      :characterStatus(SapwoodBladeStatus, "@master");
    }
  }
}

/**
 * @id 311508
 * @name 静水流涌之辉
 * @description
 * 我方角色受到伤害或治疗后：此牌累积1点「湖光」。
 * 角色进行普通攻击时：如果已有12点「湖光」，则消耗12点，使此技能少花费2个无色元素且造成的伤害+1，并且治疗所附属角色1点（每回合1次）。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311508 as SplendorOfTranquilWaters;
  since "v4.7.0";
  cost DiceType.Aligned, 2;
  weapon sword {
    variable lake, 0;
    on damagedOrHealed {
      :addVariable("lake", 1);
    }
    on deductVoidDiceSkill {
      when :( :e.isSkillType("normal") && :getVariable("lake") >= 12 );
      usage perRound, 1;
      :e.deductVoidCost(2);
    }
    on increaseSkillDamage {
      when :( :e.viaSkillType("normal") && :getVariable("lake") >= 12 );
      usage perRound, 1;
      :addVariable("lake", -12);
      :e.increaseDamage(1);
      :heal(1, "@master");
    }
  }
}

/**
 * @id 133089
 * @name 天空之刀
 * @description
 * 角色造成的伤害+1。
 * 每回合1次：角色使用「普通攻击」造成的伤害额外+1。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 133089 as SkywardSword; // 骗骗花
  reserved;
}

/**
 * @id 311509
 * @name 船坞长剑
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张当前元素骰费用最高的手牌，以抵消1点伤害，然后累积1点「团结」。（每回合1次）
 * 角色造成伤害时：如果此牌已有「团结」，则消耗所有「团结」，使此伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「单手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311509 as TheDockhandsAssistant;
  since "v5.7.0";
  cost DiceType.Aligned, 2;
  weapon sword {
    tags barrier;
    variable barrierUsage, 0; // no io hint for now
    variable solidarity, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 1;
      :disposeMaxCostHands(1);
      :e.decreaseDamage(1);
      :addVariable("solidarity", 1);
    }
    on increaseSkillDamage {
      when :( :getVariable("solidarity") > 0 );
      :e.increaseDamage(1);
      :drawCards(:getVariable("solidarity"));
      :setVariable("solidarity", 0);
    }
  }
}
