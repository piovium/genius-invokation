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

import { $, DamageType, DiceType, Reaction, card, combatStatus, status } from "@gi-tcg/core/builder";
import { AdventureCompleted, BondOfLife, BurningFlame, EfficientSwitch } from "../../commons.gts";

/**
 * @id 312101
 * @name 破冰踏雪的回音
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个冰元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312101 as BrokenRimesEcho;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Cryo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Cryo, 1);
    }
  }
}

/**
 * @id 312201
 * @name 酒渍船帽
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个水元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312201 as WinestainedTricorne;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Hydro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Hydro, 1);
    }
  }
}

/**
 * @id 312301
 * @name 焦灼的魔女帽
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个火元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312301 as WitchsScorchingHat;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Pyro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Pyro, 1);
    }
  }
}

/**
 * @id 312401
 * @name 唤雷的头冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个雷元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312401 as ThunderSummonersCrown;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Electro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Electro, 1);
    }
  }
}

/**
 * @id 312501
 * @name 翠绿的猎人之冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个风元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312501 as ViridescentVenerersDiadem;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Anemo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Anemo, 1);
    }
  }
}

/**
 * @id 312601
 * @name 不动玄石之相
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个岩元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312601 as MaskOfSolitudeBasalt;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Geo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Geo, 1);
    }
  }
}

/**
 * @id 312701
 * @name 月桂的宝冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个草元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312701 as LaurelCoronet;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Dendro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Dendro, 1);
    }
  }
}

/**
 * @id 312102
 * @name 冰风迷途的勇士
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个冰元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出冰元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312102 as BlizzardStrayer;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Cryo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Cryo, 1);
    }
    on roll {
      :e.fixDice(DiceType.Cryo, 2);
    }
  }
}

/**
 * @id 312202
 * @name 沉沦之心
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个水元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出水元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312202 as HeartOfDepth;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Hydro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Hydro, 1);
    }
    on roll {
      :e.fixDice(DiceType.Hydro, 2);
    }
  }
}

/**
 * @id 312302
 * @name 炽烈的炎之魔女
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个火元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出火元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312302 as CrimsonWitchOfFlames;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Pyro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Pyro, 1);
    }
    on roll {
      :e.fixDice(DiceType.Pyro, 2);
    }
  }
}

/**
 * @id 312402
 * @name 如雷的盛怒
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个雷元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出雷元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312402 as ThunderingFury;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Electro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Electro, 1);
    }
    on roll {
      :e.fixDice(DiceType.Electro, 2);
    }
  }
}

/**
 * @id 312502
 * @name 翠绿之影
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个风元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出风元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312502 as ViridescentVenerer;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Anemo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Anemo, 1);
    }
    on roll {
      :e.fixDice(DiceType.Anemo, 2);
    }
  }
}

/**
 * @id 312602
 * @name 悠古的磐岩
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个岩元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出岩元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312602 as ArchaicPetra;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Geo) );
      usage perRound, 1;
      :e.deductCost(DiceType.Geo, 1);
    }
    on roll {
      :e.fixDice(DiceType.Geo, 2);
    }
  }
}

/**
 * @id 312702
 * @name 深林的记忆
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个草元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出草元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312702 as DeepwoodMemories;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Dendro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Dendro, 1);
    }
    on roll {
      :e.fixDice(DiceType.Dendro, 2);
    }
  }
}

/**
 * @id 312001
 * @name 冒险家头带
 * @description
 * 角色使用「普通攻击」后：治疗自身1点。（每回合至多3次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312001 as AdventurersBandana;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 3;
      :heal(1, "@master");
    }
  }
}

/**
 * @id 312002
 * @name 幸运儿银冠
 * @description
 * 角色使用「元素战技」后：治疗自身2点。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312002 as LuckyDogsSilverCirclet;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 1;
      :heal(2, "@master");
    }
  }
}

/**
 * @id 312003
 * @name 游医的方巾
 * @description
 * 角色使用「元素爆发」后：治疗所有我方角色1点。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312003 as TravelingDoctorsHandkerchief;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    on useSkill {
      when :( :e.isSkillType("burst") );
      usage perRound, 1;
      :heal(1, "all my characters");
    }
  }
}

/**
 * @id 312004
 * @name 赌徒的耳环
 * @description
 * 敌方角色被击倒后：如果所附属角色为「出战角色」，则生成2个万能元素。（整场牌局限制3次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312004 as GamblersEarrings;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    on defeated {
      when :( :self.master.isActive() && !:e.target.isMine() );
      listenTo all;
      usage 3 {
        autoDispose false;
      };
      :generateDice(DiceType.Omni, 2);
    }
  }
}

/**
 * @id 312005
 * @name 教官的帽子
 * @description
 * 角色引发元素反应后：生成1个此角色元素类型的元素骰。（每回合至多3次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312005 as InstructorsCap;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on useSkill {
      when :( :hasPhaseReaction("my") );
      usage perRound, 3;
      :generateDice(:self.master.element(), 1);
    }
  }
}

/**
 * @id 312006
 * @name 流放者头冠
 * @description
 * 角色使用「元素爆发」后：所有我方后台角色获得1点充能。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312006 as ExilesCirclet;
  since "v3.3.0";
  cost DiceType.Void, 2;
  artifact {
    on useSkill {
      when :( :e.isSkillType("burst") );
      usage perRound, 1;
      :gainEnergy(1, "my standby");
    }
  }
}

/**
 * @id 312007
 * @name 华饰之兜
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312007 as OrnateKabuto;
  since "v3.5.0";
  cost DiceType.Aligned, 1;
  artifact {
    on useSkill {
      when :( :e.skill.caller.id !== :self.master.id && :e.isSkillType("burst") );
      listenTo samePlayer;
      :gainEnergy(1, "@master");
    }
  }
}

/**
 * @id 312008
 * @name 绝缘之旗印
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * 角色使用「元素爆发」造成的伤害+2。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312008 as EmblemOfSeveredFate;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  artifact {
    on useSkill {
      when :( :e.skill.caller.id !== :self.master.id && :e.isSkillType("burst") );
      listenTo samePlayer;
      :gainEnergy(1, "@master");
    }
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      usage perRound, 1;
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 301201
 * @name 重嶂不移
 * @description
 * 提供2点护盾，保护所附属的角色。
 */
define status {
  id 301201 as UnmovableMountain;
  shield 2;
}

/**
 * @id 312009
 * @name 将帅兜鍪
 * @description
 * 行动阶段开始时：为角色附属「重嶂不移」。（提供2点护盾，保护该角色。）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312009 as GeneralsAncientHelm;
  since "v3.5.0";
  cost DiceType.Aligned, 2;
  artifact {
    on actionPhase {
      :characterStatus(UnmovableMountain, "@master");
    }
  }
}

/**
 * @id 312010
 * @name 千岩牢固
 * @description
 * 行动阶段开始时：为角色附属「重嶂不移」。（提供2点护盾，保护该角色。）
 * 角色受到伤害后：如果所附属角色为「出战角色」，则生成1个此角色元素类型的元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312010 as TenacityOfTheMillelith;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  artifact {
    on actionPhase {
      :characterStatus(UnmovableMountain, "@master");
    }
    on damaged {
      when :( :self.master.isActive() );
      usage perRound, 1;
      :generateDice(:self.master.element(), 1);
    }
  }
}

/**
 * @id 312011
 * @name 虺雷之姿
 * @description
 * 对角色打出「天赋」或角色使用「普通攻击」时：少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312011 as ThunderingPoise;
  since "v3.7.0";
  cost DiceType.Void, 2;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "normal") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 301203
 * @name 辰砂往生录（生效中）
 * @description
 * 本回合中，角色「普通攻击」造成的伤害+1。
 */
define status {
  id 301203 as VermillionHereafterEffect;
  oneDuration;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
}

/**
 * @id 312012
 * @name 辰砂往生录
 * @description
 * 对角色打出「天赋」或角色使用「普通攻击」时：少花费1个元素骰。（每回合1次）
 * 角色被切换为「出战角色」后：本回合中，角色「普通攻击」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312012 as VermillionHereafter;
  since "v3.7.0";
  cost DiceType.Void, 3;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "normal") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
    on switchActive {
      when :( :self.master.id === :e.switchInfo.to.id );
      :characterStatus(VermillionHereafterEffect, "@master");
    }
  }
}

/**
 * @id 312013
 * @name 无常之面
 * @description
 * 对角色打出「天赋」或角色使用「元素战技」时：少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312013 as CapriciousVisage;
  since "v3.7.0";
  cost DiceType.Void, 2;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 312014
 * @name 追忆之注连
 * @description
 * 对角色打出「天赋」或角色使用「元素战技」时：少花费1个元素骰。（每回合1次）
 * 如果角色具有至少2点充能，就使角色「普通攻击」和「元素战技」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312014 as ShimenawasReminiscence;
  since "v3.7.0";
  cost DiceType.Void, 3;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
    on increaseSkillDamage {
      when :( :self.master.energy >= 2 &&
          (:e.viaSkillType("normal") || :e.viaSkillType("elemental")) );
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 312015
 * @name 海祇之冠
 * @description
 * 我方角色每受到3点治疗，此牌就累积1个「海染泡沫」。（最多累积2个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗1个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 * 【此卡含描述变量】
 */
define card {
  id 312015 as CrownOfWatatsumi;
  since "v4.1.0";
  cost DiceType.Aligned, 1;
  artifact {
    variable healedPts, 0 {
      visible false;
    };
    variable bubble, 0;
    replaceDescription "[GCG_TOKEN_SHIELD]", ((_, self) => self.variables.healedPts);
    on healed {
      listenTo samePlayer;
      :addVariable("healedPts", :e.value);
      const totalPts = :getVariable("healedPts");
      const generatedBubbleCount = Math.floor(totalPts / 3);
      const restPts = totalPts % 3;
      :addVariableWithMax("bubble", generatedBubbleCount, 2);
      :setVariable("healedPts", restPts);
    }
    on increaseSkillDamage {
      const bubbleCount = :getVariable("bubble");
      :setVariable("bubble", 0);
      :e.increaseDamage(bubbleCount);
    }
  }
}

/**
 * @id 312016
 * @name 海染砗磲
 * @description
 * 入场时：治疗所附属角色2点。
 * 我方角色每受到3点治疗，此牌就累积1个「海染泡沫」。（最多累积2个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗1个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 * 【此卡含描述变量】
 */
define card {
  id 312016 as OceanhuedClam;
  since "v4.2.0";
  cost DiceType.Void, 3;
  artifact {
    variable healedPts, 0 {
      visible false;
    };
    variable bubble, 0;
    replaceDescription "[GCG_TOKEN_SHIELD]", ((_, self) => self.variables.healedPts);
    on enter {
      :heal(2, "@master");
    }
    on healed {
      listenTo samePlayer;
      :addVariable("healedPts", :e.value);
      const totalPts = :getVariable("healedPts");
      const generatedBubbleCount = Math.floor(totalPts / 3);
      const restPts = totalPts % 3;
      :addVariableWithMax("bubble", generatedBubbleCount, 2);
      :setVariable("healedPts", restPts);
    }
    on increaseSkillDamage {
      const bubbleCount = :getVariable("bubble");
      :setVariable("bubble", 0);
      :e.increaseDamage(bubbleCount);
    }
  }
}

/**
 * @id 312017
 * @name 沙王的投影
 * @description
 * 入场时：抓1张牌。
 * 所附属角色为出战角色期间，敌方受到元素反应伤害时：抓1张牌。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312017 as ShadowOfTheSandKing;
  since "v4.2.0";
  cost DiceType.Aligned, 1;
  artifact {
    on enter {
      :drawCards(1);
    }
    on damaged {
      when :( !:e.target.isMine() && :self.master.isActive() && :e.getReaction() );
      listenTo all;
      usage perRound, 1;
      :drawCards(1);
    }
  }
}

/**
 * @id 312018
 * @name 饰金之梦
 * @description
 * 入场时：生成1个所附属角色类型的元素骰。如果我方队伍中存在3种不同元素类型的角色，则改为生成2个。
 * 所附属角色为出战角色期间，敌方受到元素反应伤害时：抓1张牌。（每回合至多2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312018 as GildedDreams;
  since "v4.3.0";
  cost DiceType.Aligned, 3;
  artifact {
    on enter {
      const diceType = :self.master.element();
      const elementKinds = new Set(:$$("my characters include defeated").map((ch) => ch.element()));
      if (elementKinds.size >= 3) {
        :generateDice(diceType, 2);
      } else {
        :generateDice(diceType, 1);
      }
    }
    on damaged {
      when :( !:e.target.isMine() && :self.master.isActive() && :e.getReaction() );
      listenTo all;
      usage perRound, 2;
      :drawCards(1);
    }
  }
}

/**
 * @id 312019
 * @name 浮溯之珏
 * @description
 * 角色使用「普通攻击」后：抓1张牌。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312019 as FlowingRings;
  since "v4.3.0";
  artifact {
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 1;
      :drawCards(1);
    }
  }
}

/**
 * @id 312020
 * @name 来歆余响
 * @description
 * 角色使用「普通攻击」后：抓1张牌。（每回合1次）
 * 角色使用技能后：如果我方元素骰数量不多于手牌数量，则生成1个所附属角色类型的元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312020 as EchoesOfAnOffering;
  since "v4.3.0";
  cost DiceType.Aligned, 2;
  artifact {
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 1;
      :drawCards(1);
    }
    on useSkill {
      when :( :player.dice.length <= :player.hands.length );
      usage perRound, 1;
      :generateDice(:self.master.element(), 1);
    }
  }
}

/**
 * @id 312021
 * @name 灵光明烁之心
 * @description
 * 角色受到伤害后：如果所附属角色为「出战角色」，则抓1张牌。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312021 as HeartOfKhvarenasBrilliance;
  since "v4.3.0";
  artifact {
    on damaged {
      when :( :self.master.isActive() );
      usage perRound, 1;
      :drawCards(1);
    }
  }
}

/**
 * @id 312022
 * @name 花海甘露之光
 * @description
 * 角色受到伤害后：如果所附属角色为「出战角色」，则抓1张牌，并且在本回合结束阶段中治疗所附属角色1点。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312022 as VourukashasGlow;
  since "v4.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    variable shouldHeal, 0;
    on damaged {
      when :( :self.master.isActive() );
      usage perRound, 1;
      :addVariable("shouldHeal", 1);
      :drawCards(1);
    }
    on endPhase {
      when :( :getVariable("shouldHeal") );
      :heal(1, "@master");
      :setVariable("shouldHeal", 0);
    }
  }
}

/**
 * @id 312023
 * @name 老兵的容颜
 * @description
 * 角色受到伤害或治疗后：根据本回合触发此效果的次数，执行不同的效果。
 * 第1次触发：生成1个此角色类型的元素骰。
 * 第2次触发：抓1张牌。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312023 as VeteransVisage;
  since "v4.4.0";
  cost DiceType.Void, 2;
  artifact {
    variable count, 0;
    on roundEnd {
      :setVariable("count", 0);
    }
    on damagedOrHealed {
      if (:getVariable("count") < 2) {
        :addVariable("count", 1);
        const v = :getVariable("count");
        if (v === 1) {
          :generateDice(:self.master.element(), 1);
        } else if (v === 2) {
          :drawCards(1);
        }
      }
    }
  }
}

/**
 * @id 312025
 * @name 黄金剧团的奖赏
 * @description
 * 结束阶段：如果所附属角色在后台，则此牌累积1点「报酬」。（最多累积2点）
 * 对角色打出「天赋」或角色使用「元素战技」时：此牌每有1点「报酬」，就将其消耗，以少花费1个元素骰。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312025 as GoldenTroupesReward;
  since "v4.5.0";
  artifact {
    variable reward, 0;
    on endPhase {
      when :( !:self.master.isActive() );
      :addVariableWithMax("reward", 1, 2);
    }
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
      const reward = :getVariable("reward");
      const currentCost = :e.costSize();
      const deduced = Math.min(reward, currentCost);
      :e.deductOmniCost(deduced);
      :addVariable("reward", -deduced);
    }
  }
}

/**
 * @id 301209
 * @name 紫晶的花冠（生效中）
 * @description
 * 本回合内下次我方引发元素反应时伤害额外+2。
 */
define combatStatus {
  id 301209 as AmethystCrownInEffect;
  oneDuration;
  once increaseDamage {
    when :( :e.getReaction() );
    :e.increaseDamage(2);
  }
}

/**
 * @id 312027
 * @name 紫晶的花冠
 * @description
 * 敌方受到伤害后：如果此伤害是草元素伤害或发生了草元素相关反应，则累积1枚「花冠水晶」。（最多叠加到2）
 * 行动阶段开始时：如果「花冠水晶」数量为2，则本回合内下次我方引发元素反应时伤害额外+2。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312027 as AmethystCrown;
  since "v4.6.0";
  cost DiceType.Aligned, 0;
  artifact {
    variable crystal, 0;
    on damaged {
      when :( :getVariable("crystal") < 2 &&
          !:e.target.isMine() &&
          (:e.type === DamageType.Dendro || :e.isReactionRelatedTo(DamageType.Dendro)) );
      listenTo all;
      :addVariableWithMax("crystal", 1, 2);
    }
    on actionPhase {
      when :( :getVariable("crystal") === 2 );
      :combatStatus(AmethystCrownInEffect);
    }
  }
}

/**
 * @id 312024
 * @name 逐影猎人
 * @description
 * 角色受到伤害或治疗后：根据本回合触发此效果的次数，执行不同的效果。
 * 第1次触发：生成1个此角色类型的元素骰。
 * 第2次触发：抓1张牌。
 * 第4次触发：生成1个此角色类型的元素骰。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312024 as MarechausseeHunter;
  since "v4.7.0";
  cost DiceType.Void, 3;
  artifact {
    variable count, 0;
    on roundEnd {
      :setVariable("count", 0);
    }
    on damagedOrHealed {
      if (:getVariable("count") < 4) {
        :addVariable("count", 1);
        const v = :getVariable("count");
        if (v === 1 || v === 4) {
          :generateDice(:self.master.element(), 1);
        } else if (v === 2) {
          :drawCards(1)
        }
      }
    }
  }
}

/**
 * @id 312026
 * @name 黄金剧团
 * @description
 * 结束阶段：如果所附属角色在后台，则此牌累积2点「报酬」。（最多累积4点）
 * 对角色打出「天赋」或角色使用「元素战技」时：此牌每有1点「报酬」，就将其消耗，以少花费1个元素骰。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312026 as GoldenTroupe;
  since "v4.7.0";
  cost DiceType.Aligned, 2;
  artifact {
    variable reward, 0;
    on endPhase {
      when :( !:self.master.isActive() );
      :addVariableWithMax("reward", 2, 4);
    }
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
      const reward = :getVariable("reward");
      const currentCost = :e.costSize();
      const deduced = Math.min(reward, currentCost);
      :e.deductOmniCost(deduced);
      :addVariable("reward", -deduced);
    }
  }
}

/**
 * @id 312028
 * @name 乐园遗落之花
 * @description
 * 敌方受到伤害后：如果此伤害是草元素伤害或发生了草元素相关反应，则累积1枚「花冠水晶」。（最多叠加到5）
 * 行动阶段开始或我方触发元素反应时：如果「花冠水晶」数量为5，则生成1个万能元素，并抓1张牌。（每回合2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312028 as FlowerOfParadiseLost;
  since "v4.7.0";
  cost DiceType.Aligned, 2;
  artifact {
    variable crystal, 0;
    on damaged {
      when :( :getVariable("crystal") < 5 &&
          !:e.target.isMine() &&
          (:e.type === DamageType.Dendro || :e.isReactionRelatedTo(DamageType.Dendro)) );
      listenTo all;
      :addVariable("crystal", 1);
    }
    on actionPhase {
      when :( :getVariable("crystal") === 5 );
      :generateDice(DiceType.Omni, 1);
      :drawCards(1);
    }
    on reaction {
      when :( :getVariable("crystal") === 5 && :e.caller.isMine() );
      listenTo all;
      usage perRound, 1;
      :generateDice(DiceType.Omni, 1);
      :drawCards(1);
    }
  }
}

/**
 * @id 312029
 * @name 角斗士的凯旋
 * @description
 * 角色使用「普通攻击」时：如果我方手牌数量不多于2，则少消耗1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312029 as GladiatorsTriumphus;
  since "v4.8.0";
  artifact {
    on deductOmniDiceSkill {
      when :( :e.isSkillType("normal") && :player.hands.length <= 2 );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 133086
 * @name 千岩牢固
 * @description
 * 行动阶段开始时：为角色附属「重嶂不移」。（提供2点护盾，保护该角色。）
 * 角色受到伤害后：如果所附属角色为「出战角色」，则生成1个此角色元素类型的元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 133086 as FakeTenacityOfTheMillelith; // 骗骗花
  reserved;
}

/**
 * @id 133095
 * @name 饰金之梦
 * @description
 * 入场时：生成1个所附属角色类型的元素骰。如果我方队伍中存在3种不同元素类型的角色，则改为生成2个。
 * 所附属角色为出战角色期间，敌方受到元素反应伤害时：抓1张牌。（每回合至多2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 133095 as FakeGildedDreams; // 骗骗花
  reserved;
}

/**
 * @id 301204
 * @name 指挥的礼帽（生效中）
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个元素骰。
 * 可用次数：1
 */
define status {
  id 301204 as ConductorsTopHatInEffect;
  on deductOmniDice {
    when :( :e.isSkillOrTalentOf(:self.master) );
    usage 1;
    :e.deductOmniCost(1);
  }
}

/**
 * @id 312030
 * @name 指挥的礼帽
 * @description
 * 我方切换到所附属角色后：舍弃1张当前元素骰费用最高的手牌，将2个元素骰转换为万能元素，并使角色下次使用技能或打出「天赋」时少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312030 as ConductorsTopHat;
  since "v5.1.0";
  cost DiceType.Aligned, 1;
  artifact {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.master.id && :player.hands.length > 0 );
      usage perRound, 1;
      :disposeMaxCostHands(1);
      :convertDice(DiceType.Omni, 2);
      :characterStatus(ConductorsTopHatInEffect, "@master");
    }
  }
}

/**
 * @id 312031
 * @name 少女易逝的芳颜
 * @description
 * 附属角色受到圣遗物以外的治疗后：治疗我方受伤最多的角色1点。（每回合至多触发2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312031 as MaidensFadingBeauty;
  since "v5.2.0";
  cost DiceType.Aligned, 1;
  artifact {
    on healed {
      when :( !(:e.source.definition.type === "equipment" && :e.source.definition.tags.includes("artifact")) );
      usage perRound, 2;
      :heal(1, "my characters order by health - maxHealth limit 1");
    }
  }
}

/**
 * @id 312032
 * @name 魔战士的羽面
 * @description
 * 附属角色使用特技后：获得1点充能。（每回合1次)
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312032 as DemonwarriorsFeatherMask;
  since "v5.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    on useTechnique {
      usage perRound, 1;
      :gainEnergy(1, "@master");
    }
  }
}

/**
 * @id 301205
 * @name 诸圣的礼冠（生效中）
 * @description
 * 该角色下次技能或特技技能造成伤害+1。
 */
define status {
  id 301205 as CrownOfTheSaintsInEffect;
  on increaseSkillDamage {
    :e.increaseDamage(1);
    :dispose();
  }
  on increaseTechniqueDamage {
    :e.increaseDamage(1);
    :dispose();
  }
}

/**
 * @id 312033
 * @name 诸圣的礼冠
 * @description
 * 附属角色消耗「夜魂值」后：该角色下次技能或特技造成伤害+1。（每回合2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312033 as CrownOfTheSaints;
  since "v5.7.0";
  cost DiceType.Aligned, 1;
  artifact {
    on consumeNightsoul {
      usage perRound, 2;
      :characterStatus(CrownOfTheSaintsInEffect, "@master");
    }
  }
}

/**
 * @id 312034
 * @name 烬城勇者绘卷
 * @description
 * 附属角色消耗「夜魂值」后：使我方充能未满的一个角色获得1点充能，重复1次。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312034 as ScrollOfTheHeroOfCinderCity;
  since "v5.7.0";
  cost DiceType.Void, 3;
  artifact {
    on consumeNightsoul {
      usage perRound, 1;
      :gainEnergy(1, "my characters with energy < maxEnergy limit 1");
      :gainEnergy(1, "my characters with energy < maxEnergy limit 1");
    }
  }
}

/**
 * @id 301206
 * @name 失冕的宝冠（生效中）
 * @description
 * 每层使所附属角色下次受到的伤害+1。（可叠加，没有上限）
 */
define status {
  id 301206 as CrownlessCrownInEffect;
  variable layer, 1 {
    append;
  };
  once increaseDamaged {
    :e.increaseDamage(:getVariable("layer"));
  }
}

/**
 * @id 312035
 * @name 失冕的宝冠
 * @description
 * 我方触发燃烧反应后：敌方当前出战角色下次受到的伤害+1。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312035 as CrownlessCrown;
  since "v5.8.0";
  artifact {
    on reaction {
      when :( :e.caller.isMine() &&
          :e.type === Reaction.Burning );
      listenTo all;
      usage perRound, 1;
      :characterStatus(CrownlessCrownInEffect, "opp characters with health > 0 limit 1");
    }
  }
}

/**
 * @id 312036
 * @name 异想零落的圆舞
 * @description
 * 附属角色使用技能后：双方出战角色附属1层生命之契。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312036 as WhimsicalDanceOfTheWithered;
  since "v5.8.0";
  artifact {
    on useSkill {
      usage perRound, 1;
      :characterStatus(BondOfLife, "my active or opp active");
    }
  }
}

/**
 * @id 301208
 * @name 宗室面具（生效中）
 * @description
 * 本回合内，所附属角色造成的伤害+1。
 */
define status {
  id 301208 as RoyalMasqueInEffect;
  oneDuration;
  on increaseDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 312037
 * @name 宗室面具
 * @description
 * 附属角色使用元素爆发后：我方下一个角色本回合内造成的伤害+1。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312037 as RoyalMasque;
  since "v6.0.0";
  artifact {
    on useSkill {
      when :( :e.isSkillType("burst") && :$("my next") );
      usage perRound, 1;
      :characterStatus(RoyalMasqueInEffect, "my next");
    }
  }
}

/**
 * @id 312038
 * @name 未竟的遐思
 * @description
 * 我方燃烧烈焰以及造成的燃烧反应伤害+1。（每回合2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312038 as UnfinishedReverie;
  since "v6.0.0";
  cost DiceType.Aligned, 2;
  artifact {
    on increaseDamage {
      when :( :e.getReaction() === Reaction.Burning ||
          :e.source.definition.id === BurningFlame );
      listenTo samePlayer;
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 301207
 * @name 谐律异想断章（生效中）
 * @description
 * 角色使用技能时少花费1个元素骰。
 */
define combatStatus {
  id 301207 as HarmoniousSymphonyPreludeInEffect;
  once deductOmniDiceSkill {
    :e.deductOmniCost(1);
  }
}

/**
 * @id 312039
 * @name 谐律异想断章
 * @description
 * 附属角色使用技能后：我方所有角色附属1层生命之契，下次我方角色使用技能时少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312039 as FragmentOfHarmonicWhimsy;
  since "v6.0.0";
  cost DiceType.Aligned, 2;
  artifact {
    on useSkill {
      usage perRound, 1;
      :characterStatus(BondOfLife, "my characters");
      :combatStatus(HarmoniousSymphonyPreludeInEffect);
    }
  }
}

/**
 * @id 312040
 * @name 恶龙的单片镜
 * @description
 * 附属角色使用「元素战技」后：冒险1次。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312040 as FellDragonsMonocle;
  since "v6.1.0";
  cost DiceType.Aligned, 1;
  artifact {
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 1;
      :adventure();
    }
  }
}

/**
 * @id 301210
 * @name 昔日宗室之仪（生效中）
 * @description
 * 我方角色造成的伤害+1。
 * 可用次数：3
 */
define combatStatus {
  id 301210 as NoblesseObligeInEffect;
  on increaseSkillDamage {
    usage 3;
    :e.increaseDamage(1);
  }
}

/**
 * @id 312041
 * @name 昔日宗室之仪
 * @description
 * 入场时：使所附属角色获得1点充能。
 * 所附属角色使用「元素爆发」后：我方角色下3次造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312041 as NoblesseOblige;
  since "v6.1.0";
  cost DiceType.Void, 3;
  artifact {
    on enter {
      :gainEnergy(1, "@master");
    }
    on useSkill {
      when :( :e.isSkillType("burst") );
      :combatStatus(NoblesseObligeInEffect);
    }
  }
}

/**
 * @id 312043
 * @name 水仙之梦
 * @description
 * 附属角色使用技能后：冒险1次。（每回合2次）
 * 如果我方已经完成过冒险，则所附属角色造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312043 as NymphsDream;
  since "v6.2.0";
  cost DiceType.Aligned, 2;
  artifact {
    on useSkill {
      usage perRound, 2;
      :adventure();
    }
    on increaseSkillDamage {
      when :( :$(`my combat status with definition id ${AdventureCompleted}`) );
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 312044
 * @name 被浸染的缨盔
 * @description
 * 附属角色重击时：造成的伤害+1。（每回合1次）
 * 附属角色下落攻击后：生成1层高效切换。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312044 as DyedTassel;
  since "v6.3.0";
  cost DiceType.Void, 2;
  artifact {
    on increaseSkillDamage {
      when :( :e.viaChargedAttack() );
      usage perRound, 1;
      :e.increaseDamage(1);
    }
    on useSkill {
      when :( :e.isPlungingAttack() );
      usage perRound, 1;
      :combatStatus(EfficientSwitch);
    }
  }
}

/**
 * @id 312045
 * @name 角斗士的终幕礼
 * @description
 * 附属角色造成的物理伤害+1。
 * 我方仅附属角色未被击倒时：附属角色的「普通攻击」少花费1个无色元素，并且造成的伤害+1。（每回合2次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312045 as GladiatorsFinale;
  since "v6.6.0";
  cost DiceType.Void, 2;
  artifact {
    on increaseSkillDamage {
      when :( :e.type === DamageType.Physical );
      :e.increaseDamage(1);
    }
    on deductVoidDiceSkill {
      when :( :queryAll($.my.character).length === 1 && :e.isSkillType("normal") );
      :e.deductVoidCost(1);
    }
    on increaseDamage {
      when :( :queryAll($.my.character).length === 1 && :e.viaSkillType("normal") );
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}
