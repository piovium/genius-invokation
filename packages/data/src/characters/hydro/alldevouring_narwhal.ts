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

import { character, skill, summon, status, combatStatus, card, DamageType, customEvent, EntityState } from "@gi-tcg/core/builder";

// 入场时：获得我方已吞噬卡牌中最高元素骰费用值的「攻击力」，获得该费用的已吞噬卡牌数量的可用次数。

/**
 * @id 122043
 * @name 黑色幻影
 * @description
 * 入场时：获得我方已吞噬卡牌中最高当前元素骰费用的「攻击力」，获得该费用的已吞噬卡牌数量的可用次数。
 * 结束阶段：造成此牌「攻击力」值的雷元素伤害。
 * 我方出战角色受到伤害时：抵消1点伤害，然后此牌可用次数-2。
 */
export const DarkShadow = summon(122043)
  .tags("barrier")
  .usage(0)
  .variable("atk", 0, { visible: false })
  .variable("barrierUsage", 1, { visible: false })
  .hint(DamageType.Electro, (c, e) => e.variables.atk)
  .on("enter")
  .do((c) => {
    const domain = c.$(`my combat status with definition id ${DeepDevourersDomain}`)!;
    const maxCost = domain.getVariable("totalMaxCost");
    const count = domain.getVariable("totalMaxCostCount");
    if (count > 0) {
      c.setVariable("atk", maxCost);
      c.setVariable("usage", count);
    } else {
      c.dispose();
    }
  })
  .on("endPhase")
  .do((c) => {
    c.damage(DamageType.Electro, c.getVariable("atk"));
    c.consumeUsage();
  })
  .on("decreaseDamaged", (c, e) => c.getVariable("barrierUsage") && e.target.isActive())
  .decreaseDamage(1)
  .setVariable("barrierUsage", 0)
  .on("damaged", (c) => !c.getVariable("barrierUsage"))
  .consumeUsage(2)
  .setVariable("barrierUsage", 1)
  .done();

/**
 * @id 122042
 * @name 奇异之躯
 * @description
 * 每层为吞星之鲸提供1点最大生命。
 */
export const AnomalousAnatomy = status(122042)
  .variableCanAppend("extraMaxHealth", 1, Infinity)
  .done();

/**
 * @id 122045
 * @name 吞噬冲动
 * @description
 * 回合开始时：舍弃当前元素骰费用最高的2张手牌，治疗该角色1点生命值，并抓1张牌。
 */
export const DevourersImpulse = status(122045)
  .reserve();

/**
 * @id 122044
 * @name 吞噬本能
 * @description
 * 回合开始时：舍弃当前元素骰费用最高的1张手牌。
 */
export const DevourersInstinct = status(122044)
  .reserve();

/**
 * @id 122041
 * @name 深噬之域
 * @description
 * 我方从手牌中舍弃或调和的卡牌，会被吞噬。
 * 每吞噬3张牌：吞星之鲸在回合结束时获得1点额外最大生命；如果其中存在当前元素骰费用相同的牌，则额外获得1点；如果3张均相同，再额外获得1点。
 * 【此卡含描述变量】
 */
export const DeepDevourersDomain = combatStatus(122041)
  .variable("cardCount", 0)
  .variable("totalMaxCost", 0, { visible: false })
  .variable("totalMaxCostCount", 0, { visible: false })
  .variable("card0Cost", 0, { visible: false })
  .variable("card1Cost", 0, { visible: false })
  .variable("extraMaxHealth", 0, { visible: false })
  .replaceDescription("[GCG_TOKEN_SHIELD]", (_, self) => self.variables.extraMaxHealth)
  .on("disposeOrTuneCard", (c, e) => e.from.type === "hands" || e.isTuning())
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
        c.addVariable("extraMaxHealth", extraMaxHealth);
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
  .on("endPhase") // 文本有误，实为结束阶段时
  .do((c, e) => {
    const extraMaxHealth = c.getVariable("extraMaxHealth");
    if (extraMaxHealth) {
      const narwhal = c.$(`my character with definition id ${AlldevouringNarwhal}`);
      if (narwhal) {
        narwhal.addStatus(AnomalousAnatomy, {
          overrideVariables: { extraMaxHealth }
        });
        c.increaseMaxHealth(extraMaxHealth, narwhal);
      }
      c.setVariable("extraMaxHealth", 0);
    }
  })
  .done();

/**
 * @id 22041
 * @name 碎涛旋跃
 * @description
 * 造成2点物理伤害。
 */
export const ShatteringWaves = skill(22041)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

const StarfallShowerDisposeCard = customEvent<EntityState>("alldevouringNarwhal/starfallShowerDisposeCard");

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+3）。然后舍弃1张当前元素骰费用最高的手牌。
 */
export const StarfallShower = skill(22042)
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    const st = c.self.hasStatus(AnomalousAnatomy);
    const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 3) : 0;
    c.damage(DamageType.Hydro, 1 + extraDmg);
    const [card] = c.disposeMaxCostHands(1);
    if (card){
      c.emitCustomEvent(StarfallShowerDisposeCard, card.latest());
    }
  })
  .done();

/**
 * @id 22043
 * @name 横噬鲸吞
 * @description
 * 造成1点水元素伤害，对敌方所有后台角色造成1点穿透伤害。召唤黑色幻影。
 */
export const RavagingDevourer = skill(22043)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Hydro, 1)
  .summon(DarkShadow)
  .done();

/**
 * @id 22044
 * @name 无尽食欲
 * @description
 * 【被动】战斗开始时，生成深噬之域。
 */
export const InsatiableAppetite = skill(22044)
  .type("passive")
  .on("battleBegin")
  .combatStatus(DeepDevourersDomain)
  .done();

/**
 * @id 22045
 * @name 无尽食欲
 * @description
 * 【被动】战斗开始时，生成深噬之域。
 */
export const InsatiableAppetite01 = skill(22045)
  .reserve();

/**
 * @id 2204
 * @name 吞星之鲸
 * @description
 * 在最魔幻的故事里或是最疯癫的诳语中，宇宙深处真正的星辰或许也如提瓦特一般充满了生机，而宇宙本身就如同海洋。
 * 或许宇宙渗入提瓦特的过程从未停止；也许更高的意志为它划定了边界是为了保护这个世界。
 */
export const AlldevouringNarwhal = character(2204)
  .since("v4.7.0")
  .tags("hydro", "monster", "calamity")
  .health(6)
  .energy(2)
  .skills(ShatteringWaves, StarfallShower, RavagingDevourer, InsatiableAppetite)
  .done();

/**
 * @id 222041
 * @name 无光鲸噬
 * @description
 * 战斗行动：我方出战角色为吞星之鲸时，装备此牌。
 * 吞星之鲸装备此牌后，立刻使用一次迸落星雨。
 * 装备有此牌的吞星之鲸使用迸落星雨舍弃1张手牌后：治疗此角色，其数值等同于所舍弃手牌的当前元素骰费用。（每回合1次）
 * （牌组中包含吞星之鲸，才能加入牌组）
 */
export const LightlessFeeding = card(222041)
  .since("v4.7.0")
  .costHydro(4)
  .talent(AlldevouringNarwhal)
  .on("enter")
  .useSkill(StarfallShower)
  .on(StarfallShowerDisposeCard)
  .usagePerRound(1)
  .do((c, e) => {
    c.heal(c.get(e.arg).diceCost(), "@master")
  })
  .done();

