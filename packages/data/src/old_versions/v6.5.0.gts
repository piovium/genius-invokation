import { card, skill, $, character, type SkillHandle, DamageType, DiceType, combatStatus } from "@gi-tcg/core/builder";
import { DarkgoldWolfbite, DarkgoldWolfbite01, ForcefulFistsOfFrost, IcefangRush } from "../characters/cryo/wriothesley.gts";
import { DeathsCrossing, SevenphaseFlash, Skirk, Skirk01 } from "../characters/cryo/skirk.gts";
import { SinOfPride, TenguJuuraiStormcluster } from "../characters/electro/kujou_sara.gts";
import { StarsGatherAtDusk, WhiteCloudsAtDawn, WordOfWindAndFlower } from "../characters/anemo/xianyun.gts";
import { status } from "@gi-tcg/core/builder";
import { Kirara } from "../characters/dendro/kirara.gts";
import { Target } from "../cards/equipment/techniques.gts";
import { AgileSwitch, EfficientSwitch, IneffectiveWhenPlayed, NoTuningAllowed } from "../commons.gts";
import { ChenyuBrew } from "../cards/event/food.gts";
import { RedFeatherFanStatus } from "../cards/support/item.gts";

/**
 * @id 1111
 * @name 莱欧斯利
 * @description
 * 罪囚于斯，深水无漪。
 */
define character {
  id 1111 as private Wriothesley;
  until "v6.5.0";
  tags cryo, catalyst, fontaine, pneuma;
  health 10;
  energy 3;
  skills ForcefulFistsOfFrost, IcefangRush, DarkgoldWolfbite, DarkgoldWolfbite01;
}

/**
 * @id 111161
 * @name 诸武相授
 * @description
 * 我方丝柯克附属七相一闪，并且下次造成的伤害+1。
 * 回合开始或我方执行切换后：舍弃此牌，获得1点蛇之狡谋。
 */
export const MutualWeaponsMentorship = card(111161)
  .until("v6.5.0")
  .undiscoverable() 
  .addTarget(`my character with definition id 1116`)
  .characterStatus(SevenphaseFlash, "@targets.0")
  .characterStatus(DeathsCrossing, "@targets.0")
  .onArbitraryEvent("actionPhase", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .onArbitraryEvent("switchActive", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .done();

/**
 * @id 14063
 * @name 煌煌千道镇式
 * @description
 * 造成1点雷元素伤害，召唤天狗咒雷·雷砾。
 */
define skill {
  id 14063 as private SubjugationKoukouSendou;
  until "v6.5.0";
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 1);
  :summon(TenguJuuraiStormcluster);
}

/**
 * @id 114063
 * @name 鸣煌护持
 * @description
 * 所附属角色元素战技和元素爆发造成的伤害+1。
 * 可用次数：2
 */
define status {
  id 114063 as private CrowfeatherCover;
  until "v6.5.0";
  on increaseSkillDamage {
    when :( :e.viaSkillType("elemental") || :e.viaSkillType("burst") );
    usage 2;
    :e.increaseDamage(1);
    if (:self.master.element() === DiceType.Electro && :query($.my.typeEquipment.def(SinOfPride))) {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 1510
 * @name 闲云
 * @description
 * 侠中影，云里客。
 */
define character {
  id 1510 as private Xianyun;
  until "v6.5.0";
  tags anemo, catalyst, liyue;
  health 10;
  energy 2;
  skills WordOfWindAndFlower, WhiteCloudsAtDawn, StarsGatherAtDusk;
}

/**
 * @id 117072
 * @name 安全运输护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
define combatStatus {
  id 117072 as private ShieldOfSafeTransport;
  until "v6.5.0";
  shield 2;
}

/**
 * @id 117071
 * @name 猫箱急件
 * @description
 * 绮良良为出战角色时，我方切换角色后：造成1点草元素伤害，抓1张牌。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define combatStatus {
  id 117071 as private UrgentNekoParcel;
  until "v6.5.0";
  on switchActive {
    when :( :e.switchInfo.from?.definition.id === Kirara );
    usage 1 {
      append 2;
    };
    :damage(DamageType.Dendro, 1);
    :drawCards(1);
  }
}

/**
 * @id 17072
 * @name 呜喵町飞足
 * @description
 * 生成猫箱急件和安全运输护盾。
 */
define skill {
  id 17072 as private MeowteorKick;
  until "v6.5.0";
  skillType elemental;
  cost DiceType.Dendro, 3;
  :combatStatus(UrgentNekoParcel);
  :combatStatus(ShieldOfSafeTransport);
}

/**
 * @id 311106
 * @name 四风原典
 * @description
 * 此牌每有1点「伤害加成」，角色造成的伤害+1。
 * 结束阶段：此牌累积1点「伤害加成」。（最多累积到2点）
 * （「法器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311106 as private LostPrayerToTheSacredWinds;
  until "v6.5.0";
  cost DiceType.Aligned, 3;
  weapon catalyst {
    variable extraDamage, 0;
    on increaseSkillDamage {
      :e.increaseDamage(:getVariable("extraDamage"));
    }
    on endPhase {
      :addVariableWithMax("extraDamage", 1, 2);
    }
  }
}

/**
 * @id 311408
 * @name 公义的酬报
 * @description
 * 角色使用「元素爆发」造成的伤害+2。
 * 我方出战角色受到伤害或治疗后：累积1点「公义之理」。如果此牌已累积3点「公义之理」，则消耗3点「公义之理」，使角色获得1点充能。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311408 as private RightfulReward;
  until "v6.5.0";
  cost DiceType.Aligned, 2;
  weapon pole {
    variable justice, 0;
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      :e.increaseDamage(2);
    }
    on damagedOrHealed {
      when :( :e.target.isActive() );
      listenTo samePlayer;
      :addVariable("justice", 1);
      if (:getVariable("justice") >= 3) {
        :addVariable("justice", -3);
        :gainEnergy(1, "@master");
      }
    }
  }
}

/**
 * @id 313006
 * @name 绒翼龙
 * @description
 * 入场时：敌方出战角色附属目标。
 * 附属角色切换为出战角色，且敌方出战角色附属目标时：如可能，舍弃1张当前元素骰费用最高的手牌，将此次切换视为「快速行动」而非「战斗行动」，少花费1个元素骰，并移除对方所有角色的目标。
 * 特技：迅疾滑翔
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130061: ] ()
 * [3130062: ] ()
 * [3130063: 迅疾滑翔] (1*Same) 切换到下一名角色，敌方出战角色附属目标。
 */
define card {
  id 313006 as private Qucusaurus;
  until "v6.5.0";
  cost DiceType.Aligned, 1;
  technique {
    variable deductDiceTriggered, 0 {
      visible false;
    };
    on enter {
      :characterStatus(Target, $.opp.active);
    }
    on deductOmniDiceSwitch {                       // 绒翼龙只在可以减费时生效
      when :(
        :query($.opp.active.has($.def(Target))) &&  // 敌方出战角色附属目标
        :e.action.to.id === :self.master.id &&      // 附属角色切换为出战角色
        :player.hands.length > 0                    // 有手牌（“如可能，舍弃”）
      );                     
      :setVariable("deductDiceTriggered", 1);
      // 预计算时不触发弃牌
      if (:skillInfo.environment !== "precalculate") {
        :disposeMaxCostHands(1);
      }
      for (const st of :queryAll($.opp.typeStatus.def(Target))) {
        st.dispose();
      }
      :e.deductOmniCost(1);
    }
    on beforeFastSwitch {
      when :( :getVariable("deductDiceTriggered") ); // 将此次切换视为「快速行动」
      :setVariable("deductDiceTriggered", 0);
      :e.setFastAction();
    }
    skill {
      id 3130063;
      usage 2;
      cost DiceType.Aligned, 1;
      :switchActive("my next");
      :characterStatus(Target, "opp active");
    }
  }
}

/**
 * @id 321018
 * @name 梅洛彼得堡
 * @description
 * 我方出战角色受到伤害或治疗后：此牌累积1点「禁令」（可叠加，最多叠加到5）。如果此牌已有5点禁令，则消耗5点，赋予对方1张随机手牌无效化。
 */
define card {
  id 321018 as private FortressOfMeropide;
  until "v6.5.0";
  cost DiceType.Aligned, 1;
  support place {
    variable forbidden, 0;
    on damagedOrHealed {
      when :( :e.target.isActive() );
      :addVariableWithMax("forbidden", 1, 5);
      if (:getVariable("forbidden") >= 5 && :oppPlayer.hands.length > 0) {
        :addVariable("forbidden", -5);
        const candidates = :oppPlayer.hands.filter(
          (card) => !card.withAttachment(IneffectiveWhenPlayed)
        );
        const target = :random(candidates);
        if (target) {
          :attach(IneffectiveWhenPlayed, target);
        }
      }
    }
  }
}

/**
 * @id 321032
 * @name 沉玉谷
 * @description
 * 冒险经历达到2时：生成2张手牌沉玉茶露。
 * 冒险经历达到4时：我方获得3层高效切换和敏捷切换。
 * 冒险经历达到8时：我方全体角色附着水元素，治疗我方受伤最多的角色至最大生命值，并使其获得2点最大生命值，然后弃置此牌。
 */
define card {
  id 321032 as private ChenyuVale;
  until "v6.5.0";
  undiscoverable;
  support place {
    adventureSpot;
    on adventure {
      when :( :getVariable("exp") >= 2 );
      usage 1 {
        name "stage1";
        visible false;
      };
      :createHandCard(ChenyuBrew);
      :createHandCard(ChenyuBrew);
    }
    on adventure {
      when :( :getVariable("exp") >= 4 );
      usage 1 {
        name "stage2";
        visible false;
      };
      :combatStatus(EfficientSwitch, "my", {
          overrideVariables: {
            usage: 3
          }
        });
      :combatStatus(AgileSwitch, "my", {
          overrideVariables: {
            usage: 3
          }
        });
    }
    on adventure {
      when :( :getVariable("exp") >= 8 );
      usage 1 {
        name "stage3";
        visible false;
      };
      :apply(DamageType.Hydro, "all my characters");
      const targetCh = :$(`my characters order by health - maxHealth limit 1`);
      if (!targetCh) {
        return;
      }
      :increaseMaxHealth(2, targetCh, { heal: false });
      const healValue = 999; // interesting.
      :heal(healValue, targetCh);
      :finishAdventure();
    }
  }
}

/**
 * @id 323003
 * @name 红羽团扇
 * @description
 * 我方切换角色后：本回合中，我方执行的下次「切换角色」行动视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。（每回合1次）
 */
define card {
  id 323003 as private RedFeatherFan;
  until "v6.5.0";
  cost DiceType.Aligned, 2;
  support item {
    on switchActive {
      usage perRound, 1;
      :combatStatus(RedFeatherFanStatus);
    }
  }
}
