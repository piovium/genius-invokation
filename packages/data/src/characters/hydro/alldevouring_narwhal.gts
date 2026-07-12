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

import { card, character, combatStatus, customEvent, DamageType, DiceType, skill, status, summon, type EntityState } from "@gi-tcg/core/builder";

// 入场时：获得我方已吞噬卡牌中最高元素骰费用值的「攻击力」，获得该费用的已吞噬卡牌数量的可用次数。

/**
 * @id 122043
 * @name 黑色幻影
 * @description
 * 入场时：获得我方已吞噬卡牌中最高当前元素骰费用的「攻击力」，获得该费用的已吞噬卡牌数量的可用次数。
 * 结束阶段：造成此牌「攻击力」值的雷元素伤害。
 * 我方出战角色受到伤害时：抵消1点伤害，然后此牌可用次数-2。
 */
define summon {
  id 122043 as DarkShadow;
  tags barrier;
  usage 0;
  variable atk, 0 {
    visible false;
  };
  variable barrierUsage, 1 {
    visible false;
  };
  hint DamageType.Electro, ((c, e) => e.variables.atk);
  on enter {
    const domain = :$(`my combat status with definition id ${DeepDevourersDomain}`)!;
    const maxCost = domain.getVariable("totalMaxCost");
    const count = domain.getVariable("totalMaxCostCount");
    if (count > 0) {
      :setVariable("atk", maxCost);
      :setVariable("usage", count);
    } else {
      :dispose();
    }
  }
  on endPhase {
    :damage(DamageType.Electro, :getVariable("atk"));
    :consumeUsage();
  }
  on decreaseDamaged {
    when :( :getVariable("barrierUsage") && :e.target.isActive() );
    :e.decreaseDamage(1);
    :setVariable("barrierUsage", 0);
  }
  on damaged {
    when :( !:getVariable("barrierUsage") );
    :consumeUsage(2);
    :setVariable("barrierUsage", 1);
  }
}

/**
 * @id 122042
 * @name 奇异之躯
 * @description
 * 每层为吞星之鲸提供1点最大生命。
 */
define status {
  id 122042 as AnomalousAnatomy;
  variable extraMaxHealth, 1 {
    append;
  };
}

/**
 * @id 122045
 * @name 吞噬冲动
 * @description
 * 回合开始时：舍弃当前元素骰费用最高的2张手牌，治疗该角色1点生命值，并抓1张牌。
 */
define status {
  id 122045 as DevourersImpulse;
  reserved;
}

/**
 * @id 122044
 * @name 吞噬本能
 * @description
 * 回合开始时：舍弃当前元素骰费用最高的1张手牌。
 */
define status {
  id 122044 as DevourersInstinct;
  reserved;
}

/**
 * @id 122041
 * @name 深噬之域
 * @description
 * 我方从手牌中舍弃或调和的卡牌，会被吞噬。
 * 每吞噬3张牌：吞星之鲸在回合结束时获得1点额外最大生命；如果其中存在当前元素骰费用相同的牌，则额外获得1点；如果3张均相同，再额外获得1点。
 * 【此卡含描述变量】
 */
define combatStatus {
  id 122041 as DeepDevourersDomain;
  variable cardCount, 0;
  variable totalMaxCost, 0 {
    visible false;
  };
  variable totalMaxCostCount, 0 {
    visible false;
  };
  variable card0Cost, 0 {
    visible false;
  };
  variable card1Cost, 0 {
    visible false;
  };
  variable extraMaxHealth, 0 {
    visible false;
  };
  replaceDescription "[GCG_TOKEN_SHIELD]", ((_, self) => self.variables.extraMaxHealth);
  on disposeOrTuneCard {
    when :( :e.from.type === "hands" || :e.isTuning() );
    const cost = :e.diceCost();
    :addVariable("cardCount", 1);
    switch (:getVariable("cardCount")) {
      case 1: {
        :setVariable("card0Cost", cost);
        break;
      }
      case 2: {
        :setVariable("card1Cost", cost);
        break;
      }
      case 3: {
        const card0Cost = :getVariable("card0Cost");
        const card1Cost = :getVariable("card1Cost");
        const card2Cost = cost;
        const distinctCostCount = new Set([card0Cost, card1Cost, card2Cost]).size;
        const extraMaxHealth = 4 - distinctCostCount;
        :addVariable("extraMaxHealth", extraMaxHealth);
        :setVariable("cardCount", 0);
        break;
      }
    }
    const previousTotalMaxCost = :getVariable("totalMaxCost");
    if (cost === previousTotalMaxCost) {
      :addVariable("totalMaxCostCount", 1);
    } else if (cost > previousTotalMaxCost) {
      :setVariable("totalMaxCost", cost);
      :setVariable("totalMaxCostCount", 1);
    }
  }
  on endPhase { // 文本有误，实为结束阶段时
    const extraMaxHealth = :getVariable("extraMaxHealth");
    if (extraMaxHealth) {
      const narwhal = :$(`my character with definition id ${AlldevouringNarwhal}`);
      if (narwhal) {
        narwhal.addStatus(AnomalousAnatomy, {
          overrideVariables: { extraMaxHealth }
        });
        :increaseMaxHealth(extraMaxHealth, narwhal);
      }
      :setVariable("extraMaxHealth", 0);
    }
  }
}

/**
 * @id 22041
 * @name 碎涛旋跃
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 22041 as ShatteringWaves;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

const StarfallShowerDisposeCard = customEvent<EntityState>("alldevouringNarwhal/starfallShowerDisposeCard");

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+3）。然后舍弃1张当前元素骰费用最高的手牌。
 */
define skill {
  id 22042 as StarfallShower;
  skillType elemental;
  cost DiceType.Hydro, 3;
  const st = :self.hasStatus(AnomalousAnatomy);
  const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 3) : 0;
  :damage(DamageType.Hydro, 1 + extraDmg);
  const [card] = :disposeMaxCostHands(1);
  if (card){
    :emitCustomEvent(StarfallShowerDisposeCard, card.latest());
  }
}

/**
 * @id 22043
 * @name 横噬鲸吞
 * @description
 * 造成1点水元素伤害，对敌方所有后台角色造成1点穿透伤害。召唤黑色幻影。
 */
define skill {
  id 22043 as RavagingDevourer;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Hydro, 1);
  :summon(DarkShadow);
}

/**
 * @id 22044
 * @name 无尽食欲
 * @description
 * 【被动】战斗开始时，生成深噬之域。
 */
define skill {
  id 22044 as InsatiableAppetite;
  skillType passive {
    on battleBegin {
      :combatStatus(DeepDevourersDomain);
    }
  }
}

/**
 * @id 22045
 * @name 无尽食欲
 * @description
 * 【被动】战斗开始时，生成深噬之域。
 */
define skill {
  id 22045 as InsatiableAppetite01;
  skillType passive;
  reserved;
}

/**
 * @id 2204
 * @name 吞星之鲸
 * @description
 * 在最魔幻的故事里或是最疯癫的诳语中，宇宙深处真正的星辰或许也如提瓦特一般充满了生机，而宇宙本身就如同海洋。
 * 或许宇宙渗入提瓦特的过程从未停止；也许更高的意志为它划定了边界是为了保护这个世界。
 */
define character {
  id 2204 as AlldevouringNarwhal;
  since "v4.7.0";
  tags hydro, monster, calamity;
  health 6;
  energy 2;
  skills ShatteringWaves, StarfallShower, RavagingDevourer, InsatiableAppetite;
}

/**
 * @id 222041
 * @name 无光鲸噬
 * @description
 * 战斗行动：我方出战角色为吞星之鲸时，装备此牌。
 * 吞星之鲸装备此牌后，立刻使用一次迸落星雨。
 * 装备有此牌的吞星之鲸使用迸落星雨舍弃1张手牌后：治疗此角色，其数值等同于所舍弃手牌的当前元素骰费用。（每回合1次）
 * （牌组中包含吞星之鲸，才能加入牌组）
 */
define card {
  id 222041 as LightlessFeeding;
  since "v4.7.0";
  cost DiceType.Hydro, 4;
  talent AlldevouringNarwhal {
    on enter {
      :useSkill(StarfallShower);
    }
    on StarfallShowerDisposeCard {
      usage perRound, 1;
      :heal(:get(:e.arg).diceCost(), "@master")
    }
  }
}
