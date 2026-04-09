import { card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";
import { LetTheShowBegin, ShiningMiracle, WhisperOfWater } from "../characters/hydro/barbara";
import { FavoniusBladeworkEdel, IcetideVortex, WellspringOfWarlust } from "../characters/cryo/eula";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto";
import { Skirk, Skirk01 } from "../characters/cryo/skirk";
import { BattlePlan, CostReduction } from "../commons";
import { TideTurningSacredLord } from "../cards/support/adventure";

/**
 * @id 1201
 * @name 芭芭拉
 * @description
 * 无论何时都能治愈人心。
 */
const Barbara = character(1201)
  .until("v6.4.0")
  .tags("hydro", "catalyst", "mondstadt")
  .health(10)
  .energy(3)
  .skills(WhisperOfWater, LetTheShowBegin, ShiningMiracle)
  .done();

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成3点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
const LightfallSword = summon(111062)
  .until("v6.4.0")
  .hint(DamageType.Physical, "3+")
  .usage(0, { autoDispose: false })
  .on("useSkill", (c, e) =>
    e.skill.definition.id === FavoniusBladeworkEdel ||
    e.skill.definition.id === IcetideVortex)
  .do((c, e) => {
    if (e.skill.definition.id === IcetideVortex &&
      e.skillCaller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      c.self.addVariable("usage", 3);
    } else {
      c.self.addVariable("usage", 2);
    }
  })
  .on("endPhase")
  .do((c) => {
    c.damage(DamageType.Physical, 3 + c.getVariable("usage"));
    c.dispose();
  })
  .done();

/**
 * @id 111121
 * @name 佩伊刻计
 * @description
 * 我方每抓1张牌后：此牌累积1层「压力阶级」。
 * 所附属角色使用浮冰增压时：如果「压力阶级」至少有2层，则移除此效果，使技能少花费1元素骰，且如果此技能结算后「压力阶级」至少有4层，则再额外造成2点物理伤害。
 */
const PersTimer = status(111121)
  .until("v6.4.0")
  .variable("level", 0)
  .on("drawCard")
  .addVariable("level", 1)
  .on("deductOmniDiceSkill", (c, e) => c.getVariable("level") >= 2)
  .deductOmniCost(1)
  .on("useSkill", (c, e) => c.getVariable("level") >= 2)
  .if((c) => c.getVariable("level") >= 4)
  .damage(DamageType.Physical, 2)
  .dispose()
  .done();

/**
 * @id 111163
 * @name 虚境裂隙
 * @description
 * 舍弃1张当前元素骰费用为3的手牌，丝柯克获得2点蛇之狡谋。
 */
const VoidRift = card(111163)
  .until("v6.4.0")
  .undiscoverable()
  .do((c) => {
    const hand = c.player.hands.find((card) => card.diceCost() === 3);
    if (hand) {
      c.disposeCard(hand);
      const skirk = c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`);
      skirk?.addVariableWithMax("serpentsSubtlety", 2, 7);
    }
  })
  .done();

/**
 * @id 116051
 * @name 阿丑
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 此召唤物在场期间可触发1次：我方角色受到伤害后，为荒泷一斗附属乱神之怪力。
 * 结束阶段：弃置此牌，造成1点岩元素伤害。
 */
const Ushi = summon(116051)
  .until("v6.4.0")
  .tags("barrier")
  .endPhaseDamage(DamageType.Geo, 1)
  .dispose()
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .on("damaged")
  .usage(1, { name: "addStatusUsage" })
  .characterStatus(SuperlativeSuperstrength, `my characters with definition id 1605`)
  .done();

/**
 * @id 303318
 * @name 奇瑰之汤·激愤（生效中）
 * @description
 * 本回合中，该角色下一次造成的伤害+2。
 */
const MystiqueSoupFuryInEffect = status(303318)
  .until("v6.4.0")
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(2)
  .done();

/**
 * @id 321034
 * @name 天蛇船
 * @description
 * 冒险经历增加时：将1个元素骰转换为万能元素。
 * 冒险经历达到2时：抓1张牌。
 * 冒险经历达到4时：我方出战角色附属2层战斗计划。
 * 冒险经历达到6时：弃置敌方场上1个随机召唤物，召唤回天的圣主，然后弃置此牌。
 */
const Tonatiuh = card(321034)
  .until("v6.4.0")
  .adventureSpot()
  .on("adventure")
  .convertDice(DiceType.Omni, 1)
  .on("adventure", (c) => c.getVariable("exp") >= 2)
  .usage(1, { name: "stage1", visible: false })
  .drawCards(1)
  .on("adventure", (c) => c.getVariable("exp") >= 4)
  .usage(1, { name: "stage2", visible: false })
  .characterStatus(BattlePlan, "my active", {
    overrideVariables: { usage: 2 }
  })
  .on("adventure", (c) => c.getVariable("exp") >= 6)
  .usage(1, { name: "stage3", visible: false })
  .do((c) => {
    const summons = c.$$("opp summons");
    if (summons.length > 0) {
      const summon = c.random(summons);
      c.dispose(summon);
    }
    c.summon(TideTurningSacredLord);
    c.finishAdventure();
  })
  .done();

