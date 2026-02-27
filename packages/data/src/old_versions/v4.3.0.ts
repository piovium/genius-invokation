import { card, status } from "@gi-tcg/core/builder";
import { StrifefulLightning, ThunderManifestation, ThunderingShacklesSummon } from "../characters/electro/thunder_manifestation";

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
const InEveryHouseAStove = card(330005)
  .until("v4.3.0")
  .legend()
  .do((c) => {
    const count = Math.min(c.roundNumber, 4);
    c.drawCards(count);
  })
  .done();

/**
 * @id 312022
 * @name 花海甘露之光
 * @description
 * 角色受到伤害后：如果所附属角色为「出战角色」，则抓1张牌。（每回合1次）
 * 结束阶段：治疗所附属角色1点。
 * （角色最多装备1件「圣遗物」）
 */
const VourukashasGlow = card(312022)
  .until("v4.3.0")
  .costSame(1)
  .artifact()
  .on("damaged", (c) => c.self.master.isActive())
  .usagePerRound(1)
  .drawCards(1)
  .on("endPhase")
  .heal(1, "@master")
  .done();

/**
 * @id 124022
 * @name 雷鸣探知
 * @description
 * 此状态存在期间，可以触发1次：所附属角色受到雷音权现及其召唤物造成的伤害+1。
 * （同一方场上最多存在一个此状态。雷音权现的部分技能，会以所附属角色为目标。）
 */
const LightningRod = status(124022)
  .until("v4.3.0")
  .unique()
  .on("increaseDamaged", (c, e) => [
      ThunderManifestation as number, 
      ThunderingShacklesSummon as number
    ].includes(e.source.definition.id))
  .usage(1, { autoDispose: false })
  .increaseDamage(1)
  .done();

/**
 * @id 224021
 * @name 悲号回唱
 * @description
 * 装备有此牌的雷音权现在场，附属有雷鸣探知的敌方角色受到伤害时：我方抓1张牌。（每回合1次）
 * （牌组中包含雷音权现，才能加入牌组）
 */
const GrievingEcho = card(224021)
  .until("v4.3.0")
  .talent(ThunderManifestation, "none")
  .on("damaged", (c, e) => !e.target.isMine() && e.target.hasStatus(LightningRod))
  .listenToAll()
  .usagePerRound(1)
  .drawCards(1)
  .done();

