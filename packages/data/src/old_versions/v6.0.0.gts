import { $, DamageType, DiceType } from "@gi-tcg/core/data";
import {
  AlldevouringNarwhal,
  AnomalousAnatomy,
} from "../characters/hydro/alldevouring_narwhal.gts";
import { FestiveFires } from "../characters/pyro/xinyan.gts";
import { BonecrunchersEnergyBlockCombatStatus } from "../cards/event/other.gts";

/**
 * @id 115113
 * @name 追影弹
 * @description
 * 加入手牌时：若我方出战角色为火/水/雷/冰，则将此牌转化为对应元素。
 * 打出或从手牌中舍弃此牌时：造成1点风元素伤害，然后将一张追影弹随机放进牌库。
 */
define card {
  id 115113 as private ShadowhuntShell;
  until "v6.0.0";
  undiscoverable;
  cost DiceType.Anemo, 3;
  on selfHandCardInserted {
    const element = :query($.my.active)?.element();
    if (element === DiceType.Pyro) {
      :transformDefinition(:self, ShiningShadowhuntShellPyro);
    } else if (element === DiceType.Hydro) {
      :transformDefinition(:self, ShiningShadowhuntShellHydro);
    } else if (element === DiceType.Electro) {
      :transformDefinition(:self, ShiningShadowhuntShellElectro);
    } else if (element === DiceType.Cryo) {
      :transformDefinition(:self, ShiningShadowhuntShellCryo);
    }
  };
  on selfDiscard, "=play";
  :damage(DamageType.Anemo, 1, $.macros.oppActivePrioritized);
  :createPileCards(ShadowhuntShell, 1, "random");
};

/**
 * @id 115114
 * @name 焕光追影弹·火
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点火元素伤害，然后将一张追影弹随机放进牌库。
 */
define card {
  id 115114 as private ShiningShadowhuntShellPyro;
  until "v6.0.0";
  undiscoverable;
  cost DiceType.Pyro, 3;
  on selfDiscard, "=play";
  :damage(DamageType.Pyro, 1, $.macros.oppActivePrioritized);
  :createPileCards(ShadowhuntShell, 1, "random");
};

/**
 * @id 115115
 * @name 焕光追影弹·水
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点水元素伤害，然后将一张追影弹随机放进牌库。
 */
define card {
  id 115115 as private ShiningShadowhuntShellHydro;
  until "v6.0.0";
  undiscoverable;
  cost DiceType.Hydro, 3;
  on selfDiscard, "=play";
  :damage(DamageType.Hydro, 1, $.macros.oppActivePrioritized);
  :createPileCards(ShadowhuntShell, 1, "random");
};

/**
 * @id 115116
 * @name 焕光追影弹·雷
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点雷元素伤害，然后将一张追影弹随机放进牌库。
 */
define card {
  id 115116 as private ShiningShadowhuntShellElectro;
  until "v6.0.0";
  undiscoverable;
  cost DiceType.Electro, 3;
  on selfDiscard, "=play";
  :damage(DamageType.Electro, 1, $.macros.oppActivePrioritized);
  :createPileCards(ShadowhuntShell, 1, "random");
};

/**
 * @id 115117
 * @name 焕光追影弹·冰
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点冰元素伤害，然后将一张追影弹随机放进牌库。
 */
define card {
  id 115117 as private ShiningShadowhuntShellCryo;
  until "v6.0.0";
  undiscoverable;
  cost DiceType.Cryo, 3;
  on selfDiscard, "=play";
  :damage(DamageType.Cryo, 1, $.macros.oppActivePrioritized);
  :createPileCards(ShadowhuntShell, 1, "random");
};

/**
 * @id 122043
 * @name 黑色幻影
 * @description
 * 入场时：获得我方已吞噬卡牌中最高元素骰费用值的「攻击力」，获得该费用的已吞噬卡牌数量的可用次数。
 * 结束阶段和我方宣布结束时：造成此牌「攻击力」值的雷元素伤害。
 * 我方出战角色受到伤害时：抵消1点伤害，然后此牌可用次数-2。
 */
define summon {
  id 122043 as private DarkShadow;
  until "v6.0.0";
  tags barrier;
  usage 0;
  variable atk, 0 {
    visible false;
  };
  variable barrierUsage, 1 {
    visible false;
  };
  hint DamageType.Electro, ((c, e) => e.variables.atk);
  on selfEnter {
    const domain = :query($.my.combatStatus.def(DeepDevourersDomain))!;
    const maxCost = domain.getVariable("totalMaxCost");
    const count = domain.getVariable("totalMaxCostCount");
    if (count > 0) {
      :setVariable("atk", maxCost);
      :setVariable("usage", count);
    } else {
      :dispose();
    }
  };
  on endPhase {
    :damage(DamageType.Electro, :getVariable("atk"));
    :consumeUsage();
  };
  on declareEnd {
    :damage(DamageType.Electro, :getVariable("atk"));
    :consumeUsage();
  };
  on decreaseDamaged {
    when :( :getVariable("barrierUsage") && :e.target.isActive() );
    :e.decreaseDamage(1);
    :setVariable("barrierUsage", 0);
  };
  on damaged {
    when :( !:getVariable("barrierUsage") );
    :consumeUsage(2);
    :setVariable("barrierUsage", 1);
  };
};

/**
 * @id 122041
 * @name 深噬之域
 * @description
 * 我方舍弃或调和的卡牌，会被吞噬。
 * 每吞噬3张牌：吞星之鲸在回合结束时获得1点额外最大生命；如果其中存在原本元素骰费用值相同的牌，则额外获得1点；如果3张均相同，再额外获得1点。
 * 【此卡含描述变量】
 */
define combatStatus {
  id 122041 as private DeepDevourersDomain;
  until "v6.0.0";
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
  replaceDescription "[GCG_TOKEN_SHIELD]",
    ((_, self) => self.variables.extraMaxHealth);
  on discardOrTuneCard {
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
        const distinctCostCount = new Set([card0Cost, card1Cost, card2Cost])
          .size;
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
  };
  on endPhase {
    // 文本有误，实为结束阶段时
    const extraMaxHealth = :getVariable("extraMaxHealth");
    if (extraMaxHealth) {
      const narwhal = :query($.my.character.def(AlldevouringNarwhal));
      if (narwhal) {
        narwhal.addStatus(AnomalousAnatomy, {
          overrideVariables: { extraMaxHealth },
        });
        :increaseMaxHealth(extraMaxHealth, narwhal);
      }
      :setVariable("extraMaxHealth", 0);
    }
  };
};

/**
 * @id 124051
 * @name 噬骸能量块
 * @description
 * 随机舍弃1张当前元素骰费用最高的手牌，生成1个我方出战角色类型的元素骰。（每回合最多打出1张）
 */
define card {
  id 124051 as BonecrunchersEnergyBlock;
  since "v4.7.0";
  undiscoverable;
  filter :(
    !:query($.my.combatStatus.def(BonecrunchersEnergyBlockCombatStatus))
  );
  :discardMaxCostHands(1);
  const activeCh = :query($.my.active)!;
  :generateDice(activeCh.element(), 1);
  :combatStatus(BonecrunchersEnergyBlockCombatStatus);
};

/**
 * @id 13123
 * @name 叛逆刮弦
 * @description
 * 造成3点物理伤害，对所有敌方后台角色造成2点穿透伤害；舍弃我方所有手牌，生成氛围烈焰。
 */
define skill {
  id 13123 as private RiffRevolution;
  until "v6.0.0";
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 2, $.opp.standby);
  :damage(DamageType.Physical, 3);
  const cards = :player.hands.toSorted((a, b) => b.diceCost() - a.diceCost());
  :discard(...cards);
  :combatStatus(FestiveFires);
};

/**
 * @id 23052
 * @name 蚀灭火羽
 * @description
 * 造成3点火元素伤害，我方舍弃牌组顶部1张牌。
 */
define skill {
  id 23052 as private ErodedFlamingFeathers;
  until "v6.0.0";
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  if (:player.pile.length > 0) {
    :discard(:player.pile[0]);
  }
};
