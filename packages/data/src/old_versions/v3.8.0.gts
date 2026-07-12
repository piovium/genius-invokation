import { DamageType, DiceType, card, skill } from "@gi-tcg/core/builder";
import { VermillionHereafterEffect } from "../cards/equipment/artifacts.gts";

/**
 * @id 321003
 * @name 群玉阁
 * @description
 * 投掷阶段：2个元素骰初始总是投出我方出战角色类型的元素。
 */
define card {
  id 321003 as private JadeChamber;
  until "v3.8.0";
  cost DiceType.Aligned, 1;
  support place {
    on roll {
      :e.fixDice(:$("my active")!.element(), 2);
    }
  }
}


/**
 * @id 312101
 * @name 破冰踏雪的回音
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个冰元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312101 as private BrokenRimesEcho;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312201 as private WinestainedTricorne;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312301 as private WitchsScorchingHat;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312401 as private ThunderSummonersCrown;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312501 as private ViridescentVenerersDiadem;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312601 as private MaskOfSolitudeBasalt;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
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
  id 312701 as private LaurelCoronet;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductElementDice {
      when :( :e.isSkillOrTalentOf(:self.master) && :e.canDeductCostOfType(DiceType.Dendro) );
      usage perRound, 1;
      :e.deductCost(DiceType.Dendro, 1);
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
  id 312013 as private CapriciousVisage;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "elemental") );
      usage perRound, 1;
      :e.deductOmniCost(1);
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
  id 312011 as private ThunderingPoise;
  until "v3.8.0";
  cost DiceType.Aligned, 2;
  artifact {
    on deductOmniDice {
      when :( :e.isSkillOrTalentOf(:self.master, "normal") );
      usage perRound, 1;
      :e.deductOmniCost(1);
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
  id 312102 as private BlizzardStrayer;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312202 as private HeartOfDepth;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312302 as private CrimsonWitchOfFlames;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312402 as private ThunderingFury;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312502 as private ViridescentVenerer;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312602 as private ArchaicPetra;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
  id 312702 as private DeepwoodMemories;
  until "v3.8.0";
  cost DiceType.Void, 3;
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
 * @id 312012
 * @name 辰砂往生录
 * @description
 * 对角色打出「天赋」或角色使用「普通攻击」时：少花费1个元素骰。（每回合1次）
 * 角色被切换为「出战角色」后：本回合中，角色「普通攻击」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312012 as private VermillionHereafter;
  until "v3.8.0";
  cost DiceType.Aligned, 3;
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
 * @id 312014
 * @name 追忆之注连
 * @description
 * 对角色打出「天赋」或角色使用「元素战技」时：少花费1个元素骰。（每回合1次）
 * 如果角色具有至少2点充能，就使角色「普通攻击」和「元素战技」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312014 as private ShimenawasReminiscence;
  until "v3.8.0";
  cost DiceType.Aligned, 3;
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
 * @id 312007
 * @name 华饰之兜
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312007 as private OrnateKabuto;
  until "v3.8.0";
  cost DiceType.Void, 2;
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
 * 角色使用「元素爆发」造成的伤害+2。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312008 as private EmblemOfSeveredFate;
  until "v3.8.0";
  cost DiceType.Void, 3;
  artifact {
    on useSkill {
      when :( :e.skill.caller.id !== :self.master.id && :e.isSkillType("burst") );
      listenTo samePlayer;
      :gainEnergy(1, "@master");
    }
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 331803
 * @name 雷与永恒
 * @description
 * 将我方所有元素骰转换为当前出战角色的类型。
 * （牌组包含至少2个「稻妻」角色，才能加入牌组）
 */
define card {
  id 331803 as private ThunderAndEternity;
  until "v3.8.0";
  :convertDice(:$("my active")!.element(), "all");
}

/**
 * @id 332005
 * @name 本大爷还没有输！
 * @description
 * 本回合有我方角色被击倒，才能打出：
 * 生成1个万能元素，我方当前出战角色获得1点充能。
 */
define card {
  id 332005 as private IHaventLostYet;
  until "v3.8.0";
  filter :( :player.hasDefeated );
  :generateDice(DiceType.Omni, 1);
  :gainEnergy(1, "my active");
}
