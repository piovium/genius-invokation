// Copyright (C) 2024-2025 Guyutongxue
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { character, skill, summon, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111151
 * @name 厨艺机关·低温冷藏模式
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 */
export const CookingMekColdStorageMode = summon(111151)
  .since("v6.2.0")
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .on("useSkill", (c, e) => {
    const escoffier = c.$(`my character with definition id ${Escoffier}`);
    if (!escoffier || !escoffier.hasEquipment(TeaPartiesBurstingWithColor)) {
      return false;
    }
    return e.isSkillType("normal") && e.skillCaller.id !== escoffier.id;
  })
  .usagePerRound(1)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 111156
 * @name 鎏金殿堂（生效中）
 * @description
 * 本回合中，所附属角色下次造成的伤害+2。
 */
export const GildedHallInEffect = status(111156)
  .since("v6.2.0")
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(2)
  .done();

/**
 * @id 111157
 * @name 白浪拂沙（生效中）
 * @description
 * 所附属角色下次使用技能时少花费1个元素骰。
 */
export const WavekissedSandsInEffect = status(111157)
  .since("v6.2.0")
  .once("deductOmniDiceSkill")
  .deductOmniCost(1)
  .done();

/**
 * @id 111158
 * @name 一捧绿野（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
export const VerdantGiftInEffect = status(111158)
  .since("v6.2.0")
  .once("increaseSkillDamage")
  .increaseDamage(1)
  .done();

/**
 * @id 111152
 * @name 鎏金殿堂
 * @description
 * 本回合中，目标角色下次造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
export const GildedHall = card(111152)
  .unobtainable() 
  .food()
  .characterStatus(GildedHallInEffect, "@targets.0")
  .done();

/**
 * @id 111153
 * @name 雾凇秋分
 * @description
 * 治疗目标角色1点，目标角色获得1点额外最大生命值。
 * （每回合每个角色最多食用1次「料理」）
 */
export const AutumnFrost = card(111153)
  .unobtainable() 
  .food()
  .heal(1, "@targets.0")
  .increaseMaxHealth(1, "@targets.0")
  .done();

/**
 * @id 111154
 * @name 白浪拂沙
 * @description
 * 所有我方角色获得饱腹，并且下次使用技能时少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
export const WaveKissedSands = card(111154)
  .unobtainable() 
  .combatFood({ satiatedFilter: "allNot" })
  .costVoid(2)
  .characterStatus(WavekissedSandsInEffect, "all my characters")
  .done();

/**
 * @id 111155
 * @name 一捧绿野
 * @description
 * 所有我方角色获得饱腹，并且下次造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
export const VerdantGift = card(111155)
  .unobtainable() 
  .combatFood({ satiatedFilter: "allNot" })
  .costSame(1)
  .characterStatus(VerdantGiftInEffect, "all my characters")
  .done();

/**
 * @id 111159
 * @name 全频谱多重任务厨艺机关
 * @description
 * 任意一方触发冰元素相关反应后：从鎏金殿堂、雾凇秋分、白浪拂沙、一捧绿野中随机生成1张手牌。
 * 可用次数：2
 */
export const AllspectrumMultiuseCookingMek = card(111159)
  .since("v6.2.0")
  .unobtainable()
  .support("place") // 神秘
  .on("reaction", (c, e) => e.relatedTo(DamageType.Cryo))
  .listenToAll()
  .usage(2)
  .do((c) => {
    const cards = [GildedHall, AutumnFrost, WaveKissedSands, VerdantGift];
    const selected = c.random(cards)
    c.createHandCard(selected);
  })
  .done();

/**
 * @id 11151
 * @name 后厨手艺
 * @description
 * 造成2点物理伤害。
 */
export const KitchenSkills = skill(11151)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11152
 * @name 低温烹饪
 * @description
 * 造成1点冰元素伤害，召唤厨艺机关·低温冷藏模式。
 */
export const LowtemperatureCooking: SkillHandle = skill(11152)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 1)
  .summon(CookingMekColdStorageMode)
  .done();

/**
 * @id 11153
 * @name 花刀技法
 * @description
 * 造成1点冰元素伤害，治疗我方所有角色2点。
 */
export const ScoringCuts = skill(11153)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 1)
  .heal(2, "all my characters")
  .done();

/**
 * @id 11154
 * @name 时时刻刻的即兴料理
 * @description
 * 【被动】战斗开始时，生成全频谱多重任务厨艺机关。
 */
export const ConstantOffthecuffCookery = skill(11154)
  .type("passive")
  .on("battleBegin")
  .do((c) => {
    c.createEntity("support", AllspectrumMultiuseCookingMek);
  })
  .done();

/**
 * @id 1115
 * @name 爱可菲
 * @description
 * 调霜焙巧，琢味求臻。
 */
export const Escoffier = character(1115)
  .since("v6.2.0")
  .tags("cryo", "pole", "fontaine", "pneuma")
  .health(10)
  .energy(2)
  .skills(KitchenSkills, LowtemperatureCooking, ScoringCuts, ConstantOffthecuffCookery)
  .done();

/**
 * @id 211151
 * @name 虹彩缤纷的甜点茶话
 * @description
 * 战斗行动：我方出战角色为爱可菲时，装备此牌。
 * 爱可菲装备此牌后，立刻使用一次低温烹饪。
 * 我方其他角色使用「普通攻击」后：触发我方厨艺机关·低温冷藏模式的「结束阶段」效果。（不消耗使用次数，每回合1次）
 * （牌组中包含爱可菲，才能加入牌组）
 */
export const TeaPartiesBurstingWithColor = card(211151)
  .since("v6.2.0")
  .costCryo(4)
  .talent(Escoffier)
  .on("enter")
  .useSkill(LowtemperatureCooking)
  .done();
