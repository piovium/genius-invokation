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

import { card, character, customEvent, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { Satiated } from "../../commons.gts";

/**
 * @id 127041
 * @name 食足力增
 * @description
 * 每层使自身下次造成的伤害+1。（可叠加，没有上限，每次最多生效2层）
 */
define status {
  id 127041 as WellFedAndStrong;
  since "v5.8.0";
  on increaseSkillDamage {
    usage 1 {
      append;
    };
    const currentUsage = :getVariable("usage");
    const effectiveLayers = Math.min(currentUsage, 2);
    :e.increaseDamage(effectiveLayers);
    :consumeUsage(effectiveLayers);
  }
}

/**
 * @id 127042
 * @name 食足体健
 * @description
 * 自身下次受到的伤害-1。（可叠加，没有上限）
 */
define status {
  id 127042 as WellFedAndSturdy;
  since "v5.8.0";
  tags barrier;
  on decreaseDamaged {
    usage 1 {
      append;
    };
    :e.decreaseDamage(1);
  }
}

/**
 * @id 27041
 * @name 沉重尾击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 27041 as CrushingTailAttack;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 27042
 * @name 喷吐草实
 * @description
 * 造成2点草元素伤害，抓1张「料理」牌。
 */
define skill {
  id 27042 as FlyingFruit;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 2);
  :drawCards(1, { withTag: "food" });
}

/**
 * @id 27043
 * @name 榴果爆轰
 * @description
 * 造成5点火元素伤害。
 */
define skill {
  id 27043 as FlamegranateConflagration;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 5);
}

const GluttonousRexTriggerFromTalent = customEvent("mountainKing/gluttonousTriggerFromTalent");

/**
 * @id 27044
 * @name 贪食之王
 * @description
 * 自身不会饱腹。
 * 我方打出「料理」牌后：随机附属1层食足力增或食足体健，或获得1点额外最大生命值。（每回合2次）
 */
define skill {
  id 27044 as GluttonousRex01;
  skillType passive {
    defineSnippet :{
      :abortPreview();
      const choice = :random([WellFedAndStrong, WellFedAndSturdy, "incMaxHealth"] as const);
      if (choice === "incMaxHealth") {
        :increaseMaxHealth(1, "@self");
      } else {
        :characterStatus(choice, "@self");
      }
    };
    on playCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 2 {
        name "usagePerRound1";
      };
      :callSnippet();
    }
    on GluttonousRexTriggerFromTalent {
      :callSnippet();
    }
  }
}

/**
 * @id 27045
 * @name 贪食之王
 * @description
 * 自身不会饱腹。
 * 我方打出「料理」牌后：随机附属1层食足力增或食足体健，或获得1点额外最大生命值。（每回合2次）
 */
define skill {
  id 27045 as GluttonousRex02;
  skillType passive {
    on enterRelative {
      when :( :e.entity.definition.id === Satiated );
      void 0;
      // 不会饱腹 => 饱腹入场时弃置饱腹
      :dispose(:e.entity.cast<"status">());
    }
  }
}

/**
 * @id 2704
 * @name 贪食匿叶龙山王
 * @description
 * 自古老的年代存活至今，经历了无数战场的强大匿叶龙。
 */
define character {
  id 2704 as GluttonousYumkasaurMountainKing;
  since "v5.8.0";
  tags dendro, monster;
  health 8;
  energy 2;
  skills CrushingTailAttack, FlyingFruit, FlamegranateConflagration, GluttonousRex01, GluttonousRex02;
}

/**
 * @id 227041
 * @name 饕噬尽吞
 * @description
 * 快速行动：装备给我方的贪食匿叶龙山王，敌方抓1张牌，然后我方窃取1张当前元素骰费用最高的对方手牌。
 * 我方打出名称不存在于本局最初牌组的牌时：触发贪食之王1次。（每回合1次）
 * （牌组中包含贪食匿叶龙山王，才能加入牌组）
 */
define card {
  id 227041 as TheAlldevourer;
  since "v5.8.0";
  cost DiceType.Dendro, 1;
  talent GluttonousYumkasaurMountainKing, none {
    on enter {
      :drawCards(1, {who: "opp"});
      const [handCard] = :maxCostHands(1, { who: "opp" });
      if (handCard) {
        :stealHandCard(handCard);
      }
    }
    on playCard {
      when :( !:isInInitialPile(:e.card) );
      usage perRound, 1;
      :emitCustomEvent(GluttonousRexTriggerFromTalent);
    }
  }
}
