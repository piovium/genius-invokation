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

import { $, card, character, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { BonecrunchersEnergyBlock, BonecrunchersEnergyBlockCombatStatus } from "../../cards/event/other.gts";

/**
 * @id 27055
 * @name 催萌腐草
 * @description
 * 造成2点草元素伤害。
 */
define skill {
  id 27055 as SproutsOfTheBlightedRot;
  skillType burst;
  prepared;
  :damage(DamageType.Dendro, 2);
}

/**
 * @id 127051
 * @name 催萌腐草
 * @description
 * 本角色将在下次行动时，直接使用技能：催萌腐草。
 */
define status {
  id 127051 as SproutsOfTheBlightedRotStatus;
  since "v6.5.0";
  prepare SproutsOfTheBlightedRot;
}

/**
 * @id 27051
 * @name 利爪猛击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 27051 as ClawSlash;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 27052
 * @name 掠能绿波
 * @description
 * 造成2点草元素伤害，从牌组中抓1张噬骸能量块。
 */
define skill {
  id 27052 as SiphonWave;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 2);
  :drawCards(1, { withDefinition: BonecrunchersEnergyBlock });
}

/**
 * @id 27053
 * @name 横生厄蔓
 * @description
 * 造成4点草元素伤害，如果手牌中存在噬骸能量块，则舍弃1张并准备技能催萌腐草。
 */
define skill {
  id 27053 as SprawlingBlightedVines;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 4);
  const block = :query($.my.hand.def(BonecrunchersEnergyBlock));
  if (block) {
    :disposeCard(block);
    :characterStatus(SproutsOfTheBlightedRotStatus, "@self");
  }
}

/**
 * @id 27054
 * @name 亡骸饥渴
 * @description
 * 【被动】战斗开始时，生成2张噬骸能量块放入牌组底。我方每回合可以额外打出1张噬骸能量块。
 */
define skill {
  id 27054 as HungerFromTheRemains;
  skillType passive {
    on battleBegin {
      :createPileCards(BonecrunchersEnergyBlock, 2, "bottom");
    }
    on enterRelative {
      when :( :e.entity.definition.id === BonecrunchersEnergyBlockCombatStatus );
      listenTo samePlayer;
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :dispose(:e.entity.cast<"combatStatus">());
    }
  }
}

/**
 * @id 27056
 * @name 亡骸饥渴
 * @description
 * 【被动】战斗开始时，生成2张噬骸能量块放入牌组底。我方每回合可以额外打出1张噬骸能量块。
 */
define skill {
  id 27056 as HungerFromTheRemains01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 2705
 * @name 圣骸牙兽
 * @description
 * 因为啃噬伟大的生命体，而扭曲异变的掠食者。驱使着狂乱的蔓草之力。
 */
define character {
  id 2705 as ConsecratedFangedBeast;
  since "v6.5.0";
  tags dendro, monster, sacread;
  health 10;
  energy 2;
  skills ClawSlash, SiphonWave, SprawlingBlightedVines, HungerFromTheRemains, SproutsOfTheBlightedRot;
}

/**
 * @id 227051
 * @name 亡草蔽日
 * @description
 * 快速行动：装备给我方的圣骸牙兽。
 * 我方打出或舍弃噬骸能量块时：抓1张牌。（每回合1次）
 * （牌组中包含圣骸牙兽，才能加入牌组）
 */
define card {
  id 227051 as WitheredReedsEclipseTheSun;
  since "v6.5.0";
  cost DiceType.Dendro, 1;
  talent ConsecratedFangedBeast, none {
    variable usagePerRound, 1;
    on playCard {
      when :( :getVariable("usagePerRound") && :e.card.definition.id === BonecrunchersEnergyBlock );
      :drawCards(1);
      :setVariable("usagePerRound", 0);
    }
    on disposeCard {
      when :( :getVariable("usagePerRound") && :e.entity.definition.id === BonecrunchersEnergyBlock );
      :drawCards(1);
      :setVariable("usagePerRound", 0);
    }
    on roundEnd {
      :setVariable("usagePerRound", 1);
    }
  }
}
