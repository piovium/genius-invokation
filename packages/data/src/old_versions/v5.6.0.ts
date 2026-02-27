import { card, character, DamageType, skill } from "@gi-tcg/core/builder";
import { DominusLapidisStrikingStone, Zhongli } from "../characters/geo/zhongli";
import { TurboDrillField, TurboTwirlyLetItRip, TurboTwirlyTriggered } from "../characters/geo/kachina";
import { Xilonen, YohualsScratch } from "../characters/geo/xilonen";
import { MistBubbleSlime, SlashOfSurgingTides, SlashOfSurgingTidesPassive, WhirlingScythe } from "../characters/hydro/hydro_hilichurl_rogue";
import { AsWaterSeeksEquilibrium, EquitableJudgment, OTearsIShallRepay, OTidesIHaveReturned, SourcewaterDropletSkill } from "../characters/hydro/neuvillette";
import { Oceanborne, Stormbreaker, Tidecaller, Wavestrider } from "../characters/electro/beidou";
import { GleamingSpearGuardianStance, HeronStrike, SacredRiteHeronsSanctum, SacredRiteWagtailsTide } from "../characters/hydro/candace";
import { HolisticRevivification, TheClassicsOfAcupuncture, UniversalDiagnosis } from "../characters/dendro/baizhu";
import { RaidenShogun } from "../characters/electro/raiden_shogun";
import { AbiogenesisSolarIsotoma, FavoniusBladeworkWeiss, RiteOfProgenitureTectonicTide } from "../characters/geo/albedo";

/**
 * @id 116102
 * @name 冲天转转
 * @description
 * 附属角色切换至后台时：消耗1点夜魂值，召唤冲天转转·脱离。
 * 特技：转转冲击
 * （角色最多装备1个「特技」）
 * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持。
 * [1161021: 转转冲击] (1*Void) 附属角色消耗1点「夜魂值」，造成2点岩元素伤害，对敌方下一个后台角色造成1点穿透伤害。
 * [1161022: ] ()
 * [1161023: ] ()
 * [1161024: ] ()
 */
const TurboTwirly = card(116102)
  .until("v5.6.0")
  .nightsoulTechnique()
  .on("switchActive", (c, e) => e.switchInfo.from?.id === c.self.master.id)
  .consumeNightsoul("@master")
  .summon(TurboTwirlyLetItRip)
  .endOn()
  .provideSkill(1161021)
  .costVoid(1)
  .consumeNightsoul("@master")
  .do((c) => {
    const field = c.$(`my combat status with definition id ${TurboDrillField}`);
    if (field) {
      c.damage(DamageType.Geo, 3);
      c.damage(DamageType.Piercing, 2, "opp next");
      c.consumeUsage(1, field);
    } else {
      c.damage(DamageType.Geo, 2);
      c.damage(DamageType.Piercing, 1, "opp next");
    }
    c.emitCustomEvent(TurboTwirlyTriggered);
  })
  .done();

/**
 * @id 216031
 * @name 炊金馔玉
 * @description
 * 战斗行动：我方出战角色为钟离时，装备此牌。
 * 钟离装备此牌后，立刻使用一次地心·磐礴。
 * 装备有此牌的钟离生命值至少为7时，钟离造成的伤害和我方召唤物造成的岩元素伤害+1。
 * （牌组中包含钟离，才能加入牌组）
 */
const DominanceOfEarth = card(216031)
  .until("v5.6.0")
  .costGeo(5)
  .talent(Zhongli)
  .on("enter")
  .useSkill(DominusLapidisStrikingStone)
  .on("increaseDamage", (c, e) => {
    return c.self.master.health >= 7 &&
    (e.source.definition.id === Zhongli ||
      e.type === DamageType.Geo &&
      e.source.definition.type === "summon")
  })
  .listenToPlayer()
  .increaseDamage(1)
  .done();

/**
 * @id 22053
 * @name 浮泡攻势
 * @description
 * 造成3点水元素伤害，生成手牌水泡史莱姆。
 * （装备有水泡史莱姆的角色可以使用特技：水泡战法）
 */
const BubblefloatBlitz = skill(22053)
  .until("v5.6.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 3)
  .createHandCard(MistBubbleSlime)
  .done();

/**
 * @id 1604
 * @name 阿贝多
 * @description
 * 黑土与白垩，赤成与黄金。
 */
const Albedo = character(1604)
  .until("v5.6.0")
  .tags("geo", "sword", "mondstadt")
  .health(10)
  .energy(2)
  .skills(FavoniusBladeworkWeiss, AbiogenesisSolarIsotoma, RiteOfProgenitureTectonicTide)
  .done();
/**
 * @id 1210
 * @name 那维莱特
 * @description
 * 凡高大者，无不蔑视。
 */
const Neuvillette = character(1210)
  .until("v5.6.0")
  .tags("hydro", "catalyst", "fontaine", "ousia")
  .health(10)
  .energy(2)
  .skills(AsWaterSeeksEquilibrium, OTearsIShallRepay, OTidesIHaveReturned, EquitableJudgment, SourcewaterDropletSkill)
  .done();

/**
 * @id 1405
 * @name 北斗
 * @description
 * 「记住这一天，你差点赢了南十字船队老大的钱。」
 */
const Beidou = character(1405)
  .until("v5.6.0")
  .tags("electro", "claymore", "liyue")
  .health(10)
  .energy(3)
  .skills(Oceanborne, Tidecaller, Stormbreaker, Wavestrider)
  .done();


/**
 * @id 1207
 * @name 坎蒂丝
 * @description
 * 赤沙浮金，恪誓戍御。
 */
const Candace = character(1207)
  .until("v5.6.0")
  .tags("hydro", "pole", "sumeru")
  .health(10)
  .energy(2)
  .skills(GleamingSpearGuardianStance, SacredRiteHeronsSanctum, SacredRiteWagtailsTide, HeronStrike)
  .done();

/**
 * @id 1705
 * @name 白术
 * @description
 * 生老三千疾，何处可问医。
 */
const Baizhu = character(1705)
  .until("v5.6.0")
  .tags("dendro", "catalyst", "liyue")
  .health(10)
  .energy(2)
  .skills(TheClassicsOfAcupuncture, UniversalDiagnosis, HolisticRevivification)
  .done();

/**
 * @id 2205
 * @name 丘丘水行游侠
 * @description
 * 不属于任何部族的丘丘人流浪者，如同自我流放一般在荒野中四处漫游。
 */
const HydroHilichurlRogue = character(2205)
  .until("v5.6.0")
  .tags("hydro", "monster", "hilichurl")
  .health(10)
  .energy(2)
  .skills(WhirlingScythe, SlashOfSurgingTides, BubblefloatBlitz, SlashOfSurgingTidesPassive)
  .done();

/**
 * @id 14073
 * @name 奥义·梦想真说
 * @description
 * 造成3点雷元素伤害，其他我方角色获得2点充能。
 */
const SecretArtMusouShinsetsu = skill(14073)
  .until("v5.6.0")
  .type("burst")
  .costElectro(4)
  .costEnergy(2)
  .damage(DamageType.Electro, 3)
  .gainEnergy(2, "all my characters and not @self")
  .done();


/**
 * @id 214071
 * @name 万千的愿望
 * @description
 * 战斗行动：我方出战角色为雷电将军时，装备此牌。
 * 雷电将军装备此牌后，立刻使用一次奥义·梦想真说。
 * 装备有此牌的雷电将军使用奥义·梦想真说时：每消耗1点「愿力」，都使造成的伤害额外+1。
 * （牌组中包含雷电将军，才能加入牌组）
 */
const WishesUnnumbered = card(214071)
  .until("v5.6.0")
  .costElectro(4)
  .costEnergy(2)
  .talent(RaidenShogun)
  .on("enter")
  .useSkill(SecretArtMusouShinsetsu)
  .done();
