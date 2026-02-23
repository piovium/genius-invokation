import { DamageType, DiceType, EquipmentHandle, SkillHandle, SummonHandle, card, character, combatStatus, skill, status, summon } from "@gi-tcg/core/builder";
import { FatalRainscreen, Xingqiu } from "../characters/hydro/xingqiu";
import { InfluxBlast, MirrorMaiden } from "../characters/hydro/mirror_maiden";
import { Barbara, LetTheShowBegin } from "../characters/hydro/barbara";
import { ElectroCrystalCore, ElectroHypostasis } from "../characters/electro/electro_hypostasis";
import { ChonghuasLayeredFrost, Chongyun } from "../characters/cryo/chongyun";
import { GuobaAttack, Xiangling } from "../characters/pyro/xiangling";
import { NiwabiEnshou, Yoimiya } from "../characters/pyro/yoimiya";
import { Candace, SacredRiteWagtailsTide } from "../characters/hydro/candace";
import { ClawAndThunder, Razor } from "../characters/electro/razor";
import { Beidou, SummonerOfLightning, Tidecaller, TidecallerSurfEmbrace, Wavestrider } from "../characters/electro/beidou";
import { KujouSara, SubjugationKoukouSendou } from "../characters/electro/kujou_sara";
import { Cyno, PactswornPathclearer, SecretRiteChasmicSoulfarer } from "../characters/electro/cyno";
import { BakeKurage } from "../characters/hydro/sangonomiya_kokomi";
import { Amber, BaronBunny, ExplosivePuppet } from "../characters/pyro/amber";
import { FavoniusBladework, GaleBlade } from "../characters/anemo/jean";
import { SealOfApproval, Yanfei } from "../characters/pyro/yanfei";
import { StreamingSurge } from "../characters/hydro/rhodeia_of_loch";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto";

/**
 * @id 330003
 * @name 愉舞欢游
 * @description
 * 我方出战角色的元素类型为冰/水/火/雷/草时，才能打出：对我方所有角色附着我方出战角色类型的元素。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
const JoyousCelebration = card(330003)
  .until("v4.1.0")
  .costSame(1)
  .legend()
  .filter((c) => ([DiceType.Cryo, DiceType.Hydro, DiceType.Pyro, DiceType.Electro, DiceType.Dendro] as (DiceType | undefined)[]).includes(c.$("my active")?.element()))
  .do((c) => {
    const element = c.$("my active")!.element() as 1 | 2 | 3 | 4 | 7;
    // 先挂后台再挂前台（避免前台被超载走导致结算错误）
    c.apply(element, "my standby character");
    c.apply(element, "my active character");
  })
  .done();

/**
 * @id 212021
 * @name 重帘留香
 * @description
 * 战斗行动：我方出战角色为行秋时，装备此牌。
 * 行秋装备此牌后，立刻使用一次画雨笼山。
 * 装备有此牌的行秋生成的雨帘剑，初始可用次数+1。
 * （牌组中包含行秋，才能加入牌组）
 */
const TheScentRemained = card(212021)
  .until("v4.1.0")
  .costHydro(4)
  .talent(Xingqiu)
  .on("enter")
  .useSkill(FatalRainscreen)
  .done();

/**
 * @id 112023
 * @name 雨帘剑
 * @description
 * 我方出战角色受到至少为3的伤害时：抵消1点伤害。
 * 可用次数：3
 */
const RainSword01 = combatStatus(112023)
  .until("v4.1.0")
  .tags("barrier")
  .conflictWith(112021)
  .on("decreaseDamaged", (c, e) => e.target.isActive() && e.value >= 3)
  .usage(3)
  .decreaseDamage(1)
  .done();

/**
 * @id 222021
 * @name 镜锢之笼
 * @description
 * 战斗行动：我方出战角色为愚人众·藏镜仕女时，装备此牌。
 * 愚人众·藏镜仕女装备此牌后，立刻使用一次潋波绽破。
 * 装备有此牌的愚人众·藏镜仕女生成的水光破镜获得以下效果：
 * 初始持续回合+1，并且会使所附属角色切换到其他角色时元素骰费用+1。
 * （牌组中包含愚人众·藏镜仕女，才能加入牌组）
 */
const MirrorCage = card(222021)
  .until("v4.1.0")
  .costHydro(4)
  .talent(MirrorMaiden)
  .on("enter")
  .useSkill(InfluxBlast)
  .done();


/**
 * @id 212011
 * @name 光辉的季节
 * @description
 * 战斗行动：我方出战角色为芭芭拉时，装备此牌。
 * 芭芭拉装备此牌后，立刻使用一次演唱，开始♪。
 * 装备有此牌的芭芭拉在场时，歌声之环会使我方执行「切换角色」行动时少花费1个元素骰。（每回合1次）
 * （牌组中包含芭芭拉，才能加入牌组）
 */
const GloriousSeason = card(212011)
  .until("v4.1.0")
  .costHydro(4)
  .talent(Barbara)
  .on("enter")
  .useSkill(LetTheShowBegin)
  .done();

/**
 * @id 224011
 * @name 汲能棱晶
 * @description
 * 战斗行动：我方出战角色为无相之雷时，治疗该角色3点，并附属雷晶核心。
 * （牌组中包含无相之雷，才能加入牌组）
 */
const AbsorbingPrism = card(224011)
  .until("v4.1.0")
  .costElectro(3)
  .eventTalent(ElectroHypostasis)
  .heal(3, "my active")
  .characterStatus(ElectroCrystalCore, "my active")
  .done();

/**
 * @id 211041
 * @name 吐纳真定
 * @description
 * 战斗行动：我方出战角色为重云时，装备此牌。
 * 重云装备此牌后，立刻使用一次重华叠霜。
 * 装备有此牌的重云生成的重华叠霜领域获得以下效果：
 * 初始持续回合+1，并且使我方单手剑、双手剑或长柄武器角色的普通攻击伤害+1。
 * （牌组中包含重云，才能加入牌组）
 */
export const SteadyBreathing = card(211041)
  .until("v4.1.0")
  .costCryo(4)
  .talent(Chongyun)
  .on("enter")
  .useSkill(ChonghuasLayeredFrost)
  .done();

/**
 * @id 111042
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害，普通攻击造成的伤害+1。
 * 持续回合：3
 */
export const ChonghuaFrostField01 = combatStatus(111042)
  .until("v4.1.0")
  .conflictWith(111041)
  .duration(3)
  .on("modifySkillDamageType", (c, e) => {
    if (e.type !== DamageType.Physical) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .changeDamageType(DamageType.Cryo)
  .on("increaseSkillDamage", (c, e) => {
    if (!e.viaSkillType("normal")) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .increaseDamage(1)
  .done();

/**
 * @id 213021
 * @name 交叉火力
 * @description
 * 战斗行动：我方出战角色为香菱时，装备此牌。
 * 香菱装备此牌后，立刻使用一次锅巴出击。
 * 装备有此牌的香菱使用锅巴出击时：自身也会造成1点火元素伤害。
 * （牌组中包含香菱，才能加入牌组）
 */
export const Crossfire = card(213021)
  .until("v4.1.0")
  .costPyro(4)
  .talent(Xiangling)
  .on("enter")
  .useSkill(GuobaAttack)
  .done();

/**
 * @id 13052
 * @name 焰硝庭火舞
 * @description
 * 本角色附属庭火焰硝。（此技能不产生充能）
 */
const NiwabiFiredance: SkillHandle = skill(13052)
  .until("v4.1.0")
  .type("elemental")
  .costPyro(1)
  .noEnergy()
  .characterStatus(NiwabiEnshou)
  .done();

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫触发庭火焰硝后：额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
const NaganoharaMeteorSwarm = card(213051)
  .until("v4.1.0")
  .costPyro(2)
  .talent(Yoimiya)
  .on("enter")
  .useSkill(NiwabiFiredance)
  .on("useSkill", (c, e) => e.isSkillType("normal") && c.self.master.hasStatus(NiwabiEnshou))
  .damage(DamageType.Pyro, 1)
  .done();


/**
 * @id 212071
 * @name 衍溢的汐潮
 * @description
 * 战斗行动：我方出战角色为坎蒂丝时，装备此牌。
 * 坎蒂丝装备此牌后，立刻使用一次圣仪·灰鸰衒潮。
 * 装备有此牌的坎蒂丝生成的赤冕祝祷额外具有以下效果：我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * （牌组中包含坎蒂丝，才能加入牌组）
 */
const TheOverflow = card(212071)
  .until("v4.1.0")
  .costHydro(4)
  .costEnergy(2)
  .talent(Candace)
  .on("enter")
  .useSkill(SacredRiteWagtailsTide)
  .done();

/**
 * @id 214021
 * @name 觉醒
 * @description
 * 战斗行动：我方出战角色为雷泽时，装备此牌。
 * 雷泽装备此牌后，立刻使用一次利爪与苍雷。
 * 装备有此牌的雷泽使用利爪与苍雷后：使我方一个雷元素角色获得1点充能。（出战角色优先）
 * （牌组中包含雷泽，才能加入牌组）
 */
const Awakening = card(214021)
  .until("v4.1.0")
  .costElectro(4)
  .talent(Razor)
  .on("enter")
  .useSkill(ClawAndThunder)
  .on("useSkill", (c, e) => e.skill.definition.id === ClawAndThunder)
  .gainEnergy(1, "my characters with tag (electro) and with energy < maxEnergy limit 1")
  .done();

/**
 * @id 214051
 * @name 霹雳连霄
 * @description
 * 战斗行动：我方出战角色为北斗时，装备此牌。
 * 北斗装备此牌后，立刻使用一次捉浪。
 * 装备有此牌的北斗使用踏潮时：如果准备技能期间受到过伤害，则使北斗本回合内「普通攻击」少花费1个无色元素。（最多触发2次）
 * （牌组中包含北斗，才能加入牌组）
 */
const LightningStorm = card(214051)
  .until("v4.1.0")
  .costElectro(3)
  .talent(Beidou)
  .on("enter")
  .useSkill(Tidecaller)
  .on("useSkill", (c, e) => {
    if (e.skill.definition.id !== Wavestrider) {
      return false;
    }
    const shield = c.$(`status with definition id ${TidecallerSurfEmbrace} at @master`);
    if (shield && shield.getVariable("shield") === 2) {
      return false;
    }
    return true;
  })
  .usage(2, { autoDispose: false })
  .characterStatus(SummonerOfLightning, "@master")
  .done();

/**
 * @id 214061
 * @name 我界
 * @description
 * 战斗行动：我方出战角色为九条裟罗时，装备此牌。
 * 九条裟罗装备此牌后，立刻使用一次煌煌千道镇式。
 * 装备有此牌的九条裟罗在场时，我方附属有鸣煌护持的雷元素角色，元素战技和元素爆发造成的伤害额外+1。
 * （牌组中包含九条裟罗，才能加入牌组）
 */
const SinOfPride = card(214061)
  .until("v4.1.0")
  .costElectro(4)
  .costEnergy(3)
  .talent(KujouSara)
  .on("enter")
  .useSkill(SubjugationKoukouSendou)
  .done();

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数为3或5时使用秘仪·律渊渡魂时，造成的伤害额外+1。
 * （牌组中包含赛诺，才能加入牌组）
 */
const FeatherfallJudgment = card(214041)
  .until("v4.1.0")
  .costElectro(3)
  .talent(Cyno)
  .on("enter")
  .useSkill(SecretRiteChasmicSoulfarer)
  .on("increaseSkillDamage", (c, e) => {
    const status = c.self.master.hasStatus(PactswornPathclearer)!;
    const reliance = c.getVariable("reliance", status);
    return (reliance === 3 || reliance === 5) && e.via.definition.id === SecretRiteChasmicSoulfarer;
  })
  .increaseDamage(1)
  .done();

/**
 * @id 212051
 * @name 匣中玉栉
 * @description
 * 战斗行动：我方出战角色为珊瑚宫心海时，装备此牌。
 * 珊瑚宫心海装备此牌后，立刻使用一次海人化羽。
 * 装备有此牌的珊瑚宫心海使用海人化羽时：如果化海月在场，则刷新其可用次数。
 * 仪来羽衣存在期间，化海月造成的伤害+1。
 * （牌组中包含珊瑚宫心海，才能加入牌组）
 */
const TamakushiCasket = 212051 as EquipmentHandle; // Keeps same

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成2点水元素伤害，治疗所有我方角色1点，本角色附属仪来羽衣。
 */
const NereidsAscension = skill(12053)
  .until("v4.1.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .heal(1, "all my characters")
  .if((c) => c.self.hasEquipment(TamakushiCasket) && c.$(`my summon with definition id ${BakeKurage}`))
  .summon(BakeKurage)
  .done();

/**
 * @id 213041
 * @name 一触即发
 * @description
 * 战斗行动：我方出战角色为安柏时，装备此牌。
 * 安柏装备此牌后，立刻使用一次爆弹玩偶。
 * 安柏普通攻击后：如果此牌和兔兔伯爵仍在场，则引爆兔兔伯爵，造成3点火元素伤害。
 * （牌组中包含安柏，才能加入牌组）
 */
const BunnyTriggered = card(213041)
  .until("v4.1.0")
  .costPyro(3)
  .talent(Amber)
  .on("enter")
  .useSkill(ExplosivePuppet)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .do((c) => {
    const bunny = c.$(`my summon with definition id ${BaronBunny}`);
    if (bunny) {
      c.damage(DamageType.Pyro, 3);
      bunny.dispose();
    }
  })
  .done();

/**
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成2点风元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
const DandelionField: SummonHandle = summon(115021)
  .until("v4.1.0")
  .endPhaseDamage(DamageType.Anemo, 2)
  .usage(2)
  .heal(1, "my active")
  .on("increaseDamage", (c, e) => 
    c.$(`my equipment with definition id ${LandsOfDandelion}`) && // 装备有天赋的琴在场时
    e.type === DamageType.Anemo
  )
  .increaseDamage(1)
  .done();

/**
 * @id 15023
 * @name 蒲公英之风
 * @description
 * 治疗所有我方角色2点，召唤蒲公英领域。
 */
const DandelionBreeze = skill(15023)
  .until("v4.1.0")
  .type("burst")
  .costAnemo(4)
  .costEnergy(3)
  .heal(2, "all my characters")
  .summon(DandelionField)
  .done();

/**
 * @id 1502
 * @name 琴
 * @description
 * 在夺得最终的胜利之前，她总是认为自己做得还不够好。
 */
const Jean = character(1502)
  .until("v4.1.0")
  .tags("anemo", "sword", "mondstadt")
  .health(10)
  .energy(3)
  .skills(FavoniusBladework, GaleBlade, DandelionBreeze)
  .done();

/**
 * @id 215021
 * @name 蒲公英的国土
 * @description
 * 战斗行动：我方出战角色为琴时，装备此牌。
 * 琴装备此牌后，立刻使用一次蒲公英之风。
 * 装备有此牌的琴在场时，蒲公英领域会使我方造成的风元素伤害+1。
 * （牌组中包含琴，才能加入牌组）
 */
const LandsOfDandelion = card(215021)
  .until("v4.1.0")
  .costAnemo(4)
  .costEnergy(3)
  .talent(Jean)
  .on("enter")
  .useSkill(DandelionBreeze)
  .done();

/**
 * @id 113081
 * @name 丹火印
 * @description
 * 角色进行重击时：造成的伤害+2。
 * 可用次数：1
 */
const ScarletSeal = status(113081)
  .until("v4.1.0")
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack())
  .usage(1)
  .increaseDamage(2)
  .done();

/**
 * @id 213081
 * @name 最终解释权
 * @description
 * 战斗行动：我方出战角色为烟绯时，装备此牌。
 * 烟绯装备此牌后，立刻使用一次火漆制印。
 * 装备有此牌的烟绯进行重击时：对生命值不多于6的敌人造成的伤害+1。
 * （牌组中包含烟绯，才能加入牌组）
 */
const RightOfFinalInterpretation = card(213081)
  .until("v4.1.0")
  .costPyro(1)
  .costVoid(2)
  .talent(Yanfei)
  .variable("triggerSeal", 0)
  .on("enter")
  .useSkill(SealOfApproval)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack() && e.target.health <= 6)
  .increaseDamage(1)
  .done();

/**
 * @id 111072
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：3
 * 我方角色通过「普通攻击」触发此效果时，不消耗可用次数。（每回合1次）
 */
const IcyQuill01 = combatStatus(111072)
  .until("v4.1.0")
  .conflictWith(111071)
  .variable("noUsageEffect", 1, { visible: false }) // 每回合一次不消耗可用次数
  .on("roundEnd")
  .setVariable("noUsageEffect", 1)
  .on("increaseDamage", (c, e) => e.via.caller.definition.type === "character" && e.type === DamageType.Cryo)
  .usage(3, { autoDecrease: false })
  .increaseDamage(1)
  .do((c, e) => {
    if (e.viaSkillType("normal") && c.getVariable("noUsageEffect")) {
      c.setVariable("noUsageEffect", 0);
    } else {
      c.consumeUsage()
    }
  })
  .done();

/**
 * @id 111071
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：3
 */
const IcyQuill = combatStatus(111071)
  .until("v4.1.0")
  .conflictWith(111072)
  .on("increaseDamage", (c, e) => e.via.caller.definition.type === "character" && e.type === DamageType.Cryo)
  .usage(3)
  .increaseDamage(1)
  .done();

/**
 * @id 22014
 * @name 潮涌与激流
 * @description
 * 造成2点水元素伤害；我方每有1个召唤物，再使此伤害+2。
 */
const TideAndTorrent = skill(22014)
  .until("v4.1.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .do((c) => {
    const summons = c.$$("my summons");
    const damageValue = 2 + summons.length * 2;
    c.damage(DamageType.Hydro, damageValue);
    if (c.self.hasEquipment(StreamingSurge)) {
      summons.forEach((s) => s.addVariable("usage", 1))
    }
  })
  .done();

/**
 * @id 116053
 * @name 怒目鬼王
 * @description
 * 所附属角色普通攻击造成的伤害+2，造成的物理伤害变为岩元素伤害。
 * 持续回合：2
 * 所附属角色普通攻击后：为其附属乱神之怪力。（每回合1次）
 */
export const RagingOniKing = status(116053)
  .until("v4.1.0")
  .duration(2)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Geo)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(2)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usagePerRound(1)
  .characterStatus(SuperlativeSuperstrength, "@master")
  .done();

/**
 * @id 16053
 * @name 最恶鬼王·一斗轰临！！
 * @description
 * 造成5点岩元素伤害，本角色附属怒目鬼王。
 */
const RoyalDescentBeholdIttoTheEvil = skill(16053)
  .until("v4.1.0")
  .type("burst")
  .costGeo(3)
  .costEnergy(3)
  .damage(DamageType.Geo, 5)
  .characterStatus(RagingOniKing)
  .done();

