import { card, combatStatus, DamageType, skill, status } from "@gi-tcg/core/builder";
import { Cyno, PactswornPathclearer, SecretRiteChasmicSoulfarer } from "../characters/electro/cyno";
import { AlldevouringNarwhal, AnomalousAnatomy, LightlessFeeding } from "../characters/hydro/alldevouring_narwhal";

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数至少为2时，使用秘仪·律渊渡魂造成的伤害+2。（每回合1次）
 * （牌组中包含赛诺，才能加入牌组）
 */
const FeatherfallJudgment = card(214041)
  .until("v4.8.0")
  .costElectro(3)
  .talent(Cyno)
  .on("enter")
  .useSkill(SecretRiteChasmicSoulfarer)
  .on("increaseSkillDamage", (c, e) => {
    const status = c.self.master.hasStatus(PactswornPathclearer)!;
    return c.getVariable("reliance", status) >=2 && e.via.definition.id === SecretRiteChasmicSoulfarer;
  })
  .usagePerRound(1)
  .increaseDamage(2)
  .done();

/**
 * @id 122041
 * @name 深噬之域
 * @description
 * 我方舍弃或调和的卡牌，会被吞噬。
 * 每吞噬3张牌：吞星之鲸获得1点额外最大生命；如果其中存在原本元素骰费用值相同的牌，则额外获得1点；如果3张均相同，再额外获得1点。
 */
const DeepDevourersDomain = combatStatus(122041)
  .until("v4.8.0")
  .variable("cardCount", 0)
  .variable("totalMaxCost", 0, { visible: false })
  .variable("totalMaxCostCount", 0, { visible: false })
  .variable("card0Cost", 0, { visible: false })
  .variable("card1Cost", 0, { visible: false })
  .on("disposeOrTuneCard")
  .do((c, e) => {
    const cost = e.diceCost();
    c.addVariable("cardCount", 1);
    switch (c.getVariable("cardCount")) {
      case 1: {
        c.setVariable("card0Cost", cost);
        break;
      }
      case 2: {
        c.setVariable("card1Cost", cost);
        break;
      }
      case 3: {
        const card0Cost = c.getVariable("card0Cost");
        const card1Cost = c.getVariable("card1Cost");
        const card2Cost = cost;
        const distinctCostCount = new Set([card0Cost, card1Cost, card2Cost]).size;
        const extraMaxHealth = 4 - distinctCostCount;
        const narwhal = c.$(`my character with definition id ${AlldevouringNarwhal}`);
        if (narwhal) {
          for (let i = 0; i < extraMaxHealth; i++) {
            narwhal.addStatus(AnomalousAnatomy);
            c.increaseMaxHealth(1, narwhal);
          }
        }
        c.setVariable("cardCount", 0);
        break;
      }
    }
    const previousTotalMaxCost = c.getVariable("totalMaxCost");
    if (cost === previousTotalMaxCost) {
      c.addVariable("totalMaxCostCount", 1);
    } else if (cost > previousTotalMaxCost) {
      c.setVariable("totalMaxCost", cost);
      c.setVariable("totalMaxCostCount", 1);
    }
  })
  .done();

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+4）。然后舍弃1张原本元素骰费用最高的手牌。
 */
const StarfallShower = skill(22042)
  .until("v4.8.0")
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    const st = c.self.hasStatus(AnomalousAnatomy);
    const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 4) : 0;
    c.damage(DamageType.Hydro, 1 + extraDmg);
    const [card] = c.disposeMaxCostHands(1);
    if (card) {
      if (c.self.hasEquipment(LightlessFeeding)) {
        c.heal(card.diceCost(), "@self");
      }
    }
  })
  .done();

/**
 * @id 311409
 * @name 勘探钻机
 * @description
 * 所附属角色受到伤害时：如可能，舍弃原本元素骰费用最高的1张手牌，以抵消1点伤害，然后累积1点「团结」。（每回合最多触发2次）
 * 角色使用技能时：如果此牌已有「团结」，则消耗所有「团结」，使此技能伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const ProspectorsDrill = card(311409)
  .until("v4.8.0")
  .costSame(2)
  .weapon("pole")
  .variable("solidarity", 0)
  .on("decreaseDamaged", (c, e) => c.player.hands.length > 0)
  .usagePerRound(2)
  .disposeMaxCostHands(1)
  .decreaseDamage(1)
  .addVariable("solidarity", 1)
  .on("increaseSkillDamage", (c) => c.getVariable("solidarity") > 0)
  .do((c, e) => {
    e.increaseDamage(1);
    c.drawCards(c.getVariable("solidarity"));
    c.setVariable("solidarity", 0);
  })
  .done();

/**
 * @id 122
 * @name 生命之契
 * @description
 * 所附属角色受到治疗时：此效果每有1次可用次数，就消耗1次，以抵消1点所受到的治疗。（无法抵消复苏、获得最大生命值或分配生命值引发的治疗）
 * 可用次数：1（可叠加，没有上限）
 */
const BondOfLife = status(122)
  .until("v4.8.0")
  .on("decreaseHealed", (c, e) => e.healInfo.healKind === "common")
  .usageCanAppend(1)
  .do((c, e) => {
    const deducted = Math.min(c.getVariable("usage"), e.expectedValue);
    e.decreaseHeal(deducted);
    c.consumeUsage(deducted);
  })
  .done();
