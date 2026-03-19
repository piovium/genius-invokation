import { DamageType, DiceType, StatusHandle, SummonHandle, card, character, combatStatus, flip, skill, status, summon } from "@gi-tcg/core/builder";
import { MeleeStance, RangedStance, Tartaglia } from "../characters/hydro/tartaglia";
import { GardenOfPurity, KamisatoArtKyouka, KamisatoArtMarobashi, KyoukaFuushi } from "../characters/hydro/kamisato_ayato";
import { FatuiCryoCicinMage } from "../characters/cryo/fatui_cryo_cicin_mage";
import { Diona, IcyPaws } from "../characters/cryo/diona";
import { RainbowBladework } from "../characters/hydro/xingqiu";
import { ReviveOnCooldown } from "../cards/event/food";
import { Satiated } from "../commons";


/**
 * @id 12042
 * @name 魔王武装·狂澜
 * @description
 * 切换为近战状态，然后造成2点水元素伤害。
 */
const FoulLegacyRagingTide = skill(12042)
  .until("v4.0.0")
  .type("elemental")
  .costHydro(3)
  .characterStatus(MeleeStance)
  .damage(DamageType.Hydro, 2)
  .done();

/**
 * @id 112043
 * @name 断流
 * @description
 * 所附属角色被击倒后：对所在阵营的出战角色附属「断流」。
 * （处于「近战状态」的达达利亚攻击所附属角色时，会造成额外伤害。）
 * 持续回合：2
 */
const Riptide = status(112043)
  .until("v4.0.0")
  .duration(2)
  .done();

/**
 * @id 12043
 * @name 极恶技·尽灭闪
 * @description
 * 依据达达利亚当前所处的状态，进行不同的攻击：
 * 远程状态·魔弹一闪：造成4点水元素伤害，返还2点充能，目标角色附属断流。
 * 近战状态·尽灭水光：造成7点水元素伤害。
 */
const HavocObliteration = skill(12043)
  .until("v4.0.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .do((c) => {
    if (c.self.hasStatus(RangedStance)) {
      c.damage(DamageType.Hydro, 4);
      c.self.gainEnergy(2);
      c.characterStatus(Riptide, "opp active");
    } else {
      c.damage(DamageType.Hydro, 7);
    }
  })
  .done();

/**
 * @id 212041
 * @name 深渊之灾·凝水盛放
 * @description
 * 战斗行动：我方出战角色为达达利亚时，装备此牌。
 * 达达利亚装备此牌后，立刻使用一次魔王武装·狂澜。
 * 结束阶段：对所有附属有断流的敌方角色造成1点穿透伤害。
 * （牌组中包含达达利亚，才能加入牌组）
 */
const AbyssalMayhemHydrospout = card(212041)
  .until("v4.0.0")
  .costHydro(4)
  .talent(Tartaglia)
  .on("enter")
  .useSkill(FoulLegacyRagingTide)
  .on("endPhase", (c) => c.$(`opp character has status with definition id ${Riptide}`))
  .damage(DamageType.Piercing, 1, `opp character has status with definition id ${Riptide}`)
  .done();

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：2
 */
const TakimeguriKanka: StatusHandle = status(112061)
  .until("v4.0.0")
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(2)
  .increaseDamage(1)
  .if((c, e) => c.self.master.hasEquipment(KyoukaFuushi) && e.target.health <= 6)
  .increaseDamage(2)
  .done();

/**
 * @id 12063
 * @name 神里流·水囿
 * @description
 * 造成3点水元素伤害，召唤清净之园囿。
 */
const KamisatoArtSuiyuu = skill(12063)
  .until("v4.0.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .damage(DamageType.Hydro, 3)
  .summon(GardenOfPurity)
  .done();

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
const KamisatoAyato = character(1206)
  .until("v4.0.0")
  .tags("hydro", "sword", "inazuma")
  .health(10)
  .energy(3)
  .skills(KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu)
  .done();

/**
 * @id 121011
 * @name 冰萤
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2（可叠加，最多叠加到3次）
 * 
 * 愚人众·冰萤术士「普通攻击」后：此牌可用次数+1。
 * 我方角色受到发生元素反应的伤害后：此牌可用次数-1。
 */
const CryoCicins: SummonHandle = summon(121011)
  .until("v4.0.0")
  .endPhaseDamage(DamageType.Cryo, 1)
  .usageCanAppend(2, 3)
  .on("useSkill", (c, e) => e.skill.caller.definition.id === FatuiCryoCicinMage && e.isSkillType("normal"))
  .addVariable("usage", 1)
  .on("damaged", (c, e) => e.getReaction())
  .consumeUsage()
  .done();

/**
 * @id 211021
 * @name 猫爪冰摇
 * @description
 * 战斗行动：我方出战角色为迪奥娜时，装备此牌。
 * 迪奥娜装备此牌后，立刻使用一次猫爪冻冻。
 * 装备有此牌的迪奥娜生成的猫爪护盾，所提供的护盾值+1。
 * （牌组中包含迪奥娜，才能加入牌组）
 */
const ShakenNotPurred = card(211021)
  .until("v4.0.0")
  .costCryo(4)
  .talent(Diona)
  .on("enter")
  .useSkill(IcyPaws)
  .done();

/**
 * @id 12023
 * @name 裁雨留虹
 * @description
 * 造成1点水元素伤害，本角色附着水元素，生成虹剑势。
 */
const Raincutter = skill(12023)
  .until("v4.0.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 1)
  .apply(DamageType.Hydro, "@self")
  .combatStatus(RainbowBladework)
  .done();

/**
 * @id 323002
 * @name 便携营养袋
 * @description
 * 入场时：从牌组中随机抽取1张「料理」事件。
 * 我方打出「料理」事件牌时：从牌组中随机抽取1张「料理」事件牌。（每回合1次）
 */
const Nre = card(323002)
  .until("v4.0.0")
  .costVoid(2)
  .support("item")
  .on("enter")
  .drawCards(1, { withTag: "food" })
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(1)
  .drawCards(1, { withTag: "food" })
  .done();

/**
 * @id 333009
 * @name 提瓦特煎蛋
 * @description
 * 复苏目标角色，并治疗此角色1点。
 * （每回合中，最多通过「料理」复苏1个角色，并且每个角色最多食用1次「料理」）
 */
const TeyvatFriedEgg = card(333009)
  .until("v4.0.0")
  .costSame(3)
  .tags("food")
  .filter((c) => !c.$(`my combat status with definition id ${ReviveOnCooldown}`))
  .addTarget("my defeated characters")
  .heal(1, "@targets.0", { kind: "revive" })
  .characterStatus(Satiated, "@targets.0")
  .combatStatus(ReviveOnCooldown)
  .done();

/**
 * @id 322016
 * @name 迪娜泽黛
 * @description
 * 打出「伙伴」支援牌时：少花费1个元素骰。（每回合1次）
 */
const Dunyarzad = card(322016)
  .until("v4.0.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("ally"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 322005
 * @name 卯师傅
 * @description
 * 打出「料理」事件牌后：生成1个随机基础元素骰。（每回合1次）
 */
const ChefMao = card(322005)
  .until("v4.0.0")
  .costSame(1)
  .support("ally")
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(1)
  .generateDice("randomElement", 1)
  .done();

/**
 * @id 332010
 * @name 诸武精通
 * @description
 * 将一个装备在我方角色的「武器」装备牌，转移给另一个武器类型相同的我方角色。
 */
const MasterOfWeaponry = card(332010)
  .until("v4.0.0")
  .addTarget("my character has equipment with tag (weapon)")
  .addTarget("my character with tag weapon of (@targets.0) and not @targets.0")
  .do((c, e) => {
    const weapon = e.targets[0].hasWeapon()!;
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    c.transferEntity(weapon, area);
  })
  .done();

/**
 * @id 332011
 * @name 神宝迁宫祝词
 * @description
 * 将一个装备在我方角色的「圣遗物」装备牌，转移给另一个我方角色。
 */
const BlessingOfTheDivineRelicsInstallation = card(332011)
  .until("v4.0.0")
  .addTarget("my character has equipment with tag (artifact)")
  .addTarget("my character and not @targets.0")
  .do((c, e) => {
    const artifact = e.targets[0].hasArtifact()!;
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    c.transferEntity(artifact, area);
  })
  .done();

/**
 * @id 312008
 * @name 绝缘之旗印
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * 角色使用「元素爆发」造成的伤害+2。
 * （角色最多装备1件「圣遗物」）
 */
const EmblemOfSeveredFate = card(312008)
  .until("v4.0.0")
  .costSame(2)
  .artifact()
  .on("useSkill", (c, e) => e.skill.caller.id !== c.self.master.id && e.isSkillType("burst"))
  .listenToPlayer()
  .gainEnergy(1, "@master")
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(2)
  .done();

/**
 * @id 303181
 * @name 风与自由（生效中）
 * @description
 * 本回合中，轮到我方行动期间有对方角色被击倒时：本次行动结束后，我方可以再连续行动一次。
 * 可用次数：1
 */
const WindAndFreedomInEffect = combatStatus(303181) 
  .until("v4.0.0")
  .oneDuration()
  .on("defeated", (c, e) =>
    c.isMyTurn() && 
    !c.oppPlayer.declaredEnd &&
    !e.target.isMine() && 
    (c.phase === "action" || c.player.defeatedSwitching || c.oppPlayer.defeatedSwitching))
  .listenToAll()
  .usage(1)
  .continueNextTurn()
  .done();

/**
 * @id 331801
 * @name 风与自由
 * @description
 * 本回合中，轮到我方行动期间有对方角色被击倒时：本次行动结束后，我方可以再连续行动一次。
 * 可用次数：1
 * （牌组包含至少2个「蒙德」角色，才能加入牌组）
 */
const WindAndFreedom = card(331801)
  .until("v4.0.0")
  .costSame(1)
  .combatStatus(WindAndFreedomInEffect)
  .done();
  
