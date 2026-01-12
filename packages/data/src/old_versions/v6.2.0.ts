import { card, character, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { CoolcolorCapture, FramingFreezingPointComposition, StillPhotoComprehensiveConfirmation } from "../characters/cryo/charlotte";
import { KamisatoArtKyouka, KamisatoArtMarobashi, KamisatoArtSuiyuu } from "../characters/hydro/kamisato_ayato";
import { Brilliance, ScarletSeal } from "../characters/pyro/yanfei";
import { BlazingBlessing, CrimsonOoyoroi, SwiftshatterSpear } from "../characters/pyro/thoma";
import { FloralBrush, SupplicantsBowmanship, TrumpcardKitty } from "../characters/dendro/collei";
import { BranchingFlow, SavageSwell, StormSurge, ThunderingTide } from "../characters/hydro/hydro_tulpa";
import { ErodedFlamingFeathers, ResentmentPassive, SeveringPrimalFire, VoidClawStrike } from "../characters/pyro/lord_of_eroded_primal_fire";
import { NonInitialPlayedCardExtension } from "../cards/equipment/weapon/claymore";
import { ChenyuBrew } from "../cards/event/food";
import { AgileSwitch, EfficientSwitch } from "../commons";

/**
 * @id 1110
 * @name 夏洛蒂
 * @description
 * 「真实至上，故事超群！」
 */
const Charlotte = character(1110)
  .until("v6.2.0")
  .tags("cryo", "catalyst", "fontaine", "ousia")
  .health(10)
  .energy(2)
  .skills(CoolcolorCapture, FramingFreezingPointComposition, StillPhotoComprehensiveConfirmation)
  .done();

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
const TakimeguriKanka = status(112061)
  .until("v6.2.0")
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(3)
  .increaseDamage(1)
  .if((c, e) => c.self.master.hasEquipment(KyoukaFuushi) && e.target.health <= 6)
  .increaseDamage(2)
  .done();

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
const KamisatoAyato = character(1206)
  .until("v6.2.0")
  .tags("hydro", "sword", "inazuma")
  .health(11)
  .energy(2)
  .skills(KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu)
  .done();

/**
 * @id 212061
 * @name 镜华风姿
 * @description
 * 战斗行动：我方出战角色为神里绫人时，装备此牌。
 * 神里绫人装备此牌后，立刻使用一次神里流·镜花。
 * 装备有此牌的神里绫人触发泷廻鉴花的效果时：对于生命值不多于6的敌人伤害额外+2。
 * （牌组中包含神里绫人，才能加入牌组）
 */
const KyoukaFuushi = card(212061)
  .until("v6.2.0")
  .costHydro(3)
  .talent(KamisatoAyato)
  .on("enter")
  .useSkill(KamisatoArtKyouka)
  .done();

/**
 * @id 13083
 * @name 凭此结契
 * @description
 * 造成3点火元素伤害，本角色附属丹火印和灼灼。
 */
const DoneDeal = skill(13083)
  .until("v6.2.0")
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 3)
  .characterStatus(ScarletSeal)
  .characterStatus(Brilliance)
  .done();

/**
 * @id 1311
 * @name 托马
 * @description
 * 渡来介者，赤袖丹心。
 */
const Thoma = character(1311)
  .until("v6.2.0")
  .tags("pyro", "pole", "inazuma")
  .health(10)
  .energy(2)
  .skills(SwiftshatterSpear, BlazingBlessing, CrimsonOoyoroi)
  .done();

/**
 * @id 1701
 * @name 柯莱
 * @description
 * 「大声喊出卡牌的名字会让它威力加倍…这一定是虚构的吧？」
 */
const Collei = character(1701)
  .until("v6.2.0")
  .tags("dendro", "bow", "sumeru")
  .health(10)
  .energy(2)
  .skills(SupplicantsBowmanship, FloralBrush, TrumpcardKitty)
  .done();

/**
 * @id 217011
 * @name 飞叶迴斜
 * @description
 * 战斗行动：我方出战角色为柯莱时，装备此牌。
 * 柯莱装备此牌后，立刻使用一次拂花偈叶。
 * 装备有此牌的柯莱使用了拂花偈叶的回合中，我方角色的技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * （牌组中包含柯莱，才能加入牌组）
 */
const FloralSidewinder = card(217011)
  .until("v6.2.0")
  .costDendro(4)
  .talent(Collei)
  .on("enter")
  .useSkill(FloralBrush)
  .done();

/**
 * @id 2206
 * @name 水形幻人
 * @description
 * 由无数的水滴凝聚成的，初具人形的魔物。
 */
const HydroTulpa = character(2206)
  .until("v6.2.0")
  .tags("hydro", "monster")
  .health(12)
  .energy(3)
  .skills(SavageSwell, StormSurge, ThunderingTide, BranchingFlow)
  .done();

/**
 * @id 2305
 * @name 蚀灭的源焰之主
 * @description
 * 被称为深渊浮灭主亦被称为「古斯托特」的虚界魔物，拥有侵蚀地脉之中的回忆并将之凝聚为实体的如同灾厄的权能。
 */
const LordOfErodedPrimalFire = character(2305)
  .until("v6.2.0")
  .tags("pyro", "monster")
  .health(12)
  .energy(2)
  .skills(VoidClawStrike, ErodedFlamingFeathers, SeveringPrimalFire, ResentmentPassive)
  .done();

/**
 * @id 311308
 * @name 「究极霸王超级魔剑」
 * @description
 * 此牌会记录本局游戏中你打出过的名称不存在于本局最初牌组中的不同名的行动牌数量，称为「声援」。
 * 如果此牌的「声援」至少为2/4/8，则角色造成的伤害+1/2/3。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 * 【此卡含描述变量】
 */
const UltimateOverlordsMegaMagicSword = card(311308)
  .until("v6.2.0")
  .costSame(2)
  .weapon("claymore")
  .variable("supp", 0)
  .associateExtension(NonInitialPlayedCardExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.defIds[area.who].size)
  .on("enter")
  .do((c) => {
    c.setVariable("supp", c.getExtensionState().defIds[c.self.who].size);
  })
  .on("playCard")
  .do((c) => {
    c.setVariable("supp", c.getExtensionState().defIds[c.self.who].size);
  })
  .on("increaseSkillDamage")
  .do((c, e) => {
    const supp = c.getVariable("supp");
    if (supp >= 8) {
      e.increaseDamage(3);
    } else if (supp >= 4) {
      e.increaseDamage(2);
    } else if (supp >= 2) {
      e.increaseDamage(1);
    }
  })
  .done();

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
    e.originalDiceCostSize() <= c.getVariable("readiness"))
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
const IdRatherLoseMoneyMyselfInEffect = combatStatus(303236)
  .oneDuration()
  .variable("count", 0)
  .on("generateDice", (c, e) => e.who !== c.self.who && e.via.caller.definition.id !== c.self.definition.id)
  .listenToAll()
  .do((c) => {
    c.addVariable("count", 1);
    if (c.getVariable("count") === 2) {
      c.generateDice(DiceType.Omni, 1);
      c.setVariable("count", 0);
    }
  })
  .done();

/**
 * @id 321032
 * @name 沉玉谷
 * @description
 * 冒险经历达到2时：生成2张手牌沉玉茶露。
 * 冒险经历达到4时：我方获得3层高效切换和敏捷切换。
 * 冒险经历达到7时：我方全体角色附着水元素，治疗我方受伤最多的角色至最大生命值，并使其获得2点最大生命值，然后弃置此牌。
 */
const ChenyuVale = card(321032)
  .until("v6.2.0")
  .adventureSpot()
  .on("adventure", (c) => c.getVariable("exp") >= 2)
  .usage(1, { name: "stage1", visible: false })
  .createHandCard(ChenyuBrew)
  .createHandCard(ChenyuBrew)
  .on("adventure", (c) => c.getVariable("exp") >= 4)
  .usage(1, { name: "stage2", visible: false })
  .combatStatus(EfficientSwitch, "my", {
    overrideVariables: {
      usage: 3
    }
  })
  .combatStatus(AgileSwitch, "my", {
    overrideVariables: {
      usage: 3
    }
  })
  .on("adventure", (c) => c.getVariable("exp") >= 7)
  .usage(1, { name: "stage3", visible: false })
  .apply(DamageType.Hydro, "all my characters")
  .do((c) => {
    const targetCh = c.$(`my characters order by health - maxHealth limit 1`);
    if (!targetCh) {
      return;
    }
    const healValue = 999; // interesting.
    c.heal(healValue, targetCh);
    c.increaseMaxHealth(2, targetCh);
    c.finishAdventure();
  })
  .done();

/**
 * @id 332041
 * @name 强劲冲浪拍档！
 * @description
 * 双方场上至少存在合计2个「召唤物」时，才能打出：随机触发我方和敌方各1个「召唤物」的「结束阶段」效果。
 */
const UltimateSurfingBuddy = card(332041)
  .until("v6.2.0")
  .filter((c) => c.$$(`all summons`).length >= 2)
  .abortPreview()
  .do((c) => {
    const mySummons = c.$$(`my summons`);
    if (mySummons.length > 0) {
      const mySummon = c.random(mySummons);
      c.triggerEndPhaseSkill(mySummon);
    }
    const oppSummons = c.$$(`opp summons`);
    if (oppSummons.length > 0) {
      const oppSummon = c.random(oppSummons);
      c.triggerEndPhaseSkill(oppSummon);
    }
  })
  .done();
