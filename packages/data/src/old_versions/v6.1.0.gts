import { $, DamageType, DiceType } from "@gi-tcg/core/data";
import { DisposedSupportAndSummonsCountExtension } from "../cards/event/other.gts";
import {
  Itzpapa,
  NightsoulsBlessing as CitlaliNightsoulsBlessing,
  OpalShield,
} from "../characters/cryo/citlali.gts";
import {
  CaloricBalancingPlan01,
  KineticEnergyScale,
  NightsoulsBlessing as IansanNightsoulsBlessing,
  TeachingsOfTheCollectiveOfPlenty,
  ThunderboltRush,
  WeightedSpike,
} from "../characters/electro/iansan.gts";
import {
  ArkheSeatsSacredAndSecular,
  LetThePeopleRejoice,
  SalonSolitaireOusia,
  SalonSolitairePneuma,
  Skill12114,
  SoloistsSolicitation,
  SoloistsSolicitationOusia,
} from "../characters/hydro/furina.gts";
import { Arlecchino } from "../characters/pyro/arlecchino.gts";
import { BondOfLife } from "../commons.gts";
import { SingYourHeartOutInEffect } from "../cards/event/food.gts";

/**
 * @id 11142
 * @name 霜昼黑星
 * @description
 * 造成2点冰元素伤害。
 * 自身进入夜魂加持，并获得1点「夜魂值」；生成1点白曜护盾和伊兹帕帕。（角色进入夜魂加持后不可使用此技能）
 */
define skill {
  id 11142 as private DawnfrostDarkstar;
  until "v6.1.0";
  skillType elemental;
  cost DiceType.Cryo, 3;
  filter :( !:self.hasStatus(CitlaliNightsoulsBlessing) );
  :damage(DamageType.Cryo, 2);
  :gainNightsoul(:self, 1);
  :combatStatus(OpalShield);
  :combatStatus(Itzpapa);
};

/**
 * @id 1211
 * @name 芙宁娜
 * @description
 * 永世领唱，无尽圆舞。
 */
define character {
  id 1211 as private FurinaPneuma;
  until "v6.1.0";
  tags hydro, sword, fontaine, pneuma;
  health 10;
  energy 2;
  skills SoloistsSolicitation,
    SalonSolitairePneuma,
    LetThePeopleRejoice,
    Skill12114,
    ArkheSeatsSacredAndSecular;
};

/**
 * @id 1212
 * @name 芙宁娜
 * @description
 *
 */
define character {
  id 1212 as private FurinaOusia;
  until "v6.1.0";
  tags hydro, sword, fontaine, ousia;
  health 10;
  energy 2;
  skills SoloistsSolicitationOusia,
    SalonSolitaireOusia,
    LetThePeopleRejoice,
    Skill12114,
    ArkheSeatsSacredAndSecular;
};

/**
 * @id 113141
 * @name 血偿勒令
 * @description
 * 我方角色受到伤害后：我方受到伤害的角色和敌方阿蕾奇诺均附属1层生命之契。
 * 可用次数：5
 */
define combatStatus {
  id 113141 as private BlooddebtDirective;
  until "v6.1.0";
  on damaged {
    usage 5;
    if (:e.target.variables.alive) {
      :characterStatus(BondOfLife, :e.target);
    }
    :characterStatus(BondOfLife, $.opp.character.def(Arlecchino));
  };
};

/**
 * @id 14143
 * @name 力的三原理
 * @description
 * 造成3点雷元素伤害，自身进入夜魂加持，获得1点「夜魂值」，生成动能标示。
 */
define skill {
  id 14143 as private TheThreePrinciplesOfPower;
  until "v6.1.0";
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 3);
  :gainNightsoul(:self, 1);
  if (:self.hasEquipment(TeachingsOfTheCollectiveOfPlenty)) {
    :combatStatus(KineticEnergyScale, "my", {
      overrideVariables: { usage: 3 },
    });
  } else {
    :combatStatus(KineticEnergyScale);
  }
};

/**
 * @id 1414
 * @name 伊安珊
 * @description
 * 早睡早起，低糖低盐。
 */
define character {
  id 1414 as private Iansan;
  until "v6.1.0";
  tags electro, pole, natlan;
  health 12;
  energy 2;
  skills WeightedSpike,
    ThunderboltRush,
    TheThreePrinciplesOfPower,
    CaloricBalancingPlan01;
  associateNightsoul IansanNightsoulsBlessing;
};

/**
 * @id 14155
 * @name 闪烈降临·大火山崩落
 * @description
 * 造成2点雷元素伤害，此技能视为下落攻击。
 */
define skill {
  id 14155 as private GuardianVentVolcanoKablam;
  until "v6.1.0";
  skillType burst;
  prepared;
  forcePlunging;
  :damage(DamageType.Electro, 2);
};

/**
 * @id 333027
 * @name 纵声欢唱
 * @description
 * 所有我方角色获得饱腹，抓3张牌，下2次切换角色少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333027 as private SingYourHeartOut;
  until "v6.1.0";
  cost DiceType.Void, 3;
  food combat {
    satiatedFilter "allNot";
  };
  :drawCards(3);
  :combatStatus(SingYourHeartOutInEffect);
};

/**
 * @id 303245
 * @name 「邪龙」
 * @description
 * 结束阶段：造成1点穿透伤害。
 * 可用次数：1
 */
define summon {
  id 303245 as private FellDragon;
  until "v6.1.0";
  variable effect, 1 {
    forceOverwrite;
  };
  associateExtension DisposedSupportAndSummonsCountExtension;
  hint DamageType.Physical, ((c, e) => e.variables.effect);
  on endPhase {
    usage 1;
    :damage(DamageType.Piercing, :getVariable("effect"));
  };
  on selfEnter {
    const ext = :getExtensionState();
    const addUsage = ext.disposedSupportCount[:self.who];
    const addDmg = ext.disposedSummonsCount[:self.who];
    :addVariableWithMax("usage", addUsage, 6);
    :addVariableWithMax("effect", addDmg, 6);
  };
};
