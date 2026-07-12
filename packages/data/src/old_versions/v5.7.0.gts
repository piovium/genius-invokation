import { card, character, DamageType, DiceType, Reaction, skill, status } from "@gi-tcg/core/builder";
import { Citlali, MamaloacosFrigidRainInEffect } from "../characters/cryo/citlali.gts";
import { BondOfLife } from "../commons.gts";
import { Arlecchino } from "../characters/pyro/arlecchino.gts";
import { FlamestriderBlazingTrail, FlamestriderFullThrottle, FlamestriderSoaringAscent } from "../characters/pyro/mavuika.gts";
import { Kachina, TurboTwirlyTriggered } from "../characters/geo/kachina.gts";
import { GrappleLink, NightRealmsGiftRepaidInFull, NightsoulsBlessing } from "../characters/dendro/kinich.gts";
import { Emilie, LumidouceCaseLevel1, LumidouceCaseLevel2, LumidouceCaseLevel3 } from "../characters/dendro/emilie.gts";
import { BloodbondedShadow, FrostyInterjection, OnslaughtStance, SwiftPoint } from "../characters/cryo/frost_operative.gts";

/**
 * @id 211141
 * @name 五重天的寒雨
 * @description
 * 敌方受到冻结或融化反应伤害后：我方下2次造成的水元素伤害和火元素伤害+1，并使茜特菈莉获得1点「夜魂值」。（每回合1次）
 * （牌组中包含茜特菈莉，才能加入牌组）
 */
define card {
  id 211141 as private MamaloacosFrigidRain;
  until "v5.7.0";
  cost DiceType.Cryo, 1;
  talent Citlali, none {
    on damaged {
      when :( (:e.getReaction() === Reaction.Frozen || :e.getReaction() === Reaction.Melt) &&
          !:e.target.isMine() );
      listenTo all;
      usage perRound, 1;
      :combatStatus(MamaloacosFrigidRainInEffect);
    }
  }
}

/**
 * @id 13152
 * @name 称名之刻
 * @description
 * 本角色进入夜魂加持，获得2点「夜魂值」，并从3张驰轮车中挑选1张加入手牌。
 */
define skill {
  id 13152 as private TheNamedMoment;
  until "v5.7.0";
  skillType elemental;
  cost DiceType.Pyro, 2;
  :selectAndCreateHandCard([
      FlamestriderBlazingTrail,
      FlamestriderFullThrottle,
      FlamestriderSoaringAscent
    ]);
  :gainNightsoul("@self", 2);
}

/**
 * @id 216101
 * @name 夜域赐礼·团结炉心
 * @description
 * 我方冲天转转或冲天转转·脱离触发效果后，抓1张牌。（每回合2次）
 * （牌组中包含卡齐娜，才能加入牌组）
 */
define card {
  id 216101 as private NightRealmsGiftHeartOfUnity;
  until "v5.7.0";
  cost DiceType.Geo, 1;
  talent Kachina, none {
    on TurboTwirlyTriggered {
      listenTo samePlayer;
      usage perRound, 2;
      :drawCards(1);
    }
  }
}

/**
 * @id 17092
 * @name 悬猎·游骋高狩
 * @description
 * 选一个我方角色，自身附属钩索链接并进入夜魂加持。造成2点草元素伤害，然后与所选角色交换位置。
 */
const CanopyHunterRidingHigh = skill(17092)
  .until("v5.7.0")
  .type("elemental")
  .costDendro(3)
  .addTarget("my characters")
  .characterStatus(GrappleLink)
  .characterStatus(NightsoulsBlessing)
  .damage(DamageType.Dendro, 2)
  .swapCharacterPosition("@self", "@targets.0")
  .do((c) => {
    const talent = c.self.hasEquipment(NightRealmsGiftRepaidInFull);
    if (
      talent &&
      c.player.hands.length <= c.oppPlayer.hands.length &&
      talent.variables.usagePerRound! > 0
    ) {
      if (c.oppPlayer.hands.length > 0) {
        const [targetCard] = c.maxCostHands(1, { who: "opp" });
        c.stealHandCard(targetCard);
      }
      c.drawCards(1, { who: "opp" });
      c.addVariable("usagePerRound", -1, talent);
    }
  })
  .done();

/**
 * @id 217101
 * @name 茉洁香迹
 * @description
 * 所附属角色造成的物理伤害变为草元素伤害。
 * 装备有此牌的艾梅莉埃普通攻击后：我方最高等级的「柔灯之匣」立刻行动1次。（每回合1次）
 * （牌组中包含艾梅莉埃，才能加入牌组）
 */
define card {
  id 217101 as private MarcotteSillage;
  until "v5.7.0";
  cost DiceType.Dendro, 1;
  talent Emilie, none {
    on modifySkillDamageType {
      when :( :e.type === DamageType.Physical );
      :e.changeDamageType(DamageType.Dendro);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 1;
      const lumidouceIds = [LumidouceCaseLevel3, LumidouceCaseLevel2, LumidouceCaseLevel1];
      for (const id of lumidouceIds) {
        const lumidouce = :$(`my summons with definition id ${id}`);
        if (lumidouce) {
          :triggerEndPhaseSkill(lumidouce);
          break;
        }
      }
    }
  }
}

/**
 * @id 213141
 * @name 所有的仇与债皆由我偿…
 * @description
 * 战斗行动：我方出战角色为阿蕾奇诺时，对该角色打出，使阿蕾奇诺附属3层生命之契。
 * 装备有此牌的阿蕾奇诺受到伤害时，若可能，消耗1层生命之契，以抵消1点伤害。
 * （牌组中包含阿蕾奇诺，才能加入牌组）
 */
define card {
  id 213141 as private AllReprisalsAndArrearsMineToBear;
  until "v5.7.0";
  cost DiceType.Pyro, 2;
  talent Arlecchino {
    on enter {
      :characterStatus(BondOfLife, "@master", {
        overrideVariables: { usage: 3 }
      });
      // 消耗生命之契增伤的部分在被动技能 13147 里
    }
  }
}

/**
 * @id 21043
 * @name 掠袭之刺
 * @description
 * 造成4点冰元素伤害，本角色附属掠袭锐势。
 */
define skill {
  id 21043 as private ThornyOnslaught;
  until "v5.7.0";
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 4);
  :characterStatus(OnslaughtStance, "@self");
}

/**
 * @id 2104
 * @name 愚人众·霜役人
 * @description
 * 自幼就被选中的人，经长久年月的教化与训练，在无数次的汰换后才能成为所谓的「役人」。
 */
define character {
  id 2104 as private FrostOperative;
  until "v5.7.0";
  tags cryo, fatui;
  health 10;
  energy 2;
  skills SwiftPoint, FrostyInterjection, ThornyOnslaught, BloodbondedShadow;
}

/**
 * @id 300005
 * @name 赦免宣告（生效中）
 * 本回合中，所附属角色免疫冻结、眩晕、石化等无法使用技能的效果，并且该角色为「出战角色」时不会因效果而切换。
 */
define status {
  id 300005 as private EdictOfAbsolutionInEffect;
  until "v5.7.0";
  tags immuneControl;
  oneDuration;
}

/**
 * @id 330009
 * @name 赦免宣告
 * @description
 * 本回合中，目标角色免疫冻结、眩晕、石化等无法使用技能的效果，并且该角色为「出战角色」时不会因效果而切换。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
const EdictOfAbsolution = card(330009)
  .until("v5.7.0")
  .legend()
  .addTarget("my characters")
  .characterStatus(EdictOfAbsolutionInEffect, "@targets.0")
  .done();

