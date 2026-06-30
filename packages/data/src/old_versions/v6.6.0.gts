import { DiceType, DamageType, $, card, Reaction } from "@gi-tcg/core/builder";
import { Tighnari, VijnanaphalaMine, VijnanaSuffusion } from "../characters/dendro/tighnari";
import { Shield } from "../commons.gts";

/**
 * @id 217021
 * @name 眼识殊明
 * @description
 * 战斗行动：我方出战角色为提纳里时，装备此牌。
 * 提纳里装备此牌后，立刻使用一次识果种雷。
 * 装备有此牌的提纳里在附属通塞识状态期间，进行重击时少花费1个无色元素。
 * （牌组中包含提纳里，才能加入牌组）
 */
const KeenSight = card(217021)
  .until("v6.6.0")
  .costDendro(4)
  .talent(Tighnari)
  .on("enter")
  .useSkill(VijnanaphalaMine)
  .on("deductVoidDiceSkill", (c, e) => 
    c.self.master.hasStatus(VijnanaSuffusion) && 
    e.isChargedAttack())
  .deductVoidCost(1)
  .done();

/**
 * @id 303042
 * @name 超导祝佑·电冲
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个雷元素骰。
 * 我方触发超导反应后：敌方生命值最高的一名角色受到2点穿透伤害。（每回合3次）
 */
const SuperconductBlessingElectricSurge = card(303042)
  .until("v6.6.0")
  .costElectro(3)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Cryo, 2)
  .fixDice(DiceType.Electro, 2)
  .on("dealReaction", (c, e) => e.type === Reaction.Superconduct)
  .usagePerRound(3)
  .damage(DamageType.Piercing, 2, `opp characters order by 0 - health limit 1`)
  .done();

/**
 * @id 303072
 * @name 火岩祝佑·重熔
 * @description
 * 投掷阶段：总是投出2个火元素骰和2个岩元素骰。
 * 我方造成后火元素伤害或岩元素伤害后：生成2层护盾。（每回合1次）
 */
const LavaBlessingRemelting = card(303072)
  .until("v6.6.0")
  .costGeo(3)
  .undiscoverable()
  .support()
  .on("roll")
  .fixDice(DiceType.Pyro, 2)
  .fixDice(DiceType.Geo, 2)
  .on("dealDamage", (c, e) => ([DamageType.Pyro, DamageType.Geo] as DamageType[]).includes(e.type))
  .usagePerRound(1)
  .combatStatus(Shield, "my", {
    overrideVariables: {
      shield: 2
    }
  })
  .done();
