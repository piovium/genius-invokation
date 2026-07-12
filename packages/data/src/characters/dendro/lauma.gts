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

import { $, card, character, combatStatus, DamageType, DiceType, Reaction, skill } from "@gi-tcg/core/builder";
import { CostReduction } from "../../commons.gts";

/**
 * @id 117111
 * @name 霜林圣域
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 可用次数：2
 * 【此卡含描述变量】
 */
define combatStatus {
  id 117111 as FrostgroveSanctuary;
  since "v6.6.0";
  variable damageValue, 1 {
    visible false;
  };
  replaceDescription "[GCG_TOKEN_COUNTER]", ((_, self) => self.variables.damageValue);
  on endPhase {
    usage 2;
    :damage(DamageType.Dendro, :getVariable("damageValue"))
  }
}

/**
 * @id 117112
 * @name 「苍色祷歌」
 * @description
 * 我方触发月绽放造成的伤害+1。
 * 可用次数：3
 */
define combatStatus {
  id 117112 as PaleHymn;
  since "v6.6.0";
  on increaseDamage {
    when :( :e.getReaction() === Reaction.LunarBloom );
    usage 3;
    :e.increaseDamage(1);
  }
}

/**
 * @id 17111
 * @name 林麓旅踏
 * @description
 * 造成1点草元素伤害。
 */
define skill {
  id 17111 as PeregrinationOfLinnunrata;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Dendro, 1);
}

/**
 * @id 17112
 * @name 圣言述咏·终宵永眠
 * @description
 * 造成1点草元素伤害，生成霜林圣域。如果我方手牌中存在附着有费用降低的卡牌，则移除随机1张牌的1层费用降低效果并改为生成可造成2点伤害的霜林圣域。
 */
define skill {
  id 17112 as RunoDawnlessRestOfKarsikko;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 1);
  const reducedCards = :queryAll($.my.hand.with($.def(CostReduction)));
  const target = :random(reducedCards);
  if (target) {
    :combatStatus(FrostgroveSanctuary, "my", {
      overrideVariables: {
        damageValue: 2,
      },
    })
    // 去除一层降低就是加一层提高
    :attachCostIncrease(target);
  } else {
    :combatStatus(FrostgroveSanctuary);
  }
}

/**
 * @id 17113
 * @name 圣言述咏·众心为月
 * @description
 * 赋予我方随机3张当前元素骰费用不为0的手牌费用降低。生成3层「苍色祷歌」。
 */
define skill {
  id 17113 as RunoAllHeartsBecomeTheBeatingMoon;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  const candidates = :queryAll($.macros.myHandsNotFree);
  const targets = :randomSubset(candidates, 3);
  for (const target of targets) {
    :attachCostReduction(target);
  }
  :combatStatus(PaleHymn);
}

/**
 * @id 17114
 * @name 月兆祝赐·千籁恩宠
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 敌方受到月绽放反应时：使我方牌组中随机1张卡牌附着费用降低。
 */
define skill {
  id 17114 as MoonsignBenedictionNaturesChorus;
  skillType passive {
    on reaction {
      when :( :e.type === Reaction.LunarBloom && !:e.target.isMine() );
      listenTo all;
      const target = :random(:queryAll($.macros.myPileNotFree));
      if (target) {
        :attachCostReduction(target);
      }
    }
  }
}

/**
 * @id 17115
 * @name 月兆祝赐·千籁恩宠
 * @description
 * 【被动】本局游戏中，敌方受到绽放反应时，改为月绽放反应。
 * 敌方受到月绽放反应时：使我方牌组中随机1张卡牌附着费用降低。
 */
define skill {
  id 17115 as MoonsignBenedictionNaturesChorus01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 1711
 * @name 菈乌玛
 * @description
 * 镜中有月，月碎水中。
 */
define character {
  id 1711 as Lauma;
  since "v6.6.0";
  tags dendro, catalyst, nodkrai;
  health 11;
  energy 2;
  skills PeregrinationOfLinnunrata, RunoDawnlessRestOfKarsikko, RunoAllHeartsBecomeTheBeatingMoon, MoonsignBenedictionNaturesChorus;
  enabledLunarReactions Reaction.LunarBloom;
}

/**
 * @id 217111
 * @name 「唇啊，为我纺出歌与吟哦」
 * @description
 * 战斗行动：我方出战角色为菈乌玛时，装备此牌。
 * 菈乌玛装备此牌后，立刻使用一次圣言述咏·终宵永眠。
 * 我方触发绽放和月绽放后：治疗我方受伤最多的角色2点。（每回合1次）
 * （牌组中包含菈乌玛，才能加入牌组）
 */
define card {
  id 217111 as OLipsWeaveMeSongsAndPsalms;
  since "v6.6.0";
  cost DiceType.Dendro, 3;
  talent Lauma {
    on enter {
      :useSkill(RunoDawnlessRestOfKarsikko);
    }
    on dealReaction {
      when :( ([Reaction.Bloom, Reaction.LunarBloom] as Reaction[]).includes(:e.type) );
      listenTo samePlayer;
      usage perRound, 1;
      :heal(2, $.macros.myMostInjured);
    }
  }
}
