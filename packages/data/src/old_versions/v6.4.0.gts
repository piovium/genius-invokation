import { card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";
import { LetTheShowBegin, ShiningMiracle, WhisperOfWater } from "../characters/hydro/barbara.gts";
import { FavoniusBladeworkEdel, IcetideVortex, WellspringOfWarlust } from "../characters/cryo/eula.gts";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto.gts";
import { Skirk, Skirk01 } from "../characters/cryo/skirk.gts";
import { BattlePlan, CostReduction } from "../commons.gts";
import { TideTurningSacredLord } from "../cards/support/adventure.gts";

/**
 * @id 1201
 * @name 芭芭拉
 * @description
 * 无论何时都能治愈人心。
 */
define character {
  id 1201 as private Barbara;
  until "v6.4.0";
  tags hydro, catalyst, mondstadt;
  health 10;
  energy 3;
  skills WhisperOfWater, LetTheShowBegin, ShiningMiracle;
}

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成3点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
define summon {
  id 111062 as private LightfallSword;
  until "v6.4.0";
  hint DamageType.Physical, "3+";
  usage 0 {
    autoDispose false;
  };
  on useSkill {
    when :( :e.skill.definition.id === FavoniusBladeworkEdel ||
        :e.skill.definition.id === IcetideVortex );
    if (:e.skill.definition.id === IcetideVortex &&
      :e.skillCaller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      :self.addVariable("usage", 3);
    } else {
      :self.addVariable("usage", 2);
    }
  }
  on endPhase {
    :damage(DamageType.Physical, 3 + :getVariable("usage"));
    :dispose();
  }
}

/**
 * @id 111121
 * @name 佩伊刻计
 * @description
 * 我方每抓1张牌后：此牌累积1层「压力阶级」。
 * 所附属角色使用浮冰增压时：如果「压力阶级」至少有2层，则移除此效果，使技能少花费1元素骰，且如果此技能结算后「压力阶级」至少有4层，则再额外造成2点物理伤害。
 */
define status {
  id 111121 as private PersTimer;
  until "v6.4.0";
  variable level, 0;
  on drawCard {
    :addVariable("level", 1);
  }
  on deductOmniDiceSkill {
    when :( :getVariable("level") >= 2 );
    :e.deductOmniCost(1);
  }
  on useSkill {
    when :( :getVariable("level") >= 2 );
    if (:getVariable("level") >= 4) {
      :damage(DamageType.Physical, 2);
    }
    :dispose();
  }
}

/**
 * @id 111163
 * @name 虚境裂隙
 * @description
 * 舍弃1张当前元素骰费用为3的手牌，丝柯克获得2点蛇之狡谋。
 */
define card {
  id 111163 as private VoidRift;
  until "v6.4.0";
  undiscoverable;
  const hand = :player.hands.find((card) => card.diceCost() === 3);
  if (hand) {
    :disposeCard(hand);
    const skirk = :$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`);
    skirk?.addVariableWithMax("serpentsSubtlety", 2, 7);
  }
}

/**
 * @id 116051
 * @name 阿丑
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 此召唤物在场期间可触发1次：我方角色受到伤害后，为荒泷一斗附属乱神之怪力。
 * 结束阶段：弃置此牌，造成1点岩元素伤害。
 */
define summon {
  id 116051 as private Ushi;
  until "v6.4.0";
  tags barrier;
  hint DamageType.Geo, 1;
  on endPhase {
    :damage(DamageType.Geo, 1);
    :dispose();
  }
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on damaged {
    usage 1 {
      name "addStatusUsage";
    };
    :characterStatus(SuperlativeSuperstrength, "my characters with definition id 1605");
  }
}

/**
 * @id 303318
 * @name 奇瑰之汤·激愤（生效中）
 * @description
 * 本回合中，该角色下一次造成的伤害+2。
 */
define status {
  id 303318 as private MystiqueSoupFuryInEffect;
  until "v6.4.0";
  oneDuration;
  once increaseSkillDamage {
    :e.increaseDamage(2);
  }
}

/**
 * @id 321034
 * @name 天蛇船
 * @description
 * 冒险经历增加时：将1个元素骰转换为万能元素。
 * 冒险经历达到2时：抓1张牌。
 * 冒险经历达到4时：我方出战角色附属2层战斗计划。
 * 冒险经历达到6时：弃置敌方场上1个随机召唤物，召唤回天的圣主，然后弃置此牌。
 */
define card {
  id 321034 as private Tonatiuh;
  until "v6.4.0";
  undiscoverable;
  support place {
    adventureSpot;
    on adventure {
      :convertDice(DiceType.Omni, 1);
    }
    on adventure {
      when :( :getVariable("exp") >= 2 );
      usage 1 {
        name "stage1";
        visible false;
      };
      :drawCards(1);
    }
    on adventure {
      when :( :getVariable("exp") >= 4 );
      usage 1 {
        name "stage2";
        visible false;
      };
      :characterStatus(BattlePlan, "my active", {
          overrideVariables: { usage: 2 }
        });
    }
    on adventure {
      when :( :getVariable("exp") >= 6 );
      usage 1 {
        name "stage3";
        visible false;
      };
      const summons = :$$("opp summons");
      if (summons.length > 0) {
        const summon = :random(summons);
        :dispose(summon);
      }
      :summon(TideTurningSacredLord);
      :finishAdventure();
    }
  }
}

