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

import { DiceType, DamageType, $ } from "@gi-tcg/core/builder";
import { RES } from "../../commons.gts";

/**
 * @id 125041
 * @name 舍身架势
 * @description
 * 本角色将在下次行动时，直接使用技能：舍身架势。
 */
define status {
  id 125041 as RecklessStanceStatus;
  since "v6.7.0";
  prepare RecklessStance;
}

/**
 * @id 125042
 * @name 怒风循击
 * @description
 * 本角色将在下次行动时，直接使用技能：怒风循击。
 */
define status {
  id 125042 as GalePursuitStatus;
  since "v6.7.0";
  prepare GalePursuit;
}

/**
 * @id 25041
 * @name 半剑技术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 25041 as HalfswordTechnique;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 25042
 * @name 低位撩斩
 * @description
 * 造成3点风元素伤害，抓1张牌。
 */
define skill {
  id 25042 as RisingSlash;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 3);
  :drawCards(1);
}

/**
 * @id 25043
 * @name 近卫姿态
 * @description
 * 准备技能：舍身架势，然后准备技能：怒风循击。
 */
define skill {
  id 25043 as GuardStance;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :characterStatus(RecklessStanceStatus);
}

/**
 * @id 25044
 * @name 前驱气势
 * @description
 * 【被动】我方触发扩散反应，或敌方失去护盾、 伤害抵消状态以及出战状态时，抓1张牌。（每回合2次）
 */
define skill {
  id 25044 as VanguardMomentum;
  skillType passive {
    variable drawCardsUsagePerRound, 2;
    on dealReaction {
      when :( :getVariable("drawCardsUsagePerRound") > 0 && :e.relatedTo(DamageType.Anemo) );
      listenTo samePlayer;
      :drawCards(1);
      :addVariable("drawCardsUsagePerRound", -1);
    }
    on dispose {
      when :( 0 &&
        !:e.entity.isMine() &&
        (:e.entity.definition.type === "status" || :e.entity.definition.type === "combatStatus") &&
        (:e.entity.definition.tags.includes("shield") || :e.entity.definition.tags.includes("barrier"))
      );
      listenTo all;
      :drawCards(1);
      :addVariable("drawCardsUsagePerRound", -1);
    }
    on roundEnd {
      :setVariable("drawCardsUsagePerRound", 2);
    }
  }
}

/**
 * @id 25045
 * @name 舍身架势
 * @description
 * 造成3点风元素伤害，舍弃1张当前元素骰费用最高的手牌，准备技能:怒风循击。
 */
define skill {
  id 25045 as RecklessStance;
  skillType burst;
  prepared;
  :damage(DamageType.Anemo, 3);
  :disposeMaxCostHands(1);
  :characterStatus(GalePursuitStatus);
}

/**
 * @id 25046
 * @name 怒风循击
 * @description
 * 造成3点风元素伤害，舍弃1张当前元素骰费用最高的手牌。
 */
define skill {
  id 25046 as GalePursuit;
  skillType burst;
  prepared;
  :damage(DamageType.Anemo, 3);
  :disposeMaxCostHands(1);
}

/**
 * @id 2504
 * @name 黑蛇骑士·斩风之剑
 * @description
 * 「在宫廷当中颇具地位的近卫军人，『末光之剑』也曾是他们当中的一员。」
 */
define character {
  id 2504 as BlackSerpentKnightWindcutter;
  since "v6.7.0";
  tags anemo, monster;
  health 10;
  energy 2;
  skills HalfswordTechnique, RisingSlash, GuardStance, VanguardMomentum, RecklessStance, GalePursuit;
}

/**
 * @id 225041
 * @name 「曾如孤风阻隔黑灾蔓延…」
 * @description
 * 战斗行动：我方出战角色为黑蛇骑士·斩风之剑时，装备此牌。
 * 黑蛇骑士·斩风之剑装备此牌后，立刻使用一次低位撩斩。
 * 行动阶段开始时：如果敌方手牌数量大于等于7，则敌方出战角色附属1层抗性；如果我方手牌数量大于等于7，则我方出战角色附属2层抗性。
 * （牌组中包含黑蛇骑士·斩风之剑，才能加入牌组）
 */
define card {
  id 225041 as OnceTheLoneWindThatKeptTheDarkCalamityAtBay;
  since "v6.7.0";
  cost DiceType.Anemo, 3;
  talent BlackSerpentKnightWindcutter {
    on enter {
      :useSkill(RisingSlash);
    }
    on actionPhase {
      if (:oppPlayer.hands.length >= 7) {
        :characterStatus(RES, $.opp.active)
      }
      if (:player.hands.length >= 7) {
        :characterStatus(RES, $.my.active, {
          overrideVariables: {
            usage: 2
          }
        })
      }
    }
  }
}
