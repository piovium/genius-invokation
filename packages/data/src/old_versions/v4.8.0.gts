import { card, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { Cyno, PactswornPathclearer, SecretRiteChasmicSoulfarer } from "../characters/electro/cyno.gts";
import { AlldevouringNarwhal, AnomalousAnatomy, LightlessFeeding } from "../characters/hydro/alldevouring_narwhal.gts";

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数至少为2时，使用秘仪·律渊渡魂造成的伤害+2。（每回合1次）
 * （牌组中包含赛诺，才能加入牌组）
 */
define card {
  id 214041 as private FeatherfallJudgment;
  until "v4.8.0";
  cost DiceType.Electro, 3;
  talent Cyno {
    on enter {
      :useSkill(SecretRiteChasmicSoulfarer);
    }
    on increaseSkillDamage {
      when :{
        const status = :self.master.hasStatus(PactswornPathclearer)!;
        return :getVariable("reliance", status) >=2 && :e.via.definition.id === SecretRiteChasmicSoulfarer;
      };
      usage perRound, 1;
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 122041
 * @name 深噬之域
 * @description
 * 我方舍弃或调和的卡牌，会被吞噬。
 * 每吞噬3张牌：吞星之鲸获得1点额外最大生命；如果其中存在原本元素骰费用值相同的牌，则额外获得1点；如果3张均相同，再额外获得1点。
 */
define combatStatus {
  id 122041 as private DeepDevourersDomain;
  until "v4.8.0";
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
        const narwhal = :$(`my character with definition id ${AlldevouringNarwhal}`);
        if (narwhal) {
          for (let i = 0; i < extraMaxHealth; i++) {
            narwhal.addStatus(AnomalousAnatomy);
            :increaseMaxHealth(1, narwhal);
          }
        }
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
}

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+4）。然后舍弃1张原本元素骰费用最高的手牌。
 */
define skill {
  id 22042 as private StarfallShower;
  until "v4.8.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  const st = :self.hasStatus(AnomalousAnatomy);
  const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 4) : 0;
  :damage(DamageType.Hydro, 1 + extraDmg);
  const [card] = :disposeMaxCostHands(1);
  if (card) {
    if (:self.hasEquipment(LightlessFeeding)) {
      :heal(card.diceCost(), "@self");
    }
  }
}

/**
 * @id 311409
 * @name 勘探钻机
 * @description
 * 所附属角色受到伤害时：如可能，舍弃原本元素骰费用最高的1张手牌，以抵消1点伤害，然后累积1点「团结」。（每回合最多触发2次）
 * 角色使用技能时：如果此牌已有「团结」，则消耗所有「团结」，使此技能伤害+1，并且每消耗1点「团结」就抓1张牌。
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311409 as private ProspectorsDrill;
  until "v4.8.0";
  cost DiceType.Aligned, 2;
  weapon pole {
    variable solidarity, 0;
    on decreaseDamaged {
      when :( :player.hands.length > 0 );
      usage perRound, 2;
      :disposeMaxCostHands(1);
      :e.decreaseDamage(1);
      :addVariable("solidarity", 1);
    }
    on increaseSkillDamage {
      when :( :getVariable("solidarity") > 0 );
      :e.increaseDamage(1);
      :drawCards(:getVariable("solidarity"));
      :setVariable("solidarity", 0);
    }
  }
}

/**
 * @id 122
 * @name 生命之契
 * @description
 * 所附属角色受到治疗时：此效果每有1次可用次数，就消耗1次，以抵消1点所受到的治疗。（无法抵消复苏、获得最大生命值或分配生命值引发的治疗）
 * 可用次数：1（可叠加，没有上限）
 */
define status {
  id 122 as private BondOfLife;
  until "v4.8.0";
  on decreaseHealed {
    when :( :e.healInfo.healKind === "common" );
    usage 1 {
      append;
    };
    const deducted = Math.min(:getVariable("usage"), :e.expectedValue);
    :e.decreaseHeal(deducted);
    :consumeUsage(deducted);
  }
}
