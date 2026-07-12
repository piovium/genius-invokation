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

import { card, character, combatStatus, DamageType, DiceType, skill } from "@gi-tcg/core/builder";
import { BonecrunchersEnergyBlock } from "../../cards/event/other.gts";

/**
 * @id 124052
 * @name 雷锥陷阱
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成2点雷元素伤害。
 * 可用次数：初始为创建时所弃置的噬骸能量块张数。（最多叠加到3）
 */
define combatStatus {
  id 124052 as ThunderboreTrap;
  on useSkill {
    usage 0 {
      append 3;
    };
    :damage(DamageType.Electro, 2, "my active");
  }
}

/**
 * @id 24051
 * @name 蝎爪钳击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 24051 as ScorpionStrike;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 24052
 * @name 蝎尾锥刺
 * @description
 * 造成3点雷元素伤害。
 * 生成1张噬骸能量块，随机置入我方牌库顶部2张牌之中。
 */
define skill {
  id 24052 as StingingSpine;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
  :createPileCards(BonecrunchersEnergyBlock, 1, "topRange2");
}

/**
 * @id 24053
 * @name 雷锥散射
 * @description
 * 造成3点雷元素伤害，舍弃手牌中最多3张噬骸能量块，在对方场上生成雷锥陷阱。
 */
define skill {
  id 24053 as ThunderboreBlast;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 3);
  const cards = :player.hands.filter((card) => card.definition.id === BonecrunchersEnergyBlock).slice(0, 3);
  :disposeCard(...cards);
  if (cards.length) {
    :combatStatus(ThunderboreTrap, "opp", {
      overrideVariables: { usage: cards.length }
    });
  }
}

/**
 * @id 24054
 * @name 不朽亡骸·雷
 * @description
 * 【被动】回合结束时，生成2张噬骸能量块，随机置入我方牌库顶部10张牌之中。
 */
define skill {
  id 24054 as ImmortalRemnantsElectro;
  skillType passive {
    on roundEnd {
      :createPileCards(BonecrunchersEnergyBlock, 2, "topRange10");
    }
  }
}

/**
 * @id 2405
 * @name 圣骸毒蝎
 * @description
 * 因为啃噬伟大的生命体，而扭曲异变的毒蝎，操纵着险恶的轰雷。
 */
define character {
  id 2405 as ConsecratedScorpion;
  since "v4.7.0";
  tags electro, monster, sacread;
  health 10;
  energy 2;
  skills ScorpionStrike, StingingSpine, ThunderboreBlast, ImmortalRemnantsElectro;
}

/**
 * @id 224051
 * @name 亡雷凝蓄
 * @description
 * 入场时：生成1张噬骸能量块，置入我方手牌。
 * 装备有此牌的圣骸毒蝎在场，我方打出噬骸能量块后：抓1张牌，然后生成1张噬骸能量块，随机置入我方牌库中。
 * （牌组中包含圣骸毒蝎，才能加入牌组）
 */
define card {
  id 224051 as FatalFulmination;
  since "v4.7.0";
  cost DiceType.Electro, 1;
  talent ConsecratedScorpion, none {
    on enter {
      :createHandCard(BonecrunchersEnergyBlock);
    }
    on playCard {
      when :( :e.card.definition.id === BonecrunchersEnergyBlock );
      :drawCards(1);
      :createPileCards(BonecrunchersEnergyBlock, 1, "random");
    }
  }
}

/**
 * @id 124053
 * @name 噬骸能量块
 * @description
 * 本回合无法再打出噬骸能量块。
 */
const _1 = void 0; // moved to cards

/**
 * @id 124051
 * @name 噬骸能量块
 * @description
 * 随机舍弃1张当前元素骰费用最高的手牌，生成1个我方出战角色类型的元素骰。（每回合最多打出1张）
 */
const _2 = void 0; // moved to cards
