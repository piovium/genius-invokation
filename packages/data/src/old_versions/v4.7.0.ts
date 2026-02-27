import { Aura, CardHandle, DamageType, DiceType, card, combatStatus, skill, status, summon } from "@gi-tcg/core/builder";
import { BonecrunchersEnergyBlockCombatStatus } from "../cards/event/other";
import { Cyno } from "../characters/electro/cyno";
import { LightningRoseSummon } from "../characters/electro/lisa";
import { DominusLapidisStrikingStone, Zhongli } from "../characters/geo/zhongli";
import { AutumnWhirlwind } from "../characters/anemo/kaedehara_kazuha";
import { AbiogenesisSolarIsotoma, Albedo } from "../characters/geo/albedo";
import { DecorousHarmony } from "../characters/geo/yun_jin";
import { DendroCore } from "../commons";
import { BountifulCore } from "../characters/hydro/nilou";
import { TheArtOfBudgeting, TheArtOfBudgetingInEffect, ShouldTriggerTalent } from "../characters/dendro/kaveh";
import { AnomalousAnatomy, LightlessFeeding } from "../characters/hydro/alldevouring_narwhal";

/**
 * @id 124051
 * @name 噬骸能量块
 * @description
 * 随机舍弃1张原本元素骰费用最高的手牌，生成1个我方出战角色类型的元素骰。如果我方出战角色是「圣骸兽」角色，则使其获得1点充能。（每回合最多打出1张）
 */
const BonecrunchersEnergyBlock = card(124051)
  .until("v4.7.0")
  .unobtainable()
  .filter((c) => !c.$(`my combat status with definition id ${BonecrunchersEnergyBlockCombatStatus}`))
  .do((c) => {
    c.disposeMaxCostHands(1);
    const activeCh = c.$("my active")!;
    c.generateDice(activeCh.element(), 1);
    if (activeCh.definition.tags.includes("sacread")) {
      c.gainEnergy(1, activeCh);
    }
    c.combatStatus(BonecrunchersEnergyBlockCombatStatus)
  })
  .done();

/**
 * @id 25032
 * @name 盘绕风引
 * @description
 * 造成2点风元素伤害，抓1张噬骸能量块；然后，手牌中每有1张噬骸能量块，抓1张牌（每回合最多抓2张)。
 */
const SwirlingSquall = skill(25032)
  .until("v4.7.0")
  .type("elemental")
  .costAnemo(3)
  .do((c) => {
    c.damage(DamageType.Anemo, 2);
    c.drawCards(1, { withDefinition: BonecrunchersEnergyBlock });
    const cards = c.player.hands.filter((card) => card.definition.id === BonecrunchersEnergyBlock);
    const drawn = c.self.getVariable("elementalSkillDrawCardsCount");
    const count = Math.min(cards.length, 2 - drawn);
    c.drawCards(count);
    c.self.addVariable("elementalSkillDrawCardsCount", count);
  })
  .done();

/**
 * @id 116073
 * @name 飞云旗阵
 * @description
 * 我方角色进行普通攻击时：造成的伤害+1。
 * 如果我方手牌数量不多于1，则此技能少花费1个元素骰。
 * 可用次数：1（可叠加，最多叠加到4次）
 */
const FlyingCloudFlagFormation = combatStatus(116073)
  .until("v4.7.0")
  .on("deductOmniDiceSkill", (c, e) => e.isSkillType("normal") && c.player.hands.length <= 1)
  .deductOmniCost(1)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usageCanAppend(1, 4)
  .do((c, e) => {
    if (c.$(`my equipment with definition id ${DecorousHarmony}`) && c.player.hands.length === 0) {
      e.increaseDamage(3);
    } else {
      e.increaseDamage(1);
    }
  })
  .done();

/**
 * @id 117082
 * @name 迸发扫描
 * @description
 * 双方选择行动前：如果我方场上存在草原核或丰穰之核，则使其可用次数-1，并舍弃我方牌库顶的1张卡牌。然后，造成所舍弃卡牌原本元素骰费用+1的草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
const BurstScan = combatStatus(117082)
  .until("v4.7.0")
  .on("beforeAction", (c) => c.$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`))
  .listenToAll()
  .do((c) => {
    c.disposeCard(c.player.pile[0]);
  })
  .on("disposeCard", (c, e) => e.via?.caller.id === c.self.id)
  .usageCanAppend(1, 3)
  .do((c, e) => {
    c.$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`)?.consumeUsage(1);
    const cost = e.entity.diceCost();
    c.damage(DamageType.Dendro, cost + 1);
    c.emitCustomEvent(ShouldTriggerTalent, e.entity.latest());
  })
  .done();

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+5）。然后舍弃1张原本元素骰费用最高的手牌。
 */
const StarfallShower = skill(22042)
  .until("v4.7.0")
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    const st = c.self.hasStatus(AnomalousAnatomy);
    const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 5) : 0;
    c.damage(DamageType.Hydro, 1 + extraDmg);
    const [card] = c.disposeMaxCostHands(1);
    if (card) {
      if (c.self.hasEquipment(LightlessFeeding)) {
        c.heal(card.diceCost(), "@self");
      }
    }
  })
  .done();

/**
 * @id 14093
 * @name 蔷薇的雷光
 * @description
 * 造成2点雷元素伤害，召唤蔷薇雷光。
 */
const LightningRose = skill(14093)
  .until("v4.7.0")
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 2)
  .summon(LightningRoseSummon)
  .done();

/**
 * @id 115051
 * @name 乱岚拨止
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为风元素伤害，且伤害+1。
 * 角色使用技能后：移除此效果。
 */
const MidareRanzan = status(115051)
  .until("v4.7.0")
  .on("modifySkillDamageType", (c, e) => e.viaPlungingAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Anemo)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill")
  .dispose()
  .done();

/**
 * @id 115053
 * @name 乱岚拨止·冰
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为冰元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
const MidareRanzanCryo = status(115053)
  .until("v4.7.0")
  .on("modifySkillDamageType", (c, e) => e.viaPlungingAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Cryo)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill")
  .dispose()
  .done();

/**
 * @id 115056
 * @name 乱岚拨止·雷
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为雷元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
const MidareRanzanElectro = status(115056)
  .until("v4.7.0")
  .on("modifySkillDamageType", (c, e) => e.viaPlungingAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill")
  .dispose()
  .done();

/**
 * @id 115054
 * @name 乱岚拨止·水
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为水元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
const MidareRanzanHydro = status(115054)
  .until("v4.7.0")
  .on("modifySkillDamageType", (c, e) => e.viaPlungingAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill")
  .dispose()
  .done();

/**
 * @id 115055
 * @name 乱岚拨止·火
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为火元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
const MidareRanzanPyro = status(115055)
  .until("v4.7.0")
  .on("modifySkillDamageType", (c, e) => e.viaPlungingAttack() && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .increaseDamage(1)
  .on("useSkill")
  .dispose()
  .done();
  
/**
 * @id 15052
 * @name 千早振
 * @description
 * 造成3点风元素伤害，本角色附属乱岚拨止。
 * 如果此技能引发了扩散，则将乱岚拨止转换为被扩散的元素。
 * 此技能结算后：我方切换到后一个角色。
 */
const Chihayaburu = skill(15052)
  .until("v4.7.0")
  .type("elemental")
  .costAnemo(3)
  .do((c) => {
    const aura = c.$("opp active")?.aura;
    let midareRanzan;
    switch (aura) {
      case Aura.Cryo:
      case Aura.CryoDendro:
        midareRanzan = MidareRanzanCryo;
        break;
      case Aura.Electro:
        midareRanzan = MidareRanzanElectro;
        break;
      case Aura.Hydro:
        midareRanzan = MidareRanzanHydro;
        break;
      case Aura.Pyro:
        midareRanzan = MidareRanzanPyro;
        break;
      default:
        midareRanzan = MidareRanzan;
        break;
    }
    c.characterStatus(midareRanzan);
  })
  .damage(DamageType.Anemo, 3)
  .done();

/**
 * @id 15053
 * @name 万叶之一刀
 * @description
 * 造成3点风元素伤害，召唤流风秋野。
 */
const KazuhaSlash = skill(15053)
  .until("v4.7.0")
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 3)
  .summon(AutumnWhirlwind)
  .done();

/**
 * @id 116041
 * @name 阳华
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：3
 * 此召唤物在场时：我方角色进行下落攻击时少花费1个无色元素。（每回合1次）
 */
const SolarIsotoma = summon(116041)
  .until("v4.7.0")
  .endPhaseDamage(DamageType.Geo, 1)
  .usage(3)
  .on("deductVoidDiceSkill", (c, e) => e.isPlungingAttack())
  .usagePerRound(1)
  .deductVoidCost(1)
  .done();

/**
 * @id 216041
 * @name 神性之陨
 * @description
 * 战斗行动：我方出战角色为阿贝多时，装备此牌。
 * 阿贝多装备此牌后，立刻使用一次创生法·拟造阳华。
 * 装备有此牌的阿贝多在场时，如果我方场上存在阳华，则我方角色进行下落攻击时造成的伤害+1。
 * （牌组中包含阿贝多，才能加入牌组）
 */
const DescentOfDivinity = card(216041)
  .until("v4.7.0")
  .costGeo(3)
  .talent(Albedo)
  .on("enter")
  .useSkill(AbiogenesisSolarIsotoma)
  .on("increaseSkillDamage", (c, e) =>
    c.$(`my summons with definition id ${SolarIsotoma}`) &&
    e.viaPlungingAttack())
  .listenToPlayer()
  .increaseDamage(1)
  .done();

/**
 * @id 216031
 * @name 炊金馔玉
 * @description
 * 战斗行动：我方出战角色为钟离时，装备此牌。
 * 钟离装备此牌后，立刻使用一次地心·磐礴。
 * 我方出战角色在护盾角色状态或护盾出战状态的保护下时，我方召唤物造成的岩元素伤害+1。
 * （牌组中包含钟离，才能加入牌组）
 */
const DominanceOfEarth = card(216031)
  .until("v4.7.0")
  .costGeo(5)
  .talent(Zhongli)
  .on("enter")
  .useSkill(DominusLapidisStrikingStone)
  .on("increaseDamage", (c, e) => {
    return e.type === DamageType.Geo &&
      e.source.definition.type === "summon" &&
      !!c.$(`(my combat status with tag (shield)) or (status with tag (shield) at my active)`);
  })
  .increaseDamage(1)
  .done();

/**
 * @id 114041
 * @name 启途誓使
 * @description
 * 结束阶段：累积1级「凭依」。
 * 根据「凭依」级数，提供效果：
 * 大于等于2级：物理伤害转化为雷元素伤害；
 * 大于等于4级：造成的伤害+2；
 * 大于等于6级时：「凭依」级数-4。
 */
const PactswornPathclearer = status(114041)
  .until("v4.7.0")
  .variable("reliance", 0)
  .on("endPhase")
  .do((c) => {
    const newVal = c.getVariable("reliance") + 1;
    if (newVal >= 6) {
      c.setVariable("reliance", newVal - 4);
    } else {
      c.setVariable("reliance", newVal);
    }
  })
  .on("modifySkillDamageType", (c, e) => c.getVariable("reliance") >= 2 && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .on("increaseSkillDamage", (c, e) => c.getVariable("reliance") >= 4)
  .increaseDamage(2)
  .done();

/**
 * @id 14042
 * @name 秘仪·律渊渡魂
 * @description
 * 造成3点雷元素伤害。
 */
const SecretRiteChasmicSoulfarer = skill(14042)
  .until("v4.7.0")
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 3)
  .done();

/**
 * @id 14043
 * @name 圣仪·煟煌随狼行
 * @description
 * 造成4点雷元素伤害，
 * 启途誓使的「凭依」级数+2。
 */
const SacredRiteWolfsSwiftness = skill(14043)
  .until("v4.7.0")
  .type("burst")
  .costElectro(4)
  .costEnergy(2)
  .damage(DamageType.Electro, 4)
  .do((c) => {
    const status = c.self.hasStatus(PactswornPathclearer)!;
    const newVal = c.getVariable("reliance", status) + 2;
    if (newVal >= 6) {
      c.setVariable("reliance", newVal - 4, status);
    } else {
      c.setVariable("reliance", newVal, status);
    }
  })
  .done();

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数为偶数时，使用秘仪·律渊渡魂造成的伤害+1。
 * （牌组中包含赛诺，才能加入牌组）
 */
const FeatherfallJudgment = card(214041)
  .until("v4.7.0")
  .costElectro(3)
  .talent(Cyno)
  .on("enter")
  .useSkill(SecretRiteChasmicSoulfarer)
  .on("increaseSkillDamage", (c, e) => {
    const status = c.self.master.hasStatus(PactswornPathclearer)!;
    return c.getVariable("reliance", status) % 2 === 0 && e.via.definition.id === SecretRiteChasmicSoulfarer;
  })
  .increaseDamage(1)
  .done();

/**
 * @id 122021
 * @name 水光破镜
 * @description
 * 所附属角色受到的水元素伤害+1。
 * 持续回合：2
 * （同一方场上最多存在一个此状态）
 */
const Refraction = status(122021)
  .until("v4.7.0")
  .conflictWith(122022)
  .unique(122022)
  .duration(2)
  .on("increaseDamaged", (c, e) => e.type === DamageType.Hydro)
  .increaseDamage(1)
  .done();

/**
 * @id 332026
 * @name 坍陷与契机
 * @description
 * 我方至少剩余8个元素骰，且对方未宣布结束时，才能打出：本回合中，双方牌手进行「切换角色」行动时需要额外花费1个元素骰。
 */
const [FallsAndFortune] = card(332026)
  .until("v4.7.0")
  .costSame(1)
  .filter((c) => c.player.dice.length >= 8 && !c.oppPlayer.declaredEnd)
  .toCombatStatus(303226)
  .oneDuration()
  .on("addDice", (c, e) => e.action.type === "switchActive")
  .listenToAll()
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 303230
 * @name 海底宝藏
 * @description
 * 治疗我方出战角色1点，生成1个随机基础元素骰。
 */
const UnderseaTreasure = card(303230)
  .until("v4.7.0")
  .heal(1, "my active")
  .generateDice("randomElement", 1)
  .done();

/**
 * @id 332024
 * @name 琴音之诗
 * @description
 * 将一个我方角色所装备的「圣遗物」返回手牌。
 * 本回合中，我方下次打出「圣遗物」手牌时：少花费2个元素骰。
 */
const [Lyresong] = card(332024)
  .until("v4.7.0")
  .addTarget("my character has equipment with tag (artifact)")
  .do((c, e) => {
    e.targets[0].unequipArtifact();
  })
  .toCombatStatus(303224)
  .oneDuration()
  .once("deductOmniDiceCard", (c, e) => e.hasCardTag("artifact"))
  .deductOmniCost(2)
  .done();

/**
 * @id 323007
 * @name 流明石触媒
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
const LumenstoneAdjuvant = card(323007)
  .until("v4.7.0")
  .costSame(2)
  .support("item")
  .variable("playedCard", 0, { visible: false })
  .replaceDescription("[GCG_TOKEN_COUNTER]", (st, self) => self.variables.playedCard)
  .on("playCard", (c, e) => e.card.id !== c.self.id)
  .addVariable("playedCard", 1)
  .on("playCard", (c) => c.getVariable("playedCard") === 3)
  .usagePerRound(1)
  .usage(3)
  .drawCards(1)
  .generateDice(DiceType.Omni, 1)
  .on("actionPhase")
  .setVariable("playedCard", 0)
  .done();

/**
 * @id 321004
 * @name 晨曦酒庄
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。（每回合1次）
 */
const DawnWinery = card(321004)
  .until("v4.7.0")
  .costSame(2)
  .support("place")
  .on("deductOmniDiceSwitch")
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 323008
 * @name 苦舍桓
 * @description
 * 行动阶段开始时：舍弃最多2张元素骰费用最高的手牌，每舍弃1张，此牌就累积1点「记忆和梦」。（最多2点）
 * 我方角色使用技能时：如果我方本回合未打出过行动牌，则消耗1点「记忆和梦」，以使此技能少花费1个元素骰。
 */
const Kusava = card(323008)
  .until("v4.7.0")
  .support("item")
  .variable("memory", 0)
  .variable("cardPlayed", 0, { visible: false })
  .on("actionPhase")
  .do((c) => {
    const memory = c.getVariable("memory");
    if (memory < 2) {
      const disposed = c.disposeMaxCostHands(2 - memory);
      const count = disposed.length;
      c.addVariableWithMax("memory", count, 2);
    }
    c.setVariable("cardPlayed", 0);
  })
  .on("playCard")
  .setVariable("cardPlayed", 1)
  .on("deductOmniDiceSkill", (c, e) => !c.getVariable("cardPlayed") && c.getVariable("memory") > 0)
  .deductOmniCost(1)
  .addVariable("memory", -1)
  .done();
