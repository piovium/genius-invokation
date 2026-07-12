import { DamageType, DiceType, card, combatStatus, skill } from "@gi-tcg/core/builder";
import { BakeKurage, TamakushiCasket } from "../characters/hydro/sangonomiya_kokomi.gts";

/**
 * @id 322002
 * @name 凯瑟琳
 * @description
 * 我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
define card {
  id 322002 as private Katheryne;
  until "v3.5.0";
  cost DiceType.Void, 2;
  support ally {
    on beforeFastSwitch {
      usage perRound, 1;
      :e.setFastAction();
    }
  }
}

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成3点水元素伤害，本角色附属仪来羽衣。
 */
define skill {
  id 12053 as private NereidsAscension;
  until "v3.5.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 3);
  if (:self.hasEquipment(TamakushiCasket) && :$(`my summon with definition id ${BakeKurage}`)) {
    :summon(BakeKurage);
  }
}

/**
 * @id 112022
 * @name 虹剑势
 * @description
 * 我方角色普通攻击后：造成2点水元素伤害。
 * 可用次数：3
 */
define combatStatus {
  id 112022 as private RainbowBladework;
  until "v3.5.0";
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 3;
    :damage(DamageType.Hydro, 2);
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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
  until "v3.5.0";
  cost DiceType.Aligned, 3;
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

