// Copyright (C) 2026 Piovium Labs
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

import { DiceType, DamageType, $, Reaction } from "@gi-tcg/core/builder";
import { RES } from "../../commons.gts";

/**
 * @id 117121
 * @name 诳言之核
 * @description
 * 战斗行动：奈芙尔为出战角色时可以使用。
 * 奈芙尔使用技能：幻戏。
 */
define card {
  id 117121 as SeedsOfDeceit;
  since "v6.7.0";
  tags action;
  undiscoverable;
  addTarget $.my.active.def(Nefer).exclude($.has.typeStatus.tag("disableSkill"));
  :useSkill(PhantasmPerformance);
}

/**
 * @id 117122
 * @name 弈术·千夜一舞(生效中）
 * @description
 * 我方下次行动前：赋予手牌中至多3张费用最高的诳言之核费用降低。
 */
define combatStatus {
  id 117122 as SenetStrategyDanceOfAThousandNightsInEffect;
  since "v6.7.0";
  once beforeAction {
    const candidates = :maxCostHands(3, {
      filter: (card) => card.definition.id === SeedsOfDeceit
    });
    for (const card of candidates) {
      :attachCostReduction(card);
    }
  }
}

/**
 * @id 17121
 * @name 游虵吐信
 * @description
 * 造成1点草元素伤害。
 */
define skill {
  id 17121 as StrikingSerpent;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Dendro, 1);
}

/**
 * @id 17122
 * @name 弈术·千夜一舞
 * @description
 * 造成1点草元素伤害，自身附属1层抗性，我方下次行动前，赋予手牌中至多3张费用最高的诳言之核费用降低。
 */
define skill {
  id 17122 as SenetStrategyDanceOfAThousandNights;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 1);
  :characterStatus(RES, :self);
  :combatStatus(SenetStrategyDanceOfAThousandNightsInEffect);
}

/**
 * @id 17123
 * @name 圣约·真眸幻戏
 * @description
 * 造成4点草元素伤害，手牌中每有1张诳言之核，伤害+1。（至多+2）
 */
define skill {
  id 17123 as SacredVowTrueEyesPhantasm;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  const deceitCount = :queryAll($.my.hand.def(SeedsOfDeceit)).length;
  :damage(DamageType.Dendro, 4 + Math.min(deceitCount, 2));
}

/**
 * @id 17124
 * @name 月兆祝赐·廊下暮影
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 我方手牌中诳言之核少于3张，敌方受到月绽放反应时：生成手牌诳言之核。（每回合2次）
 */
define skill {
  id 17124 as MoonsignBenedictionDusklitEaves;
  skillType passive {
    on reaction {
      when :(
        !:e.target.isMine() && 
        :e.type === Reaction.LunarBloom &&
        :queryAll($.my.hand.def(SeedsOfDeceit)).length < 3
      );
      usage perRound, 2 { name usagePerRound1 };
      listenTo all;
      :createHandCard(SeedsOfDeceit);
    }
  }
}

/**
 * @id 17125
 * @name 月兆祝赐·廊下暮影
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 我方手牌中诳言之核少于3张，敌方受到月绽放反应时：生成手牌诳言之核。（每回合2次）
 */
define skill {
  id 17125 as MoonsignBenedictionDusklitEaves01;
  skillType passive;
  reserved;
}

/**
 * @id 17126
 * @name 幻戏
 * @description
 * 造成4点草元素伤害。
 */
define skill {
  id 17126 as PhantasmPerformance;
  skillType normal;
  hidden;
  noEnergy;
  :damage(DamageType.Dendro, 4);
}

/**
 * @id 1712
 * @name 奈芙尔
 * @description
 * 秘闻求解，索见诸心。
 */
define character {
  id 1712 as Nefer;
  since "v6.7.0";
  tags dendro, catalyst, sumeru, nodkrai;
  health 10;
  energy 2;
  skills StrikingSerpent, SenetStrategyDanceOfAThousandNights, SacredVowTrueEyesPhantasm, MoonsignBenedictionDusklitEaves, PhantasmPerformance;
  enabledLunarReactions Reaction.LunarBloom;
}

/**
 * @id 217121
 * @name 决胜于逆转之时
 * @description
 * 快速行动：装备给我方的奈芙尔。
 * 生成3张诳言之核，均匀地置入我方牌组中，并赋予我方手牌和牌组中所有诳言之核费用降低。
 * 我方奈芙尔使用幻戏造成伤害后：抓1张牌，并赋予我方手牌和牌组中所有诳言之核费用降低。（每回合2次）
 * （牌组中包含奈芙尔，才能加入牌组）
 */
define card {
  id 217121 as VictoryFlowsFromTheTurningOfTides;
  since "v6.7.0";
  cost DiceType.Dendro, 3;
  talent Nefer, none {
    defineSnippet attachCostReductionToSeedsOfDeceit, :{
      const deceitCards = :queryAll($.my.pile.def(SeedsOfDeceit));
      for (const card of deceitCards) {
        :attachCostReduction(card);
      }
    }
    on enter {
      :createPileCards(SeedsOfDeceit, 3, "spaceAround");
      :callSnippet.attachCostReductionToSeedsOfDeceit();
    }
    on skillDamage {
      when :( :e.via.definition.id === PhantasmPerformance );
      usage perRound, 2;
      :drawCards(1);
      :callSnippet.attachCostReductionToSeedsOfDeceit();
    }
  }
}
