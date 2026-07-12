import { DiceType, DamageType, $, card, Reaction } from "@gi-tcg/core/builder";
import { Tighnari, VijnanaphalaMine, VijnanaSuffusion } from "../characters/dendro/tighnari.gts";
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
define card {
  id 217021 as private KeenSight;
  until "v6.6.0";
  cost DiceType.Dendro, 4;
  talent Tighnari {
    on enter {
      :useSkill(VijnanaphalaMine);
    }
    on deductVoidDiceSkill {
      when :( :self.master.hasStatus(VijnanaSuffusion) && 
          :e.isChargedAttack() );
      :e.deductVoidCost(1);
    }
  }
}

/**
 * @id 303042
 * @name 超导祝佑·电冲
 * @description
 * 投掷阶段：总是投出2个冰元素骰和2个雷元素骰。
 * 我方触发超导反应后：敌方生命值最高的一名角色受到2点穿透伤害。（每回合3次）
 */
define card {
  id 303042 as private SuperconductBlessingElectricSurge;
  until "v6.6.0";
  cost DiceType.Electro, 3;
  undiscoverable;
  support {
    on roll {
      :e.fixDice(DiceType.Cryo, 2);
      :e.fixDice(DiceType.Electro, 2);
    }
    on dealReaction {
      when :( :e.type === Reaction.Superconduct );
      usage perRound, 3;
      :damage(DamageType.Piercing, 2, "opp characters order by 0 - health limit 1");
    }
  }
}

/**
 * @id 303072
 * @name 火岩祝佑·重熔
 * @description
 * 投掷阶段：总是投出2个火元素骰和2个岩元素骰。
 * 我方造成后火元素伤害或岩元素伤害后：生成2层护盾。（每回合1次）
 */
define card {
  id 303072 as private LavaBlessingRemelting;
  until "v6.6.0";
  cost DiceType.Geo, 3;
  undiscoverable;
  support {
    on roll {
      :e.fixDice(DiceType.Pyro, 2);
      :e.fixDice(DiceType.Geo, 2);
    }
    on dealDamage {
      when :( ([DamageType.Pyro, DamageType.Geo] as DamageType[]).includes(:e.type) );
      usage perRound, 1;
      :combatStatus(Shield, "my", {
          overrideVariables: {
            shield: 2
          }
        });
    }
  }
}
