import { DamageType, DiceType, type StatusHandle, type SummonHandle, card, character, combatStatus, flip, skill, status, summon } from "@gi-tcg/core/builder";
import { MeleeStance, RangedStance, Tartaglia } from "../characters/hydro/tartaglia.gts";
import { GardenOfPurity, KamisatoArtKyouka, KamisatoArtMarobashi, KyoukaFuushi } from "../characters/hydro/kamisato_ayato.gts";
import { FatuiCryoCicinMage } from "../characters/cryo/fatui_cryo_cicin_mage.gts";
import { Diona, IcyPaws } from "../characters/cryo/diona.gts";
import { RainbowBladework } from "../characters/hydro/xingqiu.gts";
import { ReviveOnCooldown } from "../cards/event/food.gts";
import { Satiated } from "../commons.gts";


/**
 * @id 12042
 * @name 魔王武装·狂澜
 * @description
 * 切换为近战状态，然后造成2点水元素伤害。
 */
define skill {
  id 12042 as private FoulLegacyRagingTide;
  until "v4.0.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  :characterStatus(MeleeStance);
  :damage(DamageType.Hydro, 2);
}

/**
 * @id 112043
 * @name 断流
 * @description
 * 所附属角色被击倒后：对所在阵营的出战角色附属「断流」。
 * （处于「近战状态」的达达利亚攻击所附属角色时，会造成额外伤害。）
 * 持续回合：2
 */
define status {
  id 112043 as private Riptide;
  until "v4.0.0";
  duration 2;
}

/**
 * @id 12043
 * @name 极恶技·尽灭闪
 * @description
 * 依据达达利亚当前所处的状态，进行不同的攻击：
 * 远程状态·魔弹一闪：造成4点水元素伤害，返还2点充能，目标角色附属断流。
 * 近战状态·尽灭水光：造成7点水元素伤害。
 */
define skill {
  id 12043 as private HavocObliteration;
  until "v4.0.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  if (:self.hasStatus(RangedStance)) {
    :damage(DamageType.Hydro, 4);
    :self.gainEnergy(2);
    :characterStatus(Riptide, "opp active");
  } else {
    :damage(DamageType.Hydro, 7);
  }
}

/**
 * @id 212041
 * @name 深渊之灾·凝水盛放
 * @description
 * 战斗行动：我方出战角色为达达利亚时，装备此牌。
 * 达达利亚装备此牌后，立刻使用一次魔王武装·狂澜。
 * 结束阶段：对所有附属有断流的敌方角色造成1点穿透伤害。
 * （牌组中包含达达利亚，才能加入牌组）
 */
define card {
  id 212041 as private AbyssalMayhemHydrospout;
  until "v4.0.0";
  cost DiceType.Hydro, 4;
  talent Tartaglia {
    on enter {
      :useSkill(FoulLegacyRagingTide);
    }
    on endPhase {
      when :( :$(`opp character has status with definition id ${Riptide}`) );
      :damage(DamageType.Piercing, 1, `opp character has status with definition id ${Riptide}`);
    }
  }
}

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：2
 */
define status {
  id 112061 as private TakimeguriKanka;
  until "v4.0.0";
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 2;
    :e.increaseDamage(1);
    if (:self.master.hasEquipment(KyoukaFuushi) && :e.target.health <= 6) {
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 12063
 * @name 神里流·水囿
 * @description
 * 造成3点水元素伤害，召唤清净之园囿。
 */
define skill {
  id 12063 as private KamisatoArtSuiyuu;
  until "v4.0.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Hydro, 3);
  :summon(GardenOfPurity);
}

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
define character {
  id 1206 as private KamisatoAyato;
  until "v4.0.0";
  tags hydro, sword, inazuma;
  health 10;
  energy 3;
  skills KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu;
}

/**
 * @id 121011
 * @name 冰萤
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2（可叠加，最多叠加到3次）
 * 
 * 愚人众·冰萤术士「普通攻击」后：此牌可用次数+1。
 * 我方角色受到发生元素反应的伤害后：此牌可用次数-1。
 */
define summon {
  id 121011 as private CryoCicins;
  until "v4.0.0";
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2 {
      append 3;
    };
    :damage(DamageType.Cryo, 1);
  }
  on useSkill {
    when :( :e.skill.caller.definition.id === FatuiCryoCicinMage && :e.isSkillType("normal") );
    :addVariable("usage", 1);
  }
  on damaged {
    when :( :e.getReaction() );
    :consumeUsage();
  }
}

/**
 * @id 211021
 * @name 猫爪冰摇
 * @description
 * 战斗行动：我方出战角色为迪奥娜时，装备此牌。
 * 迪奥娜装备此牌后，立刻使用一次猫爪冻冻。
 * 装备有此牌的迪奥娜生成的猫爪护盾，所提供的护盾值+1。
 * （牌组中包含迪奥娜，才能加入牌组）
 */
define card {
  id 211021 as private ShakenNotPurred;
  until "v4.0.0";
  cost DiceType.Cryo, 4;
  talent Diona {
    on enter {
      :useSkill(IcyPaws);
    }
  }
}

/**
 * @id 12023
 * @name 裁雨留虹
 * @description
 * 造成1点水元素伤害，本角色附着水元素，生成虹剑势。
 */
define skill {
  id 12023 as private Raincutter;
  until "v4.0.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 1);
  :apply(DamageType.Hydro, "@self");
  :combatStatus(RainbowBladework);
}

/**
 * @id 323002
 * @name 便携营养袋
 * @description
 * 入场时：从牌组中随机抽取1张「料理」事件。
 * 我方打出「料理」事件牌时：从牌组中随机抽取1张「料理」事件牌。（每回合1次）
 */
define card {
  id 323002 as private Nre;
  until "v4.0.0";
  cost DiceType.Void, 2;
  support item {
    on enter {
      :drawCards(1, { withTag: "food" });
    }
    on playCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 1;
      :drawCards(1, { withTag: "food" });
    }
  }
}

/**
 * @id 333009
 * @name 提瓦特煎蛋
 * @description
 * 复苏目标角色，并治疗此角色1点。
 * （每回合中，最多通过「料理」复苏1个角色，并且每个角色最多食用1次「料理」）
 */
const TeyvatFriedEgg = card(333009)
  .until("v4.0.0")
  .costSame(3)
  .tags("food")
  .filter((c) => !c.$(`my combat status with definition id ${ReviveOnCooldown}`))
  .addTarget("my defeated characters")
  .heal(1, "@targets.0", { kind: "revive" })
  .characterStatus(Satiated, "@targets.0")
  .combatStatus(ReviveOnCooldown)
  .done();

/**
 * @id 322016
 * @name 迪娜泽黛
 * @description
 * 打出「伙伴」支援牌时：少花费1个元素骰。（每回合1次）
 */
define card {
  id 322016 as private Dunyarzad;
  until "v4.0.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("ally") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 322005
 * @name 卯师傅
 * @description
 * 打出「料理」事件牌后：生成1个随机基础元素骰。（每回合1次）
 */
define card {
  id 322005 as private ChefMao;
  until "v4.0.0";
  cost DiceType.Aligned, 1;
  support ally {
    on playCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 1;
      :generateDice("randomElement", 1);
    }
  }
}

/**
 * @id 332010
 * @name 诸武精通
 * @description
 * 将一个装备在我方角色的「武器」装备牌，转移给另一个武器类型相同的我方角色。
 */
const MasterOfWeaponry = card(332010)
  .until("v4.0.0")
  .addTarget("my character has equipment with tag (weapon)")
  .addTarget("my character with tag weapon of (@targets.0) and not @targets.0")
  .do((c, e) => {
    const weapon = e.targets[0].hasWeapon()!;
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    c.moveEntity(weapon, area);
  })
  .done();

/**
 * @id 332011
 * @name 神宝迁宫祝词
 * @description
 * 将一个装备在我方角色的「圣遗物」装备牌，转移给另一个我方角色。
 */
const BlessingOfTheDivineRelicsInstallation = card(332011)
  .until("v4.0.0")
  .addTarget("my character has equipment with tag (artifact)")
  .addTarget("my character and not @targets.0")
  .do((c, e) => {
    const artifact = e.targets[0].hasArtifact()!;
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    c.moveEntity(artifact, area);
  })
  .done();

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
  until "v4.0.0";
  cost DiceType.Aligned, 2;
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
 * @id 303181
 * @name 风与自由（生效中）
 * @description
 * 本回合中，轮到我方行动期间有对方角色被击倒时：本次行动结束后，我方可以再连续行动一次。
 * 可用次数：1
 */
define combatStatus {
  id 303181 as private WindAndFreedomInEffect;
  until "v4.0.0";
  oneDuration;
  on defeated {
    when :( :isMyTurn() && 
        !:oppPlayer.declaredEnd &&
        !:e.target.isMine() && 
        (:phase === "action" || :player.defeatedSwitching || :oppPlayer.defeatedSwitching) );
    listenTo all;
    usage 1;
    :continueNextTurn();
  }
}

/**
 * @id 331801
 * @name 风与自由
 * @description
 * 本回合中，轮到我方行动期间有对方角色被击倒时：本次行动结束后，我方可以再连续行动一次。
 * 可用次数：1
 * （牌组包含至少2个「蒙德」角色，才能加入牌组）
 */
define card {
  id 331801 as private WindAndFreedom;
  until "v4.0.0";
  cost DiceType.Aligned, 1;
  :combatStatus(WindAndFreedomInEffect);
}
  
