import { DamageType, DiceType, type EquipmentHandle, type SkillHandle, type SummonHandle, card, character, combatStatus, skill, status, summon } from "@gi-tcg/core/builder";
import { FatalRainscreen, Xingqiu } from "../characters/hydro/xingqiu.gts";
import { InfluxBlast, MirrorMaiden } from "../characters/hydro/mirror_maiden.gts";
import { Barbara, LetTheShowBegin } from "../characters/hydro/barbara.gts";
import { ElectroCrystalCore, ElectroHypostasis } from "../characters/electro/electro_hypostasis.gts";
import { ChonghuasLayeredFrost, Chongyun } from "../characters/cryo/chongyun.gts";
import { GuobaAttack, Xiangling } from "../characters/pyro/xiangling.gts";
import { NiwabiEnshou, Yoimiya } from "../characters/pyro/yoimiya.gts";
import { Candace, SacredRiteWagtailsTide } from "../characters/hydro/candace.gts";
import { ClawAndThunder, Razor } from "../characters/electro/razor.gts";
import { Beidou, SummonerOfLightning, Tidecaller, TidecallerSurfEmbrace, Wavestrider } from "../characters/electro/beidou.gts";
import { KujouSara, SubjugationKoukouSendou } from "../characters/electro/kujou_sara.gts";
import { Cyno, PactswornPathclearer, SecretRiteChasmicSoulfarer } from "../characters/electro/cyno.gts";
import { BakeKurage } from "../characters/hydro/sangonomiya_kokomi.gts";
import { Amber, BaronBunny, ExplosivePuppet } from "../characters/pyro/amber.gts";
import { FavoniusBladework, GaleBlade } from "../characters/anemo/jean.gts";
import { SealOfApproval, Yanfei } from "../characters/pyro/yanfei.gts";
import { StreamingSurge } from "../characters/hydro/rhodeia_of_loch.gts";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto.gts";

/**
 * @id 330003
 * @name 愉舞欢游
 * @description
 * 我方出战角色的元素类型为冰/水/火/雷/草时，才能打出：对我方所有角色附着我方出战角色类型的元素。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330003 as private JoyousCelebration;
  until "v4.1.0";
  cost DiceType.Aligned, 1;
  legend;
  filter :( ([DiceType.Cryo, DiceType.Hydro, DiceType.Pyro, DiceType.Electro, DiceType.Dendro] as (DiceType | undefined)[]).includes(:$("my active")?.element()) );
  const element = :$("my active")!.element() as 1 | 2 | 3 | 4 | 7;
  // 先挂后台再挂前台（避免前台被超载走导致结算错误）
  :apply(element, "my standby character");
  :apply(element, "my active character");
}

/**
 * @id 212021
 * @name 重帘留香
 * @description
 * 战斗行动：我方出战角色为行秋时，装备此牌。
 * 行秋装备此牌后，立刻使用一次画雨笼山。
 * 装备有此牌的行秋生成的雨帘剑，初始可用次数+1。
 * （牌组中包含行秋，才能加入牌组）
 */
define card {
  id 212021 as private TheScentRemained;
  until "v4.1.0";
  cost DiceType.Hydro, 4;
  talent Xingqiu {
    on enter {
      :useSkill(FatalRainscreen);
    }
  }
}

/**
 * @id 112023
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为3的伤害时：抵消1点伤害。
 * 可用次数：3
 */
define combatStatus {
  id 112023 as private RainSword01;
  until "v4.1.0";
  tags barrier;
  conflictWith 112021;
  on decreaseDamaged {
    when :( :e.target.isActive() && :e.value >= 3 );
    usage 3;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 222021
 * @name 镜锢之笼
 * @description
 * 战斗行动：我方出战角色为愚人众·藏镜仕女时，装备此牌。
 * 愚人众·藏镜仕女装备此牌后，立刻使用一次潋波绽破。
 * 装备有此牌的愚人众·藏镜仕女生成的水光破镜获得以下效果：
 * 初始持续回合+1，并且会使所附属角色切换到其他角色时元素骰费用+1。
 * （牌组中包含愚人众·藏镜仕女，才能加入牌组）
 */
define card {
  id 222021 as private MirrorCage;
  until "v4.1.0";
  cost DiceType.Hydro, 4;
  talent MirrorMaiden {
    on enter {
      :useSkill(InfluxBlast);
    }
  }
}


/**
 * @id 212011
 * @name 光辉的季节
 * @description
 * 战斗行动：我方出战角色为芭芭拉时，装备此牌。
 * 芭芭拉装备此牌后，立刻使用一次演唱，开始♪。
 * 装备有此牌的芭芭拉在场时，歌声之环会使我方执行「切换角色」行动时少花费1个元素骰。（每回合1次）
 * （牌组中包含芭芭拉，才能加入牌组）
 */
define card {
  id 212011 as private GloriousSeason;
  until "v4.1.0";
  cost DiceType.Hydro, 4;
  talent Barbara {
    on enter {
      :useSkill(LetTheShowBegin);
    }
  }
}

/**
 * @id 224011
 * @name 汲能棱晶
 * @description
 * 战斗行动：我方出战角色为无相之雷时，治疗该角色3点，并附属雷晶核心。
 * （牌组中包含无相之雷，才能加入牌组）
 */
define card {
  id 224011 as private AbsorbingPrism;
  until "v4.1.0";
  cost DiceType.Electro, 3;
  eventTalent ElectroHypostasis;
  :heal(3, "my active");
  :characterStatus(ElectroCrystalCore, "my active");
}

/**
 * @id 211041
 * @name 吐纳真定
 * @description
 * 战斗行动：我方出战角色为重云时，装备此牌。
 * 重云装备此牌后，立刻使用一次重华叠霜。
 * 装备有此牌的重云生成的重华叠霜领域获得以下效果：
 * 初始持续回合+1，并且使我方单手剑、双手剑或长柄武器角色的普通攻击伤害+1。
 * （牌组中包含重云，才能加入牌组）
 */
define card {
  id 211041 as SteadyBreathing;
  until "v4.1.0";
  cost DiceType.Cryo, 4;
  talent Chongyun {
    on enter {
      :useSkill(ChonghuasLayeredFrost);
    }
  }
}

/**
 * @id 111042
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害，普通攻击造成的伤害+1。
 * 持续回合：3
 */
define combatStatus {
  id 111042 as ChonghuaFrostField01;
  until "v4.1.0";
  conflictWith 111041;
  duration 3;
  on modifySkillDamageType {
    when :{
      if (:e.type !== DamageType.Physical) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.changeDamageType(DamageType.Cryo);
  }
  on increaseSkillDamage {
    when :{
      if (!:e.viaSkillType("normal")) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 213021
 * @name 交叉火力
 * @description
 * 战斗行动：我方出战角色为香菱时，装备此牌。
 * 香菱装备此牌后，立刻使用一次锅巴出击。
 * 装备有此牌的香菱使用锅巴出击时：自身也会造成1点火元素伤害。
 * （牌组中包含香菱，才能加入牌组）
 */
define card {
  id 213021 as Crossfire;
  until "v4.1.0";
  cost DiceType.Pyro, 4;
  talent Xiangling {
    on enter {
      :useSkill(GuobaAttack);
    }
  }
}

/**
 * @id 13052
 * @name 焰硝庭火舞
 * @description
 * 本角色附属庭火焰硝。（此技能不产生充能）
 */
define skill {
  id 13052 as private NiwabiFiredance;
  until "v4.1.0";
  skillType elemental;
  cost DiceType.Pyro, 1;
  noEnergy;
  :characterStatus(NiwabiEnshou);
}

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫触发庭火焰硝后：额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
define card {
  id 213051 as private NaganoharaMeteorSwarm;
  until "v4.1.0";
  cost DiceType.Pyro, 2;
  talent Yoimiya {
    on enter {
      :useSkill(NiwabiFiredance);
    }
    on useSkill {
      when :( :e.isSkillType("normal") && :self.master.hasStatus(NiwabiEnshou) );
      :damage(DamageType.Pyro, 1);
    }
  }
}


/**
 * @id 212071
 * @name 衍溢的汐潮
 * @description
 * 战斗行动：我方出战角色为坎蒂丝时，装备此牌。
 * 坎蒂丝装备此牌后，立刻使用一次圣仪·灰鸰衒潮。
 * 装备有此牌的坎蒂丝生成的赤冕祝祷额外具有以下效果：我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * （牌组中包含坎蒂丝，才能加入牌组）
 */
define card {
  id 212071 as private TheOverflow;
  until "v4.1.0";
  cost DiceType.Hydro, 4;
  cost DiceType.Energy, 2;
  talent Candace {
    on enter {
      :useSkill(SacredRiteWagtailsTide);
    }
  }
}

/**
 * @id 214021
 * @name 觉醒
 * @description
 * 战斗行动：我方出战角色为雷泽时，装备此牌。
 * 雷泽装备此牌后，立刻使用一次利爪与苍雷。
 * 装备有此牌的雷泽使用利爪与苍雷后：使我方一个雷元素角色获得1点充能。（出战角色优先）
 * （牌组中包含雷泽，才能加入牌组）
 */
define card {
  id 214021 as private Awakening;
  until "v4.1.0";
  cost DiceType.Electro, 4;
  talent Razor {
    on enter {
      :useSkill(ClawAndThunder);
    }
    on useSkill {
      when :( :e.skill.definition.id === ClawAndThunder );
      :gainEnergy(1, "my characters with tag (electro) and with energy < maxEnergy limit 1");
    }
  }
}

/**
 * @id 214051
 * @name 霹雳连霄
 * @description
 * 战斗行动：我方出战角色为北斗时，装备此牌。
 * 北斗装备此牌后，立刻使用一次捉浪。
 * 装备有此牌的北斗使用踏潮时：如果准备技能期间受到过伤害，则使北斗本回合内「普通攻击」少花费1个无色元素。（最多触发2次）
 * （牌组中包含北斗，才能加入牌组）
 */
define card {
  id 214051 as private LightningStorm;
  until "v4.1.0";
  cost DiceType.Electro, 3;
  talent Beidou {
    on enter {
      :useSkill(Tidecaller);
    }
    on useSkill {
      when :{
        if (:e.skill.definition.id !== Wavestrider) {
          return false;
        }
        const shield = :$(`status with definition id ${TidecallerSurfEmbrace} at @master`);
        if (shield && shield.getVariable("shield") === 2) {
          return false;
        }
        return true;
      };
      usage 2 {
        autoDispose false;
      };
      :characterStatus(SummonerOfLightning, "@master");
    }
  }
}

/**
 * @id 214061
 * @name 我界
 * @description
 * 战斗行动：我方出战角色为九条裟罗时，装备此牌。
 * 九条裟罗装备此牌后，立刻使用一次煌煌千道镇式。
 * 装备有此牌的九条裟罗在场时，我方附属有鸣煌护持的雷元素角色，元素战技和元素爆发造成的伤害额外+1。
 * （牌组中包含九条裟罗，才能加入牌组）
 */
define card {
  id 214061 as private SinOfPride;
  until "v4.1.0";
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 3;
  talent KujouSara {
    on enter {
      :useSkill(SubjugationKoukouSendou);
    }
  }
}

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数为3或5时使用秘仪·律渊渡魂时，造成的伤害额外+1。
 * （牌组中包含赛诺，才能加入牌组）
 */
define card {
  id 214041 as private FeatherfallJudgment;
  until "v4.1.0";
  cost DiceType.Electro, 3;
  talent Cyno {
    on enter {
      :useSkill(SecretRiteChasmicSoulfarer);
    }
    on increaseSkillDamage {
      when :{
        const status = :self.master.hasStatus(PactswornPathclearer)!;
        const reliance = :getVariable("reliance", status);
        return (reliance === 3 || reliance === 5) && :e.via.definition.id === SecretRiteChasmicSoulfarer;
      };
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 212051
 * @name 匣中玉栉
 * @description
 * 战斗行动：我方出战角色为珊瑚宫心海时，装备此牌。
 * 珊瑚宫心海装备此牌后，立刻使用一次海人化羽。
 * 装备有此牌的珊瑚宫心海使用海人化羽时：如果化海月在场，则刷新其可用次数。
 * 仪来羽衣存在期间，化海月造成的伤害+1。
 * （牌组中包含珊瑚宫心海，才能加入牌组）
 */
const TamakushiCasket = 212051 as EquipmentHandle; // Keeps same

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成2点水元素伤害，治疗所有我方角色1点，本角色附属仪来羽衣。
 */
define skill {
  id 12053 as private NereidsAscension;
  until "v4.1.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :heal(1, "all my characters");
  if (:self.hasEquipment(TamakushiCasket) && :$(`my summon with definition id ${BakeKurage}`)) {
    :summon(BakeKurage);
  }
}

/**
 * @id 213041
 * @name 一触即发
 * @description
 * 战斗行动：我方出战角色为安柏时，装备此牌。
 * 安柏装备此牌后，立刻使用一次爆弹玩偶。
 * 安柏普通攻击后：如果此牌和兔兔伯爵仍在场，则引爆兔兔伯爵，造成3点火元素伤害。
 * （牌组中包含安柏，才能加入牌组）
 */
define card {
  id 213041 as private BunnyTriggered;
  until "v4.1.0";
  cost DiceType.Pyro, 3;
  talent Amber {
    on enter {
      :useSkill(ExplosivePuppet);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      const bunny = :$(`my summon with definition id ${BaronBunny}`);
      if (bunny) {
        :damage(DamageType.Pyro, 3);
        bunny.dispose();
      }
    }
  }
}

/**
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成2点风元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
define summon {
  id 115021 as private DandelionField;
  until "v4.1.0";
  hint DamageType.Anemo, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Anemo, 2);
    :heal(1, "my active");
  }
  on increaseDamage {
    when :( :$(`my equipment with definition id ${LandsOfDandelion}`) && // 装备有天赋的琴在场时
        :e.type === DamageType.Anemo );
    :e.increaseDamage(1);
  }
}

/**
 * @id 15023
 * @name 蒲公英之风
 * @description
 * 治疗所有我方角色2点，召唤蒲公英领域。
 */
define skill {
  id 15023 as private DandelionBreeze;
  until "v4.1.0";
  skillType burst;
  cost DiceType.Anemo, 4;
  cost DiceType.Energy, 3;
  :heal(2, "all my characters");
  :summon(DandelionField);
}

/**
 * @id 1502
 * @name 琴
 * @description
 * 在夺得最终的胜利之前，她总是认为自己做得还不够好。
 */
define character {
  id 1502 as private Jean;
  until "v4.1.0";
  tags anemo, sword, mondstadt;
  health 10;
  energy 3;
  skills FavoniusBladework, GaleBlade, DandelionBreeze;
}

/**
 * @id 215021
 * @name 蒲公英的国土
 * @description
 * 战斗行动：我方出战角色为琴时，装备此牌。
 * 琴装备此牌后，立刻使用一次蒲公英之风。
 * 装备有此牌的琴在场时，蒲公英领域会使我方造成的风元素伤害+1。
 * （牌组中包含琴，才能加入牌组）
 */
define card {
  id 215021 as private LandsOfDandelion;
  until "v4.1.0";
  cost DiceType.Anemo, 4;
  cost DiceType.Energy, 3;
  talent Jean {
    on enter {
      :useSkill(DandelionBreeze);
    }
  }
}

/**
 * @id 113081
 * @name 丹火印
 * @description
 * 角色进行重击时：造成的伤害+2。
 * 可用次数：1
 */
define status {
  id 113081 as private ScarletSeal;
  until "v4.1.0";
  on increaseSkillDamage {
    when :( :e.viaChargedAttack() );
    usage 1;
    :e.increaseDamage(2);
  }
}

/**
 * @id 213081
 * @name 最终解释权
 * @description
 * 战斗行动：我方出战角色为烟绯时，装备此牌。
 * 烟绯装备此牌后，立刻使用一次火漆制印。
 * 装备有此牌的烟绯进行重击时：对生命值不多于6的敌人造成的伤害+1。
 * （牌组中包含烟绯，才能加入牌组）
 */
define card {
  id 213081 as private RightOfFinalInterpretation;
  until "v4.1.0";
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  talent Yanfei {
    variable triggerSeal, 0;
    on enter {
      :useSkill(SealOfApproval);
    }
    on increaseSkillDamage {
      when :( :e.viaChargedAttack() && :e.target.health <= 6 );
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 111072
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：3
 * 我方角色通过「普通攻击」触发此效果时，不消耗可用次数。（每回合1次）
 */
define combatStatus {
  id 111072 as private IcyQuill01;
  until "v4.1.0";
  conflictWith 111071;
  variable noUsageEffect, 1 {
    visible false; // 每回合一次不消耗可用次数
  };
  on roundEnd {
    :setVariable("noUsageEffect", 1);
  }
  on increaseDamage {
    when :( :e.via.caller.definition.type === "character" && :e.type === DamageType.Cryo );
    usage 3 {
      autoDecrease false;
    };
    :e.increaseDamage(1);
    if (:e.viaSkillType("normal") && :getVariable("noUsageEffect")) {
      :setVariable("noUsageEffect", 0);
    } else {
      :consumeUsage()
    }
  }
}

/**
 * @id 111071
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：3
 */
define combatStatus {
  id 111071 as private IcyQuill;
  until "v4.1.0";
  conflictWith 111072;
  on increaseDamage {
    when :( :e.via.caller.definition.type === "character" && :e.type === DamageType.Cryo );
    usage 3;
    :e.increaseDamage(1);
  }
}

/**
 * @id 22014
 * @name 潮涌与激流
 * @description
 * 造成2点水元素伤害；我方每有1个召唤物，再使此伤害+2。
 */
define skill {
  id 22014 as private TideAndTorrent;
  until "v4.1.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  const summons = :$$("my summons");
  const damageValue = 2 + summons.length * 2;
  :damage(DamageType.Hydro, damageValue);
  if (:self.hasEquipment(StreamingSurge)) {
    summons.forEach((s) => s.addVariable("usage", 1))
  }
}

/**
 * @id 116053
 * @name 怒目鬼王
 * @description
 * 所附属角色普通攻击造成的伤害+2，造成的物理伤害变为岩元素伤害。
 * 持续回合：2
 * 所附属角色普通攻击后：为其附属乱神之怪力。（每回合1次）
 */
define status {
  id 116053 as RagingOniKing;
  until "v4.1.0";
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Geo);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(2);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage perRound, 1;
    :characterStatus(SuperlativeSuperstrength, "@master");
  }
}

/**
 * @id 16053
 * @name 最恶鬼王·一斗轰临！！
 * @description
 * 造成5点岩元素伤害，本角色附属怒目鬼王。
 */
define skill {
  id 16053 as private RoyalDescentBeholdIttoTheEvil;
  until "v4.1.0";
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Geo, 5);
  :characterStatus(RagingOniKing);
}

