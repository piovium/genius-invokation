import { card, skill, DiceType, status, DamageType, StatusHandle, summon } from "@gi-tcg/core/builder";
import { Diluc, SearingOnslaught } from "../characters/pyro/diluc";
import { NiwabiFiredance, Yoimiya } from "../characters/pyro/yoimiya";
import { KyoukaFuushi } from "../characters/hydro/kamisato_ayato";
import { AdeptusArtPreserverOfFortune, Qiqi } from "../characters/cryo/qiqi";

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
const InEveryHouseAStove = card(330005)
  .until("v4.6.1")
  .legend()
  .do((c) => {
    const count = Math.min(c.roundNumber - 1, 4);
    c.drawCards(count);
  })
  .done();

/**
 * @id 213011
 * @name 流火焦灼
 * @description
 * 战斗行动：我方出战角色为迪卢克时，装备此牌。
 * 迪卢克装备此牌后，立刻使用一次逆焰之刃。
 * 装备有此牌的迪卢克每回合第2次使用逆焰之刃时：少花费1个火元素。
 * （牌组中包含迪卢克，才能加入牌组）
 */
const FlowingFlame = card(213011)
  .until("v4.6.1")
  .costPyro(3)
  .talent(Diluc)
  .on("enter")
  .useSkill(SearingOnslaught)
  .on("deductElementDiceSkill", (c, e) =>
    e.action.skill.definition.id === SearingOnslaught && 
    c.countOfSkill(Diluc, SearingOnslaught) === 1 &&
    e.canDeductCostOfType(DiceType.Pyro))
  .deductCost(DiceType.Pyro, 1)
  .done();

/**
 * @id 113051
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 可用次数：2
 */
const NiwabiEnshou = status(113051)
  .until("v4.6.1")
  .conflictWith(113053)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫所生成的庭火焰硝初始可用次数+1，并且触发后额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
const NaganoharaMeteorSwarm = card(213051)
  .until("v4.6.1")
  .costPyro(2)
  .talent(Yoimiya)
  .on("enter")
  .useSkill(NiwabiFiredance)
  .done();

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
const TakimeguriKanka: StatusHandle = status(112061)
  .until("v4.6.1")
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(3)
  .increaseDamage(1)
  .if((c, e) => c.self.master.hasEquipment(KyoukaFuushi) && e.target.health <= 6)
  .increaseDamage(1)
  .done();

/**
 * @id 111081
 * @name 寒病鬼差
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：3
 * 此召唤物在场时，七七使用「普通攻击」后：治疗受伤最多的我方角色1点。
 */
export const HeraldOfFrost = summon(111081)
  .until("v4.6.1")
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(3)
  .on("useSkill", (c, e) => e.skill.caller.definition.id === Qiqi && e.isSkillType("normal"))
  .heal(1, "my characters order by health - maxHealth limit 1")
  .done();

/**
 * @id 211081
 * @name 起死回骸
 * @description
 * 战斗行动：我方出战角色为七七时，装备此牌。
 * 七七装备此牌后，立刻使用一次仙法·救苦度厄。
 * 装备有此牌的七七使用仙法·救苦度厄时：复苏我方所有倒下的角色，并治疗其2点。（整场牌局限制2次）
 * （牌组中包含七七，才能加入牌组）
 */
export const RiteOfResurrection = card(211081)
  .until("v4.6.1")
  .costCryo(5)
  .costEnergy(3)
  .talent(Qiqi)
  .on("enter")
  .useSkill(AdeptusArtPreserverOfFortune)
  .on("useSkill", (c, e) => e.skill.definition.id === AdeptusArtPreserverOfFortune)
  .usage(2, { autoDispose: false })
  .do((c) => {
    for (const ch of c.$$(`all my defeated characters`)) {
      ch.heal(2, { kind: "revive" });
    }
  })
  .done();
