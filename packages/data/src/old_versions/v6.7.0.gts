import { DiceType, DamageType, $ } from "@gi-tcg/core/data";
import { BattlePlan } from "../commons.gts";
import { Cacucu, NightsoulsBlessing } from "../characters/anemo/ifa.gts";
import {
  RadiantHues,
  RadiantHuesEchoes,
  RadiantHuesIcicle,
  RadiantHuesManifestation,
  RadiantHuesPillar,
  RadiantHuesSolidIce,
  RadiantHuesSwiftShadow,
} from "../characters/cryo/wayward_hermetic_spiritspeaker.gts";

/**
 * @id 15152
 * @name 空天疾护
 * @description
 * 造成1点风元素伤害，自身进入夜魂加持，获得2点「夜魂值」，并附属咔库库。（角色进入夜魂加持后不可使用此技能）
 * （附属咔库库的角色可以使用特技：援护射击）
 */
define skill {
  id 15152 as private AirborneDiseasePrevention;
  until "v6.7.0";
  skillType elemental;
  cost DiceType.Anemo, 2;
  filter :( !:self.hasStatus(NightsoulsBlessing) );
  :damage(DamageType.Anemo, 1);
  :gainNightsoul(:self, 2);
  :equip(Cacucu, :self);
};

/**
 * @id 221057
 * @name 浮彩·迅影
 * @description
 * 打出浮彩少花费等于此状态层数个元素骰。
 */
define combatStatus {
  id 221057 as private RadiantHuesSwiftShadowInEffect;
  until "v6.7.0";
  variable reductCount, 1 { append; };
  on deductOmniDiceCard {
    when :( :e.action.skill.caller.definition.id === RadiantHues );
    :e.deductOmniCost(:getVariable("reductCount"));
  };
};

/**
 * @id 21052
 * @name 千变的浮彩
 * @description
 * 造成1点冰元素伤害，将1张浮彩加入牌库中第3张的位置，并从3个随机的浮彩强化效果中挑选1个。
 */
define skill {
  id 21052 as private RadianceInFlux;
  until "v6.7.0";
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :createPileCards(RadiantHues, 1, "topIndex2");
  const swiftShadowStatus = :query(
    $.my.combatStatus.def(RadiantHuesSwiftShadowInEffect),
  );
  const swiftShadowStacks =
    swiftShadowStatus?.getVariable("reductCount") ?? 0;
  const candidates = :randomSubset(
    [
      RadiantHuesIcicle,
      RadiantHuesEchoes,
      RadiantHuesManifestation,
      RadiantHuesPillar,
      RadiantHuesSolidIce,
      RadiantHuesSwiftShadow,
    ].filter(
      (id) => !(id === RadiantHuesSwiftShadow && swiftShadowStacks >= 2),
    ),
    3,
  );
  :selectAndPlay(candidates);
};

/**
 * @id 321034
 * @name 天蛇船
 * @description
 * 冒险经历增加时：将1个元素骰转换为万能元素。
 * 冒险经历达到2时：抓2张牌。
 * 冒险经历达到4时：我方出战角色附属2层战斗计划。
 * 冒险经历达到6时：弃置敌方场上1个随机召唤物，召唤回天的圣主，然后弃置此牌。
 */
define card {
  id 321034 as private Tonatiuh;
  until "v6.7.0";
  undiscoverable;
  support place {
    adventureSpot;
    // 第一次冒险后实为打出效果
    on staged {
      :convertDice(DiceType.Omni, 1);
    };
    on adventure {
      when :( :getVariable("exp") !== 1 );
      :convertDice(DiceType.Omni, 1);
    };
    on adventure {
      when :( :getVariable("exp") >= 2 );
      usage 1 {
        name "stage1";
        visible false;
      };
      :drawCards(2);
    };
    on adventure {
      when :( :getVariable("exp") >= 4 );
      usage 1 {
        name "stage2";
        visible false;
      };
      :characterStatus(BattlePlan, $.my.active, {
        overrideVariables: { usage: 2 },
      });
    };
    on adventure {
      when :( :getVariable("exp") >= 6 );
      usage 1 {
        name "stage3";
        visible false;
      };
      const summons = :queryAll($.opp.summon);
      if (summons.length > 0) {
        const summon = :random(summons);
        :dispose(summon);
      }
      :summon(TideTurningSacredLord);
      :finishAdventure();
    };
  };
};

/**
 * @id 301041
 * @name 回天的圣主
 * @description
 * 结束阶段：造成2点穿透伤害。
 * 此卡牌被弃置时，对双方场上生命值最多的角色造成5点穿透伤害。可用次数：3
 */
define summon {
  id 301041 as private TideTurningSacredLord;
  until "v6.7.0";
  hint DamageType.Physical, "2";
  on endPhase {
    usage 3;
    :damage(DamageType.Piercing, 2);
  };
  on selfDispose {
    const myMaxHpCharacter = :query($.macros.myMaxHealth)!;
    const oppMaxHpCharacter = :query($.macros.oppMaxHealth)!;
    const target =
      myMaxHpCharacter.health > oppMaxHpCharacter.health
        ? myMaxHpCharacter
        : oppMaxHpCharacter;
    :damage(DamageType.Piercing, 5, target);
  };
};

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 第1回合打出此牌时：如果我方牌组中初始包含至少2张不同的「天赋」牌，则抓1张「天赋」牌。
 * 第2回合及以后打出此牌时：我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 * 【此卡含描述变量】
 */
define card {
  id 330005 as private InEveryHouseAStove;
  until "v6.7.0";
  legend;
  replaceDescription "[T]", ((st) => st.roundNumber);
  filter :{
    if (:roundNumber === 1) {
      return (
        new Set(
          :player.initialPile
            .filter((card) => card.tags.includes("talent"))
            .map((card) => card.id),
        ).size >= 2
      );
    } else {
      return true;
    }
  };
  if (:roundNumber === 1) {
    const initTalentDefIds = :player.initialPile
      .filter((card) => card.tags.includes("talent"))
      .map((card) => card.id);
    if (new Set(initTalentDefIds).size >= 2) {
      :drawCards(1, { withTag: "talent" });
    }
  } else {
    const count = Math.min(:roundNumber - 1, 4);
    :drawCards(count);
  }
};
