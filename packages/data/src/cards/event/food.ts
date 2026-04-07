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

import { DiceType, StatusHandle, card, combatStatus, status } from "@gi-tcg/core/builder";
import { Satiated } from "../../commons";

/**
 * @id 333001
 * @name 绝云锅巴
 * @description
 * 本回合中，目标角色下一次「普通攻击」造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [JueyunGuoba] = card(333001)
  .since("v3.3.0")
  .food()
  .toStatus(303301, "@targets.0")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();

/**
 * @id 333002
 * @name 仙跳墙
 * @description
 * 本回合中，目标角色下一次「元素爆发」造成的伤害+3。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [AdeptusTemptation] = card(333002)
  .since("v3.3.0")
  .costVoid(2)
  .food()
  .toStatus(303302, "@targets.0")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(3)
  .done();

/**
 * @id 333003
 * @name 莲花酥
 * @description
 * 本回合中，目标角色下次受到的伤害-3。
 * （每回合中每个角色最多食用1次「料理」）
 */
export const [LotusFlowerCrisp] = card(333003)
  .since("v3.3.0")
  .costSame(1)
  .food()
  .toStatus(303303, "@targets.0")
  .tags("barrier")
  .oneDuration()
  .once("decreaseDamaged")
  .decreaseDamage(3)
  .done();

/**
 * @id 333004
 * @name 北地烟熏鸡
 * @description
 * 本回合中，目标角色下一次「普通攻击」少花费1个无色元素。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [NorthernSmokedChicken] = card(333004)
  .since("v3.3.0")
  .food()
  .toStatus(303304, "@targets.0")
  .oneDuration()
  .once("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(1)
  .done();

/**
 * @id 333005
 * @name 甜甜花酿鸡
 * @description
 * 治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const SweetMadame = card(333005)
  .since("v3.3.0")
  .food({ injuredOnly: true })
  .heal(1, "@targets.0")
  .done();

/**
 * @id 333006
 * @name 蒙德土豆饼
 * @description
 * 治疗目标角色2点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const MondstadtHashBrown = card(333006)
  .since("v3.3.0")
  .costSame(1)
  .food({ injuredOnly: true })
  .heal(2, "@targets.0")
  .done();

/**
 * @id 333007
 * @name 烤蘑菇披萨
 * @description
 * 治疗目标角色1点，两回合内结束阶段再治疗此角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [MushroomPizza] = card(333007)
  .since("v3.3.0")
  .costSame(1)
  .food({ injuredOnly: true })
  .heal(1, "@targets.0")
  .toStatus(303305, "@targets.0")
  .duration(2)
  .on("endPhase")
  .heal(1, "@master")
  .done();

/**
 * @id 303306
 * @name 兽肉薄荷卷（生效中）
 * @description
 * 角色在本回合结束前，之后3次「普通攻击」都少花费1个无色元素。
 */
export const MintyMeatRollsInEffect = status(303306)
  .since("v3.3.0")
  .oneDuration()
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .usage(3)
  .deductVoidCost(1)
  .done();

/**
 * @id 333008
 * @name 兽肉薄荷卷
 * @description
 * 目标角色在本回合结束前，之后3次「普通攻击」都少花费1个无色元素。
 * （每回合每个角色最多食用1次「料理」）
 */
export const MintyMeatRolls = card(333008)
  .since("v3.3.0")
  .costSame(1)
  .food()
  .characterStatus(MintyMeatRollsInEffect, "@targets.0")
  .done();

/**
 * @id 303307
 * @name 复苏冷却中
 * @description
 * 本回合无法通过「料理」复苏角色。
 */
export const ReviveOnCooldown = combatStatus(303307)
  .oneDuration()
  .done();

/**
 * @id 333009
 * @name 提瓦特煎蛋
 * @description
 * 复苏目标角色，并治疗此角色1点。
 * （每回合中，最多通过「料理」复苏1个角色，并且每个角色最多食用1次「料理」）
 */
export const TeyvatFriedEgg = card(333009)
  .since("v3.7.0")
  .costSame(2)
  .tags("food")
  .filter((c) => !c.$(`my combat status with definition id ${ReviveOnCooldown}`))
  .addTarget("my defeated characters")
  .heal(1, "@targets.0", { kind: "revive" })
  .characterStatus(Satiated, "@targets.0")
  .combatStatus(ReviveOnCooldown)
  .done();

/**
 * @id 333010
 * @name 刺身拼盘
 * @description
 * 目标角色在本回合结束前，「普通攻击」造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [SashimiPlatter] = card(333010)
  .since("v3.7.0")
  .costSame(1)
  .food()
  .toStatus(303308, "@targets.0")
  .oneDuration()
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();

/**
 * @id 333011
 * @name 唐杜尔烤鸡
 * @description
 * 本回合中，所有我方角色下一次「元素战技」造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [TandooriRoastChicken] = card(333011)
  .since("v3.7.0")
  .costVoid(2)
  .combatFood()
  .toStatus(303309, `my characters and not has status with definition id ${Satiated}`)
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("elemental"))
  .increaseDamage(2)
  .done();

/**
 * @id 333012
 * @name 黄油蟹蟹
 * @description
 * 本回合中，所有我方角色下次受到的伤害-2。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [ButterCrab] = card(333012)
  .since("v3.7.0")
  .costVoid(2)
  .combatFood()
  .toStatus(303310, `my characters and not has status with definition id ${Satiated}`)
  .tags("barrier")
  .oneDuration()
  .once("decreaseDamaged")
  .decreaseDamage(2)
  .done();

/**
 * @id 333013
 * @name 炸鱼薯条
 * @description
 * 本回合中，所有我方角色下次使用技能时少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [FishAndChips] = card(333013)
  .since("v4.3.0")
  .costVoid(2)
  .combatFood()
  .toStatus(303311, `my characters and not has status with definition id ${Satiated}`)
  .oneDuration()
  .once("deductOmniDiceSkill")
  .deductOmniCost(1)
  .done();

/**
 * @id 333014
 * @name 松茸酿肉卷
 * @description
 * 治疗目标角色2点，3回合内的结束阶段再治疗此角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [MatsutakeMeatRolls] = card(333014)
  .since("v4.4.0")
  .costSame(2)
  .food({ injuredOnly: true })
  .heal(2, "@targets.0")
  .toStatus(303312, "@targets.0")
  .on("endPhase")
  .usage(3)
  .heal(1, "@master")
  .done();

/**
 * @id 333015
 * @name 缤纷马卡龙
 * @description
 * 治疗目标角色1点，该角色接下来3次受到伤害后再治疗其1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [RainbowMacarons, RainbowMacaronsInEffect] = card(333015)
  .since("v4.6.0")
  .costVoid(2)
  .food({ injuredOnly: true })
  .heal(1, "@targets.0")
  .toStatus(303313, "@targets.0")
  .on("damaged")
  .usage(3)
  .heal(1, "@master")
  .done();

/**
 * @id 133085
 * @name 唐社尔烤鸡
 * @description
 * 本回合中，所有我方角色下一次「元素战技」造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
export const TandooriGrilledChicken = card(133085) // 骗骗花
  .reserve();

/**
 * @id 133097
 * @name 甜甜酿花鸡
 * @description
 * 治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const SweetMaam = card(133097) // 骗骗花
  .reserve();

/**
 * @id 133098
 * @name 美味马卡龙
 * @description
 * 治疗目标角色1点，该角色接下来3次受到伤害后再治疗其1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const DeliciousMacarons = card(133098) // 骗骗花
  .reserve();

/**
 * @id 333016
 * @name 龙龙饼干
 * @description
 * 本回合中，目标角色下一次使用「特技」少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [SaurusCrackers] = card(333016)
  .since("v5.1.0")
  .food()
  .toStatus(303314, "@targets.0")
  .oneDuration()
  .once("deductOmniDiceTechnique")
  .deductOmniCost(1)
  .done();

/**
 * @id 333017
 * @name 宝石闪闪
 * @description
 * 目标角色获得1点额外最大生命值。
 * （每回合每个角色最多食用1次「料理」）
 */
export const GlitteringGemstones = card(333017)
  .since("v5.3.0")
  .costSame(1)
  .food()
  .increaseMaxHealth(1, "@targets.0")
  .done();

/**
 * @id 333018
 * @name 咚咚嘭嘭
 * @description
 * 接下来3次名称不存在于初始牌组中的牌加入我方手牌时，目标我方角色治疗自身1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [PuffPops, PuffPopsInEffect] = card(333018)
  .since("v5.3.0")
  .costSame(1)
  .food()
  .toStatus(303315, "@targets.0")
  .on("handCardInserted", (c, e) => !c.isInInitialPile(e.card))
  .usage(3)
  .heal(1, "@master")
  .done();

/**
 * @id 333019
 * @name 温泉时光
 * @description
 * 治疗目标，其数值等同于我方场上召唤物的数量。
 * （每回合每个角色最多食用1次「料理」）
 */
export const HotSpringOclock = card(333019)
  .since("v5.4.0")
  .costSame(1)
  .food({ injuredOnly: true })
  .do((c) => {
    c.heal(c.$$(`my summons`).length, "@targets.0");
  })
  .done();

/**
 * @id 333021
 * @name 奇瑰之汤·疗愈
 * @description
 * 治疗目标角色2点。
 */
export const MystiqueSoupHealing = card(333021)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .heal(2, "@targets.0")
  .done();

/**
 * @id 333022
 * @name 奇瑰之汤·助佑
 * @description
 * 本回合中，目标角色下次使用技能时少花费2个元素骰。
 */
export const [MystiqueSoupProvidence] = card(333022)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .toStatus(303317, "@targets.0")
  .oneDuration()
  .once("deductOmniDiceSkill")
  .deductOmniCost(2)
  .done();

/**
 * @id 303318
 * @name 奇瑰之汤·激愤（生效中）
 * @description
 * 本回合中，该角色下一次造成的伤害+1。
 * 可用次数：2
 */
export const MystiqueSoupFuryInEffect = status(303318)
  .oneDuration()
  .on("increaseSkillDamage")
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 333023
 * @name 奇瑰之汤·激愤
 * @description
 * 本回合中，目标角色下次造成的伤害+1。（最多生效2次）
 */
export const MystiqueSoupFury = card(333023)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .characterStatus(MystiqueSoupFuryInEffect, "@targets.0")
  .done();

/**
 * @id 333024
 * @name 奇瑰之汤·宁静
 * @description
 * 本回合中，目标角色下次受到的伤害-2。
 */
export const [MystiqueSoupSerenity] = card(333024)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .toStatus(303319, "@targets.0")
  .tags("barrier")
  .oneDuration()
  .once("decreaseDamaged")
  .decreaseDamage(2)
  .done();

/**
 * @id 333025
 * @name 奇瑰之汤·安神
 * @description
 * 本回合中，目标我方角色受到的伤害-1。（最多生效3次）
 */
export const [MystiqueSoupSoothing] = card(333025)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .toStatus(303320, "@targets.0")
  .tags("barrier")
  .oneDuration()
  .on("decreaseDamaged")
  .usage(3)
  .decreaseDamage(1)
  .done();

/**
 * @id 333026
 * @name 奇瑰之汤·鼓舞
 * @description
 * 目标角色获得1点额外最大生命值。
 */
export const MystiqueSoupInspiration = card(333026)
  .since("v5.5.0")
  .food()
  .undiscoverable()
  .increaseMaxHealth(1, "@targets.0")
  .done();

/**
 * @id 333020
 * @name 奇瑰之汤
 * @description
 * 从3个随机效果中挑选1个，对目标角色生效。
 * （每回合每个角色最多食用1次「料理」）
 */
export const MystiqueSoup = card(333020)
  .since("v5.5.0")
  .costSame(1)
  .food({ noSatiated: true })
  .do((c, e) => {
    const allCards = [MystiqueSoupHealing, MystiqueSoupProvidence, MystiqueSoupFury, MystiqueSoupSerenity, MystiqueSoupSoothing, MystiqueSoupInspiration];
    const candidates = c.randomSubset(allCards, 3);
    c.selectAndPlay(candidates, e.targets[0]);
  })
  .done();

/**
 * @id 333027
 * @name 纵声欢唱
 * @description
 * 所有我方角色获得饱腹，抓2张牌，下2次切换角色少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [SingYourHeartOut] = card(333027)
  .since("v5.6.0")
  .costVoid(3)
  .combatFood({ satiatedFilter: "allNot" })
  .drawCards(2)
  .toCombatStatus(303321)
  .on("deductOmniDiceSwitch")
  .usage(2)
  .deductOmniCost(1)
  .done();

/**
 * @id 333028
 * @name 丰稔之赐
 * @description
 * 治疗目标角色1点，目标角色之后2次准备技能时：治疗自身1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const HarvestsBoon = card(333028)
  .since("v5.7.0")
  .costSame(1)
  .food()
  .heal(1, "@targets.0")
  .toStatus(303322, "@targets.0")
  .on("enterRelative", (c, e) =>
    e.entity.definition.type === "status" &&
    e.entity.definition.tags.includes("preparingSkill"))
  .usage(2)
  .heal(1, "@master")
  .done();

/**
 * @id 333029
 * @name 沉玉茶露
 * @description
 * 选择1个我方角色，我方下2次冒险或结束阶段时，治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
export const [ChenyuBrew] = card(333029)
  .since("v6.1.0")
  .food()
  .toStatus(303323, "@targets.0")
  .usage(2)
  .on("adventure")
  .heal(1, "@master")
  .consumeUsage()
  .on("endPhase")
  .heal(1, "@master")
  .consumeUsage()
  .done();
