import { card, DamageType, skill, type SkillHandle, summon, type SummonHandle } from "@gi-tcg/core/builder";
import { ScopeOutSoftSpots } from "../characters/cryo/rosaria.ts";
import { TamakushiCasket } from "../characters/hydro/sangonomiya_kokomi.ts";
import { SesshouSakura } from "../characters/electro/yae_miko.ts";
import { LandsOfDandelion } from "../characters/anemo/jean.ts";
import { SoaringOnTheWind } from "../characters/anemo/xianyun.ts";
import { MirrorCage, Refraction, Refraction01 } from "../characters/hydro/mirror_maiden.ts";
import { RipplingBladesStatus } from "../characters/hydro/abyss_herald_wicked_torrents.ts";
import { GyoeiNarukamiKariyamaRite, KukiShinobu } from "../characters/electro/kuki_shinobu.ts";

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成2点水元素伤害，目标角色附属水光破镜。
 */
const InfluxBlast: SkillHandle = skill(22022)
  .until("v5.2.0")
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .if((c) => c.self.hasEquipment(MirrorCage))
  .characterStatus(Refraction01, "opp active")
  .else()
  .characterStatus(Refraction, "opp active")
  .done();

/**
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
const DandelionField: SummonHandle = summon(115021)
  .until("v5.2.0")
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(2)
  .heal(1, "my active")
  .on("increaseDamage", (c, e) =>
    c.$(`my equipment with definition id ${LandsOfDandelion}`) && // 装备有天赋的琴在场时
    e.type === DamageType.Anemo
  )
  .increaseDamage(1)
  .done();

/**
 * @id 112051
 * @name 化海月
 * @description
 * 结束阶段：造成1点水元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
const BakeKurage: SummonHandle = summon(112051)
  .until("v5.2.0")
  .hint(DamageType.Hydro, "1")
  .on("endPhase")
  .usage(2)
  .if((c) => c.$(`my equipment with definition id ${TamakushiCasket}`))
  .damage(DamageType.Hydro, 2)
  .else()
  .damage(DamageType.Hydro, 1)
  .heal(1, "my active")
  .done();

/**
 * @id 14082
 * @name 野干役咒·杀生樱
 * @description
 * 召唤杀生樱。
 */
const YakanEvocationSesshouSakura = skill(14082)
  .until("v5.2.0")
  .type("elemental")
  .costElectro(3)
  .summon(SesshouSakura)
  .done();

/**
 * @id 22032
 * @name 洄涡锋刃
 * @description
 * 造成2点水元素伤害，然后准备技能：涟锋旋刃。
 */
const VortexEdge = skill(22032)
  .until("v5.2.0")
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .characterStatus(RipplingBladesStatus, "@self")
  .done();



/**
 * @id 111132
 * @name 极寒的冰枪
 * @description
 * 结束阶段：造成1点冰元素伤害，生成1层洞察破绽。
 * 可用次数：2
 */
const EvercoldFrostlance = summon(111132)
  .until("v5.2.0")
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .combatStatus(ScopeOutSoftSpots)
  .done();

/**
 * @id 214111
 * @name 割舍软弱之心
 * @description
 * 战斗行动：我方出战角色为久岐忍时，装备此牌。
 * 久岐忍装备此牌后，立刻使用一次御咏鸣神刈山祭。
 * 装备有此牌的久岐忍被击倒时：角色免于被击倒，并治疗该角色到1点生命值。（每回合1次）
 * 如果装备有此牌的久岐忍生命值不多于5，则该角色造成的伤害+1。
 * （牌组中包含久岐忍，才能加入牌组）
 */
const ToWardWeakness = card(214111)
  .until("v5.2.0")
  .costElectro(3)
  .costEnergy(2)
  .talent(KukiShinobu)
  .on("enter")
  .useSkill(GyoeiNarukamiKariyamaRite)
  .on("beforeDefeated")
  .usagePerRound(1)
  .immune(1)
  .on("increaseSkillDamage", (c, e) => e.source.cast<"character">().health <= 5)
  .increaseDamage(1)
  .done();

/**
 * @id 11132
 * @name 噬罪的告解
 * @description
 * 造成1点冰元素伤害，生成2层洞察破绽。（触发洞察破绽的效果时，会生成强攻破绽。）
 */
const RavagingConfession = skill(11132)
  .until("v5.2.0")
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 1)
  .combatStatus(ScopeOutSoftSpots, "my", {
    overrideVariables: {
      layer: 2
    }
  })
  .done();
