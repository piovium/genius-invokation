// Copyright (C) 2024 Guyutongxue
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

import { character, skill, card, DamageType, status, summon, Reaction } from "@gi-tcg/core/builder";

/**
 * @id 117091
 * @name 钩索链接
 * @description
 * 敌方受到燃烧反应伤害或我方其他角色使用特技后：附属角色获得1点「夜魂值」。
 * 当夜魂值等于2点时：附属角色附属钩索准备，随后消耗2点「夜魂值」。（附属钩索准备后，我方角色选择行动前，若附属角色为出战角色：对最近的敌方角色造成3点草元素伤害）
 * 持续回合：2
 */
export const GrappleLink = status(117091)
  .since("v5.4.0")
  .duration(2)
  .defineSnippet((c) => {
    const nightsoul = c.self.master.hasNightsoulsBlessing();
    if (nightsoul && nightsoul.getVariable("nightsoul") === 2 && !c.self.master.hasStatus(GrapplePrepare)) {
      c.self.master.addStatus(GrapplePrepare);
      c.consumeNightsoul("@master", 2);
    }
  })
  .on("damaged", (c, e) =>
    e.getReaction() === Reaction.Burning &&
    !e.target.isMine()
  )
  .listenToAll()
  .gainNightsoul("@master")
  .callSnippet()
  // 实为使用特技前：总是在卡齐娜使用特技前吃到燃素充盈
  .on("beforeTechnique", (c, e) => e.techniqueCaller.id !== c.self.master.id)
  .listenToPlayer()
  .gainNightsoul("@master")
  .callSnippet()
  .on("beforeAction")
  .listenToAll()
  .callSnippet()
  .on("selfDispose")
  .do((c) => {
    // 钩锁链接离场时，角色退出夜魂加持
    const nightsoul = c.$(`my characters with definition id ${Kinich}`)?.hasNightsoulsBlessing();
    if (nightsoul) {
      c.dispose(nightsoul);
    }
  })
  .done();

/**
 * @id 117092
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
export const NightsoulsBlessing = status(117092)
  .since("v5.4.0")
  .nightsoulsBlessing(2)
  .done();

/**
 * @id 117093
 * @name 伟大圣龙阿乔
 * @description
 * 结束阶段：造成1点草元素伤害，然后对敌方下一个角色造成1点草元素伤害。
 * 可用次数：2
 */
export const AlmightyDragonlordAjaw = summon(117093)
  .since("v5.4.0")
  .endPhaseDamage(DamageType.Dendro, 1)
  .usage(2)
  .damage(DamageType.Dendro, 1, "opp next")
  .done();

/**
 * @id 117094
 * @name 钩索准备
 * @description
 * 我方角色选择行动前，若附属角色为出战角色：对最近的敌方角色造成3点草元素伤害。
 */
export const GrapplePrepare = status(117094)
  .since("v5.4.0")
  .once("beforeAction", (c) => c.self.master.isActive()) // 如果一直都打也太离谱了，先假设它只打一次
  .damage(DamageType.Dendro, 3, "recent opp from @master")
  .done();

/**
 * @id 17091
 * @name 夜阳斗技
 * @description
 * 造成2点物理伤害。
 */
export const NightsunStyle = skill(17091)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 17092
 * @name 悬猎·游骋高狩
 * @description
 * 选一个我方角色，自身附属钩索链接并进入夜魂加持。造成1点草元素伤害，然后与所选角色交换位置。
 */
export const CanopyHunterRidingHigh = skill(17092)
  .type("elemental")
  .costDendro(3)
  .addTarget("my characters")
  .characterStatus(GrappleLink)
  .characterStatus(NightsoulsBlessing)
  .damage(DamageType.Dendro, 1)
  .swapCharacterPosition("@self", "@targets.0")
  .do((c) => {
    const talent = c.self.hasEquipment(NightRealmsGiftRepaidInFull);
    if (
      talent &&
      c.player.hands.length <= c.oppPlayer.hands.length &&
      talent.variables.usagePerRound! > 0
    ) {
      if (c.oppPlayer.hands.length > 0) {
        const [targetCard] = c.maxCostHands(1, { who: "opp" });
        c.stealHandCard(targetCard);
      }
      c.drawCards(1, { who: "opp" });
      c.addVariable("usagePerRound", -1, talent);
    }
  })
  .done();

/**
 * @id 17093
 * @name 向伟大圣龙致意
 * @description
 * 造成1点草元素伤害，召唤伟大圣龙阿乔。
 */
export const HailToTheAlmightyDragonlord = skill(17093)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 1)
  .summon(AlmightyDragonlordAjaw)
  .done();

/**
 * @id 17094
 * @name
 * @description
 *
 */
export const Untitled11 = skill(17094)
  .reserve();

/**
 * @id 1709
 * @name 基尼奇
 * @description
 * 悬木游火，受任皆偿。
 */
export const Kinich = character(1709)
  .since("v5.4.0")
  .tags("dendro", "claymore", "natlan")
  .health(10)
  .energy(2)
  .skills(NightsunStyle, CanopyHunterRidingHigh, HailToTheAlmightyDragonlord)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 217091
 * @name 夜域赐礼·索报皆偿
 * @description
 * 装备有此牌的基尼奇切换至前台或使用悬猎·游骋高狩时：若我方手牌不多于对方，则窃取1张当前元素骰费用最高的对方手牌，然后对手抓1张牌。（每回合1次）
 * （牌组中包含基尼奇，才能加入牌组）
 */
export const NightRealmsGiftRepaidInFull = card(217091)
  .since("v5.4.0")
  .costDendro(1)
  .talent(Kinich, "none")
  .on("switchActive", (c, e) =>
    c.self.master.id === e.switchInfo.to.id &&
    c.player.hands.length <= c.oppPlayer.hands.length &&
    c.oppPlayer.hands.length > 0,
  )
  .usagePerRound(1)
  .do((c) => {
    const [targetCard] = c.maxCostHands(1, { who: "opp" });
    c.stealHandCard(targetCard);
    c.drawCards(1, { who: "opp" });
  })
  .done();
