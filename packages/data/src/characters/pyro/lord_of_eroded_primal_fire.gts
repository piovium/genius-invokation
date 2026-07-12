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

import { card, character, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 123051
 * @name 忿恨
 * @description
 * 每层使所附属角色造成的伤害和「元素爆发」造成的穿透伤害+1。（可叠加，没有上限）
 */
define status {
  id 123051 as Resentment;
  since "v6.0.0";
  variable layer, 1 {
    append;
  };
  on increaseDamage {
    :e.increaseDamage(:getVariable("layer"));
  }
}

/**
 * @id 123052
 * @name 弃置卡牌数
 * @description
 * 我方每舍弃6张卡牌，自身附属1层忿恨。
 * 【此卡含描述变量】
 */
define status {
  id 123052 as CardsDiscarded;
  since "v6.0.0";
  variable cardCount, 0;
  replaceDescription "[GCG_TOKEN_COUNTER]", ((c, self) => self.variables.cardCount);
  on disposeCard {
    :addVariable("cardCount", 1);
    if (:getVariable("cardCount") % 6 === 0){
      :characterStatus(Resentment, "@master");
    }
  }
}

/**
 * @id 23051
 * @name 虚界玄爪
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 23051 as VoidClawStrike;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 23052
 * @name 蚀灭火羽
 * @description
 * 造成3点火元素伤害，我方舍弃牌组顶部1张牌。
 */
define skill {
  id 23052 as ErodedFlamingFeathers;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  :abortPreview();
  if (:player.pile.length > 0) {
    :disposeCard(:player.pile[0]);
  }
}

/**
 * @id 23053
 * @name 斫劫源焰
 * @description
 * 造成1点火元素伤害，对所有敌方后台角色造成1点穿透伤害。双方舍弃牌组顶部3张牌，自身附属1层忿恨.
 */
define skill {
  id 23053 as SeveringPrimalFire;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  const layer = :self.hasStatus(Resentment)?.getVariable("layer") ?? 0;
  :damage(DamageType.Piercing, layer + 1, "opp standby");
  :damage(DamageType.Pyro, 1);
  :abortPreview();
  for (const player of [:player, :oppPlayer]) {
    for (const card of player.pile.slice(0, 3)) {
      :disposeCard(card);
    }
  }
  :characterStatus(Resentment, "@self");
}

/**
 * @id 23054
 * @name 忿恨
 * @description
 * 【被动】我方每舍弃6张卡牌，自身附属1层忿恨。
 */
define skill {
  id 23054 as ResentmentPassive;
  skillType passive {
    on battleBegin {
      :characterStatus(CardsDiscarded);
    }
    on revive {
      :characterStatus(CardsDiscarded);
    }
  }
}

/**
 * @id 23056
 * @name 忿恨
 * @description
 * 【被动】我方每舍弃6张卡牌，自身附属1层忿恨。
 */
define skill {
  id 23056 as Resentment02;
  skillType passive {
    reserved;
  }
}

/**
 * @id 2305
 * @name 蚀灭的源焰之主
 * @description
 * 被称为深渊浮灭主亦被称为「古斯托特」的虚界魔物，拥有侵蚀地脉之中的回忆并将之凝聚为实体的如同灾厄的权能。
 */
define character {
  id 2305 as LordOfErodedPrimalFire;
  since "v6.0.0";
  tags pyro, monster;
  health 11;
  energy 2;
  skills VoidClawStrike, ErodedFlamingFeathers, SeveringPrimalFire, ResentmentPassive;
}

/**
 * @id 223052
 * @name 罔极盛怒（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
define status {
  id 223052 as UndyingFuryInEffect;
  once increaseDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 223051
 * @name 罔极盛怒
 * @description
 * 快速行动：装备给我方的蚀灭的源焰之主。
 * 敌方打出名称不存在于本局最初牌组的牌时：所附属角色获得1点充能，下次造成的伤害+1。（每回合1次）
 * （牌组中包含蚀灭的源焰之主，才能加入牌组）
 */
define card {
  id 223051 as UndyingFury;
  since "v6.0.0";
  cost DiceType.Pyro, 1;
  talent LordOfErodedPrimalFire, none {
    on playCard {
      when :{
        if (:e.who === :self.who) {
          return false;
        }
        return !:isInInitialPile(:e.card, "opp");
      };
      listenTo all;
      usage perRound, 1;
      :gainEnergy(1, "@master");
      :characterStatus(UndyingFuryInEffect, "@master");
    }
  }
}
