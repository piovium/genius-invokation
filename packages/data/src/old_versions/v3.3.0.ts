import { DamageType, type SkillHandle, card, character, combatStatus, skill, status } from "@gi-tcg/core/builder";
import { AurousBlaze, FireworkFlareup, NiwabiFiredance } from "../characters/pyro/yoimiya.ts";
import { ShadowswordGallopingFrost, ShadowswordLoneGale, TranscendentAutomaton } from "../characters/anemo/maguu_kenki.ts";
import { Collei, FloralBrush } from "../characters/dendro/collei.ts";

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成3点火元素伤害，生成琉金火光。
 */
const RyuukinSaxifrage: SkillHandle = skill(13053)
  .until("v3.3.0")
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 3)
  .combatStatus(AurousBlaze)
  .done();

/**
 * @id 1305
 * @name 宵宫
 * @description
 * 花见坂第十一届全街邀请赛「长野原队」队长兼首发牌手。
 */
const Yoimiya = character(1305)
  .until("v3.3.0")
  .tags("pyro", "bow", "inazuma")
  .health(10)
  .energy(2)
  .skills(FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage)
  .done();

/**
 * @id 25012
 * @name 孤风刀势
 * @description
 * 造成1点风元素伤害，召唤剑影·孤风。
 */
const BlusteringBlade: SkillHandle = skill(25012)
  .until("v3.3.0")
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 1)
  .summon(ShadowswordLoneGale)
  .if((c) => c.self.hasEquipment(TranscendentAutomaton))
  .switchActive("my next")
  .done();

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 造成1点冰元素伤害，召唤剑影·霜驰。
 */
const FrostyAssault: SkillHandle = skill(25013)
  .until("v3.3.0")
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 1)
  .summon(ShadowswordGallopingFrost)
  .if((c) => c.self.hasEquipment(TranscendentAutomaton))
  .switchActive("my prev")
  .done();

/**
 * @id 303306
 * @name 兽肉薄荷卷（生效中）
 * @description
 * 角色在本回合结束前，所有普通攻击都少花费1无色元素。
 */
const MintyMeatRollsInEffect = status(303306)
  .until("v3.3.0")
  .oneDuration()
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(1)
  .done();

/**
 * @id 117
 * @name 激化领域
 * @description
 * 我方对敌方出战角色造成雷元素伤害或草元素伤害时，伤害值+1。
 * 可用次数：3
 */
const CatalyzingField = combatStatus(117)
  .until("v3.3.0")
  .on("increaseDamage", (c, e) =>
    ([DamageType.Electro, DamageType.Dendro] as DamageType[]).includes(e.type) &&
    e.target.id === c.$("opp active")?.id)
  .usage(3)
  .increaseDamage(1)
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
  .until("v3.3.0")
  .costDendro(3)
  .talent(Collei)
  .on("enter")
  .useSkill(FloralBrush)
  .done();
