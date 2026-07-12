import { card, combatStatus, DamageType, DiceType, skill, summon } from "@gi-tcg/core/builder";
import { AlldevouringNarwhal, AnomalousAnatomy } from "../characters/hydro/alldevouring_narwhal.gts";
import { FestiveFires } from "../characters/pyro/xinyan.gts";

/**
 * @id 115113
 * @name 追影弹
 * @description
 * 加入手牌时：若我方出战角色为火/水/雷/冰，则将此牌转化为对应元素。
 * 打出或从手牌中舍弃此牌时：造成1点风元素伤害，然后将一张追影弹随机放进牌库。
 */
const ShadowhuntShell = card(115113)
  .until("v6.0.0")
  .undiscoverable()
  .costAnemo(3)
  .onHCI((c) => {
    const element = c.$(`my active`)?.element();
    if (element === DiceType.Pyro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellPyro);
    } else if (element === DiceType.Hydro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellHydro);
    } else if (element === DiceType.Electro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellElectro);
    } else if (element === DiceType.Cryo) {
      c.transformDefinition(c.self, ShiningShadowhuntShellCryo);
    }
  })
  .doSameWhenDisposed()
  .damage(DamageType.Anemo, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115114
 * @name 焕光追影弹·火
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点火元素伤害，然后将一张追影弹随机放进牌库。
 */
const ShiningShadowhuntShellPyro = card(115114)
  .until("v6.0.0")
  .undiscoverable()
  .costPyro(3)
  .doSameWhenDisposed()
  .damage(DamageType.Pyro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115115
 * @name 焕光追影弹·水
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点水元素伤害，然后将一张追影弹随机放进牌库。
 */
const ShiningShadowhuntShellHydro = card(115115)
  .until("v6.0.0")
  .undiscoverable()
  .costHydro(3)
  .doSameWhenDisposed()
  .damage(DamageType.Hydro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115116
 * @name 焕光追影弹·雷
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点雷元素伤害，然后将一张追影弹随机放进牌库。
 */
const ShiningShadowhuntShellElectro = card(115116)
  .until("v6.0.0")
  .undiscoverable()
  .costElectro(3)
  .doSameWhenDisposed()
  .damage(DamageType.Electro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115117
 * @name 焕光追影弹·冰
 * @description
 * 打出或从手牌中舍弃此牌时：造成1点冰元素伤害，然后将一张追影弹随机放进牌库。
 */
const ShiningShadowhuntShellCryo = card(115117)
  .until("v6.0.0")
  .undiscoverable()
  .costCryo(3)
  .doSameWhenDisposed()
  .damage(DamageType.Cryo, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();


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
  on declareEnd {
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
  replaceDescription "[GCG_TOKEN_SHIELD]", ((_, self) => self.variables.extraMaxHealth);
  on disposeOrTuneCard {
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
  :damage(DamageType.Piercing, 2, "opp standby");
  :damage(DamageType.Physical, 3);
  const cards = :player.hands.toSorted((a, b) => b.diceCost() - a.diceCost());
  :disposeCard(...cards);
  :combatStatus(FestiveFires);
}

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
    :disposeCard(:player.pile[0]);
  }
}
