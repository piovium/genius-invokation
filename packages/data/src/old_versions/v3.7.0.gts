import { DamageType, DiceType, type SkillHandle, card, character, skill, status, summon } from "@gi-tcg/core/builder";
import { AurousBlaze } from "../characters/pyro/yoimiya.ts";
import { ThunderbeastsTarge } from "../characters/electro/beidou.ts";
import { PyronadoStatus } from "../characters/pyro/xiangling.ts";
import { ClawAndThunder, SteelFang, TheWolfWithin } from "../characters/electro/razor.ts";
import { FavoniusBladeworkEdel, IcetideVortex, WellspringOfWarlust } from "../characters/cryo/eula.ts";

/**
 * @id 312004
 * @name 赌徒的耳环
 * @description
 * 敌方角色被击倒后：如果所附属角色为「出战角色」，则生成2个万能元素。
 * （角色最多装备1件「圣遗物」）
 */
const GamblersEarrings = card(312004)
  .until("v3.7.0")
  .costSame(1)
  .artifact()
  .on("defeated", (c, e) => c.self.master.isActive() && !e.target.isMine())
  .listenToAll()
  .generateDice(DiceType.Omni, 2)
  .done();

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成4点火元素伤害，生成琉金火光。
 */
const RyuukinSaxifrage: SkillHandle = skill(13053)
  .until("v3.7.0")
  .type("burst")
  .costPyro(4)
  .costEnergy(3)
  .damage(DamageType.Pyro, 4)
  .combatStatus(AurousBlaze)
  .done();

/**
 * @id 14054
 * @name 踏潮
 * @description
 * （需准备1个行动轮）
 * 造成2点雷元素伤害。
 */
const Wavestrider = skill(14054)
  .until("v3.7.0")
  .type("elemental")
  .noEnergy()
  .damage(DamageType.Electro, 2)
  .done();

/**
 * @id 14053
 * @name 斫雷
 * @description
 * 造成3点雷元素伤害，生成雷兽之盾。
 */
const Stormbreaker = skill(14053)
  .until("v3.7.0")
  .type("burst")
  .costElectro(4)
  .costEnergy(3)
  .damage(DamageType.Electro, 3)
  .combatStatus(ThunderbeastsTarge)
  .done();

/**
 * @id 13023
 * @name 旋火轮
 * @description
 * 造成2点火元素伤害，生成旋火轮。
 */
const Pyronado: SkillHandle = skill(13023)
  .until("v3.7.0")
  .type("burst")
  .costPyro(4)
  .costEnergy(2)
  .damage(DamageType.Pyro, 2)
  .combatStatus(PyronadoStatus)
  .done();

/**
 * @id 14023
 * @name 雷牙
 * @description
 * 造成5点雷元素伤害，本角色附属雷狼。
 */
const LightningFang = skill(14023)
  .until("v3.7.0")
  .type("burst")
  .costElectro(3)
  .costEnergy(3)
  .damage(DamageType.Electro, 5)
  .characterStatus(TheWolfWithin)
  .done();

/**
 * @id 1402
 * @name 雷泽
 * @description
 * 「牌，难。」
 * 「但，有朋友…」
 */
const Razor = character(1402)
  .until("v3.7.0")
  .tags("electro", "claymore", "mondstadt")
  .health(10)
  .energy(3)
  .skills(SteelFang, ClawAndThunder, LightningFang)
  .done();

/**
 * @id 111061
 * @name 冷酷之心
 * @description
 * 所附属角色使用冰潮的涡旋时：移除此状态，使本次伤害+2。
 */
const Grimheart = status(111061)
  .until("v3.7.0")
  .on("increaseSkillDamage", (c, e) => e.damageInfo.via.definition.id === IcetideVortex)
  .increaseDamage(2)
  .dispose()
  .done();

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成2点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
const LightfallSword = summon(111062)
  .until("v3.7.0")
  .hint(DamageType.Physical, "3+")
  .usage(0, { autoDispose: false })
  .on("useSkill", (c, e) => 
    e.skill.definition.id === FavoniusBladeworkEdel || 
    e.skill.definition.id === IcetideVortex)
  .do((c, e) => {
    if (e.skill.definition.id === IcetideVortex &&
      e.skill.caller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      c.self.addVariable("usage", 3);
    } else {
      c.self.addVariable("usage", 2);
    }
  })
  .on("endPhase")
  .do((c) => {
    c.damage(DamageType.Physical, 2 + c.getVariable("usage"));
    c.dispose();
  })
  .done();

