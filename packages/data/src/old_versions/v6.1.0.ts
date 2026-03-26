import { card, character, combatStatus, DamageType, skill, summon } from "@gi-tcg/core/builder";
import { DisposedSupportAndSummonsCountExtension } from "../cards/event/other";
import { Itzpapa, NightsoulsBlessing, OpalShield } from "../characters/cryo/citlali";
import { CaloricBalancingPlan01, KineticEnergyScale, TeachingsOfTheCollectiveOfPlenty, ThunderboltRush, WeightedSpike } from "../characters/electro/iansan";
import { ArkheSeatsSacredAndSecular, LetThePeopleRejoice, SalonSolitaireOusia, SalonSolitairePneuma, Skill12114, SoloistsSolicitation, SoloistsSolicitationOusia } from "../characters/hydro/furina";
import { AllIsAsh, Arlecchino, BalemoonRising, InvitationToABeheading, TheBalemoonAloneMayKnowPassive01, TheBalemoonAloneMayKnowPassive03 } from "../characters/pyro/arlecchino";
import { BondOfLife } from "../commons";

/**
 * @id 11142
 * @name 霜昼黑星
 * @description
 * 造成2点冰元素伤害。
 * 自身进入夜魂加持，并获得1点「夜魂值」；生成1点白曜护盾和伊兹帕帕。（角色进入夜魂加持后不可使用此技能）
 */
const DawnfrostDarkstar = skill(11142)
  .until("v6.1.0")
  .type("elemental")
  .costCryo(3)
  .filter((c) => !c.self.hasStatus(NightsoulsBlessing))
  .damage(DamageType.Cryo, 2)
  .gainNightsoul("@self", 1)
  .combatStatus(OpalShield)
  .combatStatus(Itzpapa)
  .done();

/**
 * @id 1211
 * @name 芙宁娜
 * @description
 * 永世领唱，无尽圆舞。
 */
const FurinaPneuma = character(1211)
  .until("v6.1.0")
  .tags("hydro", "sword", "fontaine", "pneuma")
  .health(10)
  .energy(2)
  .skills(SoloistsSolicitation, SalonSolitairePneuma, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular)
  .done();

/**
 * @id 1212
 * @name 芙宁娜
 * @description
 *
 */
const FurinaOusia = character(1212)
  .until("v6.1.0")
  .tags("hydro", "sword", "fontaine", "ousia")
  .health(10)
  .energy(2)
  .skills(SoloistsSolicitationOusia, SalonSolitaireOusia, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular)
  .done();

/**
 * @id 113141
 * @name 血偿勒令
 * @description
 * 我方角色受到伤害后：我方受到伤害的角色和敌方阿蕾奇诺均附属1层生命之契。
 * 可用次数：5
 */
const BlooddebtDirective = combatStatus(113141)
  .until("v6.1.0")
  .on("damaged")
  .usage(5)
  .do((c, e) => {
    if (e.target.variables.alive) {
      c.characterStatus(BondOfLife, e.target);
    }
    c.characterStatus(BondOfLife, `opp characters with definition id ${Arlecchino}`);
  })
  .done();

/**
 * @id 14143
 * @name 力的三原理
 * @description
 * 造成3点雷元素伤害，自身进入夜魂加持，获得1点「夜魂值」，生成动能标示。
 */
const TheThreePrinciplesOfPower = skill(14143)
  .until("v6.1.0")
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 3)
  .gainNightsoul("@self", 1)
  .if((c) => c.self.hasEquipment(TeachingsOfTheCollectiveOfPlenty))
  .combatStatus(KineticEnergyScale, "my", {
    overrideVariables: { usage: 3 }
  })
  .else()
  .combatStatus(KineticEnergyScale)
  .done();

/**
 * @id 1414
 * @name 伊安珊
 * @description
 * 早睡早起，低糖低盐。
 */
const Iansan = character(1414)
  .until("v6.1.0")
  .tags("electro", "pole", "natlan")
  .health(12)
  .energy(2)
  .skills(WeightedSpike, ThunderboltRush, TheThreePrinciplesOfPower, CaloricBalancingPlan01)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 14155
 * @name 闪烈降临·大火山崩落
 * @description
 * 造成2点雷元素伤害，此技能视为下落攻击。
 */
const GuardianVentVolcanoKablam = skill(14155)
  .until("v6.1.0")
  .type("burst")
  .prepared()
  .forcePlunging()
  .damage(DamageType.Electro, 2)
  .done();

/**
 * @id 333027
 * @name 纵声欢唱
 * @description
 * 所有我方角色获得饱腹，抓3张牌，下2次切换角色少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
const [SingYourHeartOut] = card(333027)
  .until("v6.1.0")
  .costVoid(3)
  .combatFood({ satiatedFilter: "allNot" })
  .drawCards(3)
  .toCombatStatus(303321)
  .on("deductOmniDiceSwitch")
  .usage(2)
  .deductOmniCost(1)
  .done();

/**
 * @id 303245
 * @name 「邪龙」
 * @description
 * 结束阶段：造成1点穿透伤害。
 * 可用次数：1
 */
const FellDragon = summon(303245)
  .until("v6.1.0")
  .variable("effect", 1, { forceOverwrite: true })
  .associateExtension(DisposedSupportAndSummonsCountExtension)
  .hint(DamageType.Physical, (c, e) => e.variables.effect)
  .on("endPhase")
  .usage(1)
  .do((c, e) => {
    c.damage(DamageType.Piercing, c.getVariable("effect"));
  })
  .on("enter")
  .do((c, e) => {
    const ext = c.getExtensionState();
    const addUsage = Math.min(ext.disposedSupportCount[c.self.who], 5);
    const addDmg = Math.min(ext.disposedSummonsCount[c.self.who], 5);
    c.addVariable("usage", addUsage);
    c.addVariable("effect", addDmg);
  })
  .done();
