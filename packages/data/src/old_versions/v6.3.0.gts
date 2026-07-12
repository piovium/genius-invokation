import { card, character, combatStatus, DiceType, skill } from "@gi-tcg/core/builder";
import { StrictProhibited } from "../cards/support/place.gts";
import { ConstantOffthecuffCookery, KitchenSkills, LowtemperatureCooking, ScoringCuts } from "../characters/cryo/escoffier.gts";
import { Breakthrough, DepthclarionDice, LingeringLifeline, StealthyBowshot } from "../characters/hydro/yelan.gts";
import { InsatiableAppetite, RavagingDevourer, ShatteringWaves, StarfallShower } from "../characters/hydro/alldevouring_narwhal.gts";
import { BranchingFlow, SavageSwell, StormSurge, ThunderingTide } from "../characters/hydro/hydro_tulpa.gts";
import { BladeAblaze, Prowl, StealthMaster, Thrust } from "../characters/pyro/fatui_pyro_agent.gts";
import { InfusedStonehide, MovoLawa, PlamaLawa, UpaShato } from "../characters/geo/stonehide_lawachurl.gts";
import { FeatherSpreading, MajesticDance, RadicalVitality, VolatileSporeCloud } from "../characters/dendro/jadeplume_terrorshroom.gts";

/**
 * @id 1115
 * @name 爱可菲
 * @description
 * 调霜焙巧，琢味求臻。
 */
define character {
  id 1115 as private Escoffier;
  until "v6.3.0";
  tags cryo, pole, fontaine, pneuma;
  health 11;
  energy 2;
  skills KitchenSkills, LowtemperatureCooking, ScoringCuts, ConstantOffthecuffCookery;
}

/**
 * @id 1209
 * @name 夜兰
 * @description
 * 天地一渺渺，幽客自来去。
 */
define character {
  id 1209 as private Yelan;
  until "v6.3.0";
  tags hydro, bow, liyue;
  health 10;
  energy 3;
  skills StealthyBowshot, LingeringLifeline, DepthclarionDice, Breakthrough;
}

/**
 * @id 2204
 * @name 吞星之鲸
 * @description
 * 在最魔幻的故事里或是最疯癫的诳语中，宇宙深处真正的星辰或许也如提瓦特一般充满了生机，而宇宙本身就如同海洋。
 * 或许宇宙渗入提瓦特的过程从未停止；也许更高的意志为它划定了边界是为了保护这个世界。
 */
define character {
  id 2204 as private AlldevouringNarwhal;
  until "v6.3.0";
  tags hydro, monster, calamity;
  health 5;
  energy 2;
  skills ShatteringWaves, StarfallShower, RavagingDevourer, InsatiableAppetite;
}

/**
 * @id 2206
 * @name 水形幻人
 * @description
 * 由无数的水滴凝聚成的，初具人形的魔物。
 */
define character {
  id 2206 as private HydroTulpa;
  until "v6.3.0";
  tags hydro, monster;
  health 11;
  energy 3;
  skills SavageSwell, StormSurge, ThunderingTide, BranchingFlow;
}

/**
 * @id 2301
 * @name 愚人众·火之债务处理人
 * @description
 * 「死债不可免，活债更难逃…」
 */
define character {
  id 2301 as private FatuiPyroAgent;
  until "v6.3.0";
  tags pyro, fatui;
  health 9;
  energy 2;
  skills Thrust, Prowl, BladeAblaze, StealthMaster;
}

/**
 * @id 2601
 * @name 丘丘岩盔王
 * @description
 * 绕道而行吧，因为前方是属于「王」的领域。
 */
define character {
  id 2601 as private StonehideLawachurl;
  until "v6.3.0";
  tags geo, monster, hilichurl;
  health 8;
  energy 2;
  skills PlamaLawa, MovoLawa, UpaShato, InfusedStonehide;
}

/**
 * @id 2701
 * @name 翠翎恐蕈
 * @description
 * 悄声静听，可以听到幽林之中，蕈类王者巡视领土的脚步…
 */
define character {
  id 2701 as private JadeplumeTerrorshroom;
  until "v6.3.0";
  tags dendro, monster;
  health 10;
  energy 2;
  skills MajesticDance, VolatileSporeCloud, FeatherSpreading, RadicalVitality;
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
  until "v6.3.0";
  cost DiceType.Void, 2;
  artifact {
    on useTechnique {
      usage perRound, 1;
      :gainEnergy(1, "@master");
    }
  }
}

/**
 * @id 321018
 * @name 梅洛彼得堡
 * @description
 * 我方出战角色受到伤害或治疗后：此牌累积1点「禁令」。（最多累积到4点）
 * 行动阶段开始时：如果此牌已有4点「禁令」，则消耗4点，在对方场上生成严格禁令。（本回合中打出的1张事件牌无效）
 */
define card {
  id 321018 as private FortressOfMeropide;
  until "v6.3.0";
  cost DiceType.Aligned, 1;
  support place {
    variable forbidden, 0;
    on damagedOrHealed {
      when :( :e.target.isActive() );
      :addVariableWithMax("forbidden", 1, 4);
    }
    on actionPhase {
      when :( :getVariable("forbidden") >= 4 );
      :combatStatus(StrictProhibited, "opp");
      :addVariable("forbidden", -4);
    }
  }
}

/**
 * @id 300003
 * @name 裁定之时（生效中）
 * @description
 * 本回合中，我方打出的事件牌无效。
 * 可用次数：3
 */
define combatStatus {
  id 300003 as private PassingOfJudgmentInEffect;
  until "v6.3.0";
  tags eventEffectless;
  oneDuration;
  on playCard {
    when :( :e.card.definition.type === "eventCard" );
    usage 3;
  }
}

/**
 * @id 330006
 * @name 裁定之时
 * @description
 * 本回合中，对方牌手打出的3张事件牌无效。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330006 as private PassingOfJudgment;
  until "v6.3.0";
  cost DiceType.Aligned, 1;
  legend;
  :combatStatus(PassingOfJudgmentInEffect, "opp");
}

/**
 * @id 332013
 * @name 送你一程
 * @description
 * 选择一个敌方「召唤物」，使其「可用次数」-2。
 */
const SendOff = card(332013)
  .until("v6.3.0")
  .costSame(2)
  .addTarget("opp summon")
  .do((c, e) => {
    e.targets[0].consumeUsage(2);
  })
  .done();

/**
 * @id 333019
 * @name 温泉时光
 * @description
 * 治疗目标角色1点，我方场上每有1个召唤物，则额外治疗1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333019 as private HotSpringOclock;
  until "v6.3.0";
  cost DiceType.Aligned, 1;
  food {
    injuredOnly;
  };
  :heal(1 + :$$(`my summons`).length, "@targets.0");
}
