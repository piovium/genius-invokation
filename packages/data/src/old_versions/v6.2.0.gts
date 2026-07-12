import { card, character, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { CoolcolorCapture, FramingFreezingPointComposition, StillPhotoComprehensiveConfirmation } from "../characters/cryo/charlotte.gts";
import { KamisatoArtKyouka, KamisatoArtMarobashi, KamisatoArtSuiyuu } from "../characters/hydro/kamisato_ayato.gts";
import { Brilliance, ScarletSeal } from "../characters/pyro/yanfei.gts";
import { BlazingBlessing, CrimsonOoyoroi, SwiftshatterSpear } from "../characters/pyro/thoma.gts";
import { FloralBrush, SupplicantsBowmanship, TrumpcardKitty } from "../characters/dendro/collei.gts";
import { BranchingFlow, SavageSwell, StormSurge, ThunderingTide } from "../characters/hydro/hydro_tulpa.gts";
import { ErodedFlamingFeathers, ResentmentPassive, SeveringPrimalFire, VoidClawStrike } from "../characters/pyro/lord_of_eroded_primal_fire.gts";
import { NonInitialPlayedCardExtension } from "../cards/equipment/weapon/claymore.gts";
import { ChenyuBrew } from "../cards/event/food.gts";
import { AgileSwitch, EfficientSwitch } from "../commons.gts";

/**
 * @id 1110
 * @name 夏洛蒂
 * @description
 * 「真实至上，故事超群！」
 */
define character {
  id 1110 as private Charlotte;
  until "v6.2.0";
  tags cryo, catalyst, fontaine, ousia;
  health 10;
  energy 2;
  skills CoolcolorCapture, FramingFreezingPointComposition, StillPhotoComprehensiveConfirmation;
}

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
define status {
  id 112061 as private TakimeguriKanka;
  until "v6.2.0";
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 3;
    :e.increaseDamage(1);
    if (:self.master.hasEquipment(KyoukaFuushi) && :e.target.health <= 6) {
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
define character {
  id 1206 as private KamisatoAyato;
  until "v6.2.0";
  tags hydro, sword, inazuma;
  health 11;
  energy 2;
  skills KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu;
}

/**
 * @id 212061
 * @name 镜华风姿
 * @description
 * 战斗行动：我方出战角色为神里绫人时，装备此牌。
 * 神里绫人装备此牌后，立刻使用一次神里流·镜花。
 * 装备有此牌的神里绫人触发泷廻鉴花的效果时：对于生命值不多于6的敌人伤害额外+2。
 * （牌组中包含神里绫人，才能加入牌组）
 */
define card {
  id 212061 as private KyoukaFuushi;
  until "v6.2.0";
  cost DiceType.Hydro, 3;
  talent KamisatoAyato {
    on enter {
      :useSkill(KamisatoArtKyouka);
    }
  }
}

/**
 * @id 13083
 * @name 凭此结契
 * @description
 * 造成3点火元素伤害，本角色附属丹火印和灼灼。
 */
define skill {
  id 13083 as private DoneDeal;
  until "v6.2.0";
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :characterStatus(ScarletSeal);
  :characterStatus(Brilliance);
}

/**
 * @id 1311
 * @name 托马
 * @description
 * 渡来介者，赤袖丹心。
 */
define character {
  id 1311 as private Thoma;
  until "v6.2.0";
  tags pyro, pole, inazuma;
  health 10;
  energy 2;
  skills SwiftshatterSpear, BlazingBlessing, CrimsonOoyoroi;
}

/**
 * @id 1701
 * @name 柯莱
 * @description
 * 「大声喊出卡牌的名字会让它威力加倍…这一定是虚构的吧？」
 */
define character {
  id 1701 as private Collei;
  until "v6.2.0";
  tags dendro, bow, sumeru;
  health 10;
  energy 2;
  skills SupplicantsBowmanship, FloralBrush, TrumpcardKitty;
}

/**
 * @id 217011
 * @name 飞叶迴斜
 * @description
 * 战斗行动：我方出战角色为柯莱时，装备此牌。
 * 柯莱装备此牌后，立刻使用一次拂花偈叶。
 * 装备有此牌的柯莱使用了拂花偈叶的回合中，我方角色的技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * （牌组中包含柯莱，才能加入牌组）
 */
define card {
  id 217011 as private FloralSidewinder;
  until "v6.2.0";
  cost DiceType.Dendro, 4;
  talent Collei {
    on enter {
      :useSkill(FloralBrush);
    }
  }
}

/**
 * @id 2206
 * @name 水形幻人
 * @description
 * 由无数的水滴凝聚成的，初具人形的魔物。
 */
define character {
  id 2206 as private HydroTulpa;
  until "v6.2.0";
  tags hydro, monster;
  health 12;
  energy 3;
  skills SavageSwell, StormSurge, ThunderingTide, BranchingFlow;
}

/**
 * @id 2305
 * @name 蚀灭的源焰之主
 * @description
 * 被称为深渊浮灭主亦被称为「古斯托特」的虚界魔物，拥有侵蚀地脉之中的回忆并将之凝聚为实体的如同灾厄的权能。
 */
define character {
  id 2305 as private LordOfErodedPrimalFire;
  until "v6.2.0";
  tags pyro, monster;
  health 12;
  energy 2;
  skills VoidClawStrike, ErodedFlamingFeathers, SeveringPrimalFire, ResentmentPassive;
}

/**
 * @id 311308
 * @name 「究极霸王超级魔剑」
 * @description
 * 此牌会记录本局游戏中你打出过的名称不存在于本局最初牌组中的不同名的行动牌数量，称为「声援」。
 * 如果此牌的「声援」至少为2/4/8，则角色造成的伤害+1/2/3。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 * 【此卡含描述变量】
 */
define card {
  id 311308 as private UltimateOverlordsMegaMagicSword;
  until "v6.2.0";
  cost DiceType.Aligned, 2;
  weapon claymore {
    variable supp, 0;
    associateExtension NonInitialPlayedCardExtension;
    replaceDescription "[GCG_TOKEN_COUNTER]", ((_, { area }, ext) => ext.defIds[area.who].length);
    on enter {
      :setVariable("supp", :getExtensionState().defIds[:self.who].length);
    }
    on playCard {
      :setVariable("supp", :getExtensionState().defIds[:self.who].length);
    }
    on increaseSkillDamage {
      const supp = :getVariable("supp");
      if (supp >= 8) {
        :e.increaseDamage(3);
      } else if (supp >= 4) {
        :e.increaseDamage(2);
      } else if (supp >= 2) {
        :e.increaseDamage(1);
      }
    }
  }
}

/**
 * @id 332028
 * @name 机关铸成之链
 * @description
 * 目标我方角色每次受到伤害或治疗后：累积1点「备战度」（最多累积2点）。
 * 我方打出原本费用不多于「备战度」的「武器」或「圣遗物」时：移除所有「备战度」，以免费打出该牌。
 */
const [MachineAssemblyLine] = card(332028)
  .until("v6.2.0")
  .addTarget("my characters")
  .toStatus(303228, "@targets.0")
  .variable("readiness", 0)
  .on("damagedOrHealed")
  .addVariableWithMax("readiness", 1, 2)
  .once("deductOmniDiceCard", (c, e) =>
    e.hasOneOfCardTag("weapon", "artifact") &&
    e.currentDiceCostSize() <= c.getVariable("readiness"))
  .do((c, e) => {
    e.deductOmniCost(e.diceCostSize());
    c.setVariable("readiness", 0);
  })
  .done();

/**
 * @id 303236
 * @name 「看到那小子挣钱…」（生效中）
 * @description
 * 本回合中，每当对方获得2个元素骰时：你获得1个万能元素。（此效果提供的元素骰除外）
 */
define combatStatus {
  id 303236 as private IdRatherLoseMoneyMyselfInEffect;
  oneDuration;
  variable count, 0;
  on generateDice {
    when :( :e.who !== :self.who && :e.via.caller.definition.id !== :self.definition.id );
    listenTo all;
    :addVariable("count", 1);
    if (:getVariable("count") === 2) {
      :generateDice(DiceType.Omni, 1);
      :setVariable("count", 0);
    }
  }
}

/**
 * @id 321032
 * @name 沉玉谷
 * @description
 * 冒险经历达到2时：生成2张手牌沉玉茶露。
 * 冒险经历达到4时：我方获得3层高效切换和敏捷切换。
 * 冒险经历达到7时：我方全体角色附着水元素，治疗我方受伤最多的角色至最大生命值，并使其获得2点最大生命值，然后弃置此牌。
 */
define card {
  id 321032 as private ChenyuVale;
  until "v6.2.0";
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
      when :( :getVariable("exp") >= 7 );
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
 * @id 332041
 * @name 强劲冲浪拍档！
 * @description
 * 双方场上至少存在合计2个「召唤物」时，才能打出：随机触发我方和敌方各1个「召唤物」的「结束阶段」效果。
 */
define card {
  id 332041 as private UltimateSurfingBuddy;
  until "v6.2.0";
  filter :( :$$(`all summons`).length >= 2 );
  :abortPreview();
  const mySummons = :$$(`my summons`);
  if (mySummons.length > 0) {
    const mySummon = :random(mySummons);
    :triggerEndPhaseSkill(mySummon);
  }
  const oppSummons = :$$(`opp summons`);
  if (oppSummons.length > 0) {
    const oppSummon = :random(oppSummons);
    :triggerEndPhaseSkill(oppSummon);
  }
}
