import { card, combatStatus, DamageType, DiceType, skill, status, summon, type SkillHandle, type StatusHandle, type SummonHandle } from "@gi-tcg/core/builder";
import { VioletArc } from "../characters/electro/lisa.gts";
import { EremiteScorchingLoremaster, SearingGlare } from "../characters/pyro/eremite_scorching_loremaster.gts";
import { AwakenMyKindred, HeartOfOasis } from "../characters/dendro/guardian_of_apeps_oasis.gts";

/**
 * @id 114091
 * @name 引雷
 * @description
 * 此状态初始具有2层「引雷」；重复附属时，叠加1层「引雷」。「引雷」最多可以叠加到4层。
 * 结束阶段：叠加1层「引雷」。
 * 所附属角色受到苍雷伤害时：移除此状态，每层「引雷」使此伤害+1。
 */
define status {
  id 114091 as private Conductive;
  until "v5.0.0";
  variable conductive, 2 {
    append {
    limit 4;
    value 1;
  };
  };
  on endPhase {
    :addVariableWithMax("conductive", 1, 4);
  }
  on increaseDamaged {
    when :( :e.via.definition.id === VioletArc );
    :e.increaseDamage(:getVariable("conductive"));
    :dispose();
  }
}

/**
 * @id 14091
 * @name 指尖雷暴
 * @description
 * 造成1点雷元素伤害；
 * 如果此技能为重击，则使敌方出战角色附属引雷。
 */
define skill {
  id 14091 as private LightningTouch;
  until "v5.0.0";
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Electro, 1);
  if (:skillInfo.charged) {
    :characterStatus(Conductive, "opp active");
  }
}

/**
 * @id 123033
 * @name 炎之魔蝎·守势
 * @description
 * 厄灵·炎之魔蝎在场时：所附属角色受到的伤害-1。（每回合1次）
 */
define status {
  id 123033 as private PyroScorpionGuardianStance;
  until "v5.0.0";
  conflictWith 123034;
  on decreaseDamaged {
    when :( :$(`my summons with definition id ${SpiritOfOmenPyroScorpion01} or my summons with definition id ${SpiritOfOmenPyroScorpion}`) );
    usage perRound, 1;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 123034
 * @name 炎之魔蝎·守势
 * @description
 * 厄灵·炎之魔蝎在场时：所附属角色受到的伤害-1。（每回合至多2次）
 */
define status {
  id 123034 as private PyroScorpionGuardianStance01;
  until "v5.0.0";
  conflictWith 123033;
  on decreaseDamaged {
    when :( :$(`my summons with definition id ${SpiritOfOmenPyroScorpion01} or my summons with definition id ${SpiritOfOmenPyroScorpion}`) );
    usage perRound, 2;
    :e.decreaseDamage(1);
  }
}


/**
 * @id 123031
 * @name 厄灵·炎之魔蝎
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：2
 * 入场时和行动阶段开始：使我方镀金旅团·炽沙叙事人附属炎之魔蝎·守势。（厄灵·炎之魔蝎在场时每回合1次，使角色受到的伤害-1。）
 */
define summon {
  id 123031 as private SpiritOfOmenPyroScorpion;
  until "v5.0.0";
  conflictWith 123032;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Pyro, 1);
  }
  on enter {
    if (:$(`my equipment with definition id ${Scorpocalypse}`)) {
      :characterStatus(PyroScorpionGuardianStance01, "my character with definition id 2303");
    }
    else {
      :characterStatus(PyroScorpionGuardianStance, "my character with definition id 2303");
    }
  }
  on actionPhase {
    if (:$(`my equipment with definition id ${Scorpocalypse}`)) {
      :characterStatus(PyroScorpionGuardianStance01, "my character with definition id 2303");
    }
    else {
      :characterStatus(PyroScorpionGuardianStance, "my character with definition id 2303");
    }
  }
}

/**
 * @id 123032
 * @name 厄灵·炎之魔蝎
 * @description
 * 结束阶段：造成1点火元素伤害；如果本回合中镀金旅团·炽沙叙事人使用过「普通攻击」或「元素战技」，则此伤害+1。
 * 可用次数：2
 * 入场时和行动阶段开始：使我方镀金旅团·炽沙叙事人附属炎之魔蝎·守势。（厄灵·炎之魔蝎在场时每回合至多2次，使角色受到的伤害-1。）
 */
define summon {
  id 123032 as private SpiritOfOmenPyroScorpion01;
  until "v5.0.0";
  conflictWith 123031;
  hint DamageType.Pyro, "1";
  on endPhase {
    usage 2;
    if (:countOfSkill(EremiteScorchingLoremaster, SearingGlare) > 0 ||
      :countOfSkill(EremiteScorchingLoremaster, BlazingStrike) > 0) {
      :damage(DamageType.Pyro, 2);
    } else {
      :damage(DamageType.Pyro, 1);
    }
  }
  on enter {
    if (:$(`my equipment with definition id ${Scorpocalypse}`)) {
      :characterStatus(PyroScorpionGuardianStance01, "my character with definition id 2303");
    }
    else {
      :characterStatus(PyroScorpionGuardianStance, "my character with definition id 2303");
    }
  }
  on actionPhase {
    if (:$(`my equipment with definition id ${Scorpocalypse}`)) {
      :characterStatus(PyroScorpionGuardianStance01, "my character with definition id 2303");
    }
    else {
      :characterStatus(PyroScorpionGuardianStance, "my character with definition id 2303");
    }
  }
}

/**
 * @id 23032
 * @name 炎晶迸击
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 23032 as private BlazingStrike;
  until "v5.0.0";
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 23033
 * @name 厄灵苏醒·炎之魔蝎
 * @description
 * 造成2点火元素伤害，召唤厄灵·炎之魔蝎。
 */
define skill {
  id 23033 as private SpiritOfOmensAwakeningPyroScorpion;
  until "v5.0.0";
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 2);
  if (:self.hasEquipment(Scorpocalypse)) {
    :summon(SpiritOfOmenPyroScorpion01);
  }
  else {
    :summon(SpiritOfOmenPyroScorpion);
  }
}

/**
 * @id 23034
 * @name 厄灵之能
 * @description
 * 【被动】此角色受到伤害后：如果此角色生命值不多于7，则获得1点充能。（整场牌局限制1次）
 */
define skill {
  id 23034 as private SpiritOfOmensPower;
  until "v5.0.0";
  skillType passive {
    on damaged {
      when :( :self.health <= 7 );
      usage 1 {
        name "damagedEnergySkillUsage";
      };
      :gainEnergy(1, "@self");
    }
  }
}

/**
 * @id 223031
 * @name 魔蝎烈祸
 * @description
 * 战斗行动：我方出战角色为镀金旅团·炽沙叙事人时，装备此牌。
 * 镀金旅团·炽沙叙事人装备此牌后，立刻使用一次厄灵苏醒·炎之魔蝎。
 * 装备有此牌的镀金旅团·炽沙叙事人生成的厄灵·炎之魔蝎在镀金旅团·炽沙叙事人使用过「普通攻击」或「元素战技」的回合中，造成的伤害+1；
 * 厄灵·炎之魔蝎的减伤效果改为每回合至多2次。
 * （牌组中包含镀金旅团·炽沙叙事人，才能加入牌组）
 */
define card {
  id 223031 as private Scorpocalypse;
  until "v5.0.0";
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  talent EremiteScorchingLoremaster {
    on enter {
      :useSkill(SpiritOfOmensAwakeningPyroScorpion);
    }
  }
}

/**
 * @id 127028
 * @name 绿洲之庇护
 * @description
 * 提供2点护盾，保护所附属角色。
 */
define status {
  id 127028 as private OasissAegis;
  until "v5.0.0";
  shield 2;
}

/**
 * @id 27024
 * @name 增殖感召
 * @description
 * 【被动】战斗开始时，生成6张唤醒眷属，随机放入牌库。我方召唤4个增殖生命体后，此角色附属重燃的绿洲之心，并获得2点护盾。
 */
define skill {
  id 27024 as private InvokationOfPropagation;
  until "v5.0.0";
  skillType passive {
    variable organismCount, 0;
    on battleBegin {
      :createPileCards(AwakenMyKindred, 6, "random");
      :combatStatus(HeartOfOasis);
    }
  }
}
