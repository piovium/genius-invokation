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

import { character, skill, status, card, DamageType, type SkillHandle, DiceType, Reaction, originalDiceCostOfCard, $ } from "@gi-tcg/core/builder";

/**
 * @id 111162
 * @name 七相一闪
 * @description
 * 所附属角色使用普通攻击时：造成的物理伤害变为冰元素伤害。若可能，消耗至多2点蛇之狡谋，每消耗1点，则少花费1个无色元素。
 * 自身元素爆发切换为极恶技·尽。
 * 持续回合：1
 */
define status {
  id 111162 as SevenphaseFlash;
  since "v6.3.0";
  duration 1;
  on deductVoidDiceSkill {
    when :( :e.isSkillType("normal") && :self.master.getVariable("serpentsSubtlety") );
    const costSubtelty = Math.min(2, :self.master.getVariable("serpentsSubtlety"));
    :self.master.addVariable("serpentsSubtlety", -costSubtelty);
    :e.deductVoidCost(costSubtelty);
  }
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") );
    :e.changeDamageType(DamageType.Cryo);
  }
  on enter {
    :transformDefinition(:self.master, Skirk01);
  }
  on selfDispose {
    const ch = :$(`my character with definition id ${Skirk01}`);
    if (ch) {
      :transformDefinition(ch, Skirk);
    }
  }
}

/**
 * @id 111164
 * @name 死河渡断
 * @description
 * 所附属角色下次造成的伤害+1。
 */
define status {
  id 111164 as DeathsCrossing;
  since "v6.3.0";
  once increaseSkillDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 111161
 * @name 诸武相授
 * @description
 * 我方丝柯克附属七相一闪。
 * 回合开始或我方执行切换后：舍弃此牌，获得1点蛇之狡谋。
 */
export const MutualWeaponsMentorship = card(111161)
  .undiscoverable() 
  .addTarget(`my character with definition id 1116`)
  .characterStatus(SevenphaseFlash, "@targets.0")
  .onArbitraryEvent("actionPhase", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .onArbitraryEvent("switchActive", {
    operation: (c) => {
      c.disposeCard(c.self);
      c.$(`my character with definition id ${Skirk} or my character with definition id ${Skirk01}`)
        ?.addVariableWithMax("serpentsSubtlety", 1, 7);
    }
  })
  .done();

/**
 * @id 111163
 * @name 虚境裂隙
 * @description
 * 战斗行动：我方手牌中存在当前元素骰费用为3的手牌时，舍弃1张当前元素骰费用为3的手牌，我方丝柯克获得2点蛇之狡谋。
 */
define card {
  id 111163 as VoidRift;
  undiscoverable;
  tags action;
  filter :( :query($.my.hand.cost(3)) );
  const hand = :query($.my.hand.cost(3));
  if (hand) {
    :disposeCard(hand);
    const skirk = :query($.union($.my.character.def(Skirk), $.my.character.def(Skirk01)));
    skirk?.addVariableWithMax("serpentsSubtlety", 2, 7);
  }
}

/**
 * @id 11161
 * @name 极恶技·断
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11161 as HavocSunder;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11162
 * @name 极恶技·闪
 * @description
 * 获得2点蛇之狡谋，生成手牌诸武相授。（每回合1次）
 */
define skill {
  id 11162 as HavocWarp;
  skillType elemental;
  cost DiceType.Cryo, 2;
  filter :( :self.definition.id === Skirk && :self.getVariable("canE") );
  :self.addVariableWithMax("serpentsSubtlety", 2, 7);
  :createHandCard(MutualWeaponsMentorship);
  :self.setVariable("canE", 0);
}

/**
 * @id 11165
 * @name 极恶技·尽
 * @description
 * 将2个非万能元素骰转化为冰元素骰，舍弃至多2张当前元素骰费用为0骰的卡牌，每舍弃1张，丝柯克获得1点蛇之狡谋。
 */
define skill {
  id 11165 as HavocExtinction;
  skillType burst;
  cost DiceType.Cryo, 1;
  void 0;
  // 假定（大抵确实如此）先转换基础骰子再转换万能骰子
  const nonOmniCount =  :player.dice.filter((d) => d !== DiceType.Omni).length;
  const convertCount = Math.min(2, nonOmniCount);
  :convertDice(DiceType.Cryo, convertCount);
  const hands = :player.hands.filter((card) => card.diceCost() === 0).slice(0, 2);
  if (hands.length > 0) {
    :disposeCard(...hands);
    :self.addVariableWithMax("serpentsSubtlety", hands.length, 7);
  }
}

/**
 * @id 11163
 * @name 极恶技·灭
 * @description
 * 消耗所有蛇之狡谋，造成等同于消耗蛇之狡谋数量的冰元素伤害，对后台角色造成2点穿透伤害，如果消耗了7点蛇之狡谋，则改为对后台角色造成3点穿透伤害。
 */
define skill {
  id 11163 as HavocRuin;
  skillType burst;
  cost DiceType.Cryo, 3;
  filter :( :self.getVariable("serpentsSubtlety") >= 2 );
  const subtilty = :self.getVariable("serpentsSubtlety");
  :self.setVariable("serpentsSubtlety", 0);
  if (subtilty >= 7) {
    :damage(DamageType.Piercing, 3, "opp standby");
  } else {
    :damage(DamageType.Piercing, 2, "opp standby");
  }
  :damage(DamageType.Cryo, subtilty);
}

/**
 * @id 11164
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
define skill {
  id 11164 as ReasonBeyondReason;
  skillType passive {
    variable serpentsSubtlety, 0;
    variable canE, 1;
    on dealReaction {
      when :( ([Reaction.Frozen, Reaction.SwirlCryo, Reaction.Superconduct, Reaction.CrystallizeCryo] as Reaction[]).includes(:e.type) );
      listenTo samePlayer;
      usage perRound, 3 {
        name "usagePerRound1";
      };
      :createHandCard(VoidRift);
    }
    on roundEnd {
      :setVariable("canE", 1);
    }
  }
}

/**
 * @id 11167
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
define skill {
  id 11167 as ReasonBeyondReason01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 1116
 * @name 丝柯克
 * @description
 * 星海默然，覆灭无声。
 */
define character {
  id 1116 as Skirk;
  since "v6.3.0";
  tags cryo, sword, calamity;
  health 10;
  energy 0;
  specialEnergy "serpentsSubtlety", 7;
  skills HavocSunder, HavocWarp, HavocRuin, ReasonBeyondReason;
}

/**
 * @id 6605
 * @name 丝柯克
 * @description
 * 
 */
define character {
  id 6605 as Skirk01;
  since "v6.3.0";
  tags cryo, sword, calamity;
  health 10;
  energy 0;
  specialEnergy "serpentsSubtlety", 7;
  skills HavocSunder, HavocWarp, HavocExtinction, ReasonBeyondReason;
}

/**
 * @id 211161
 * @name 湮远
 * @description
 * 快速行动：装备给我方的丝柯克。
 * 装备有此牌的丝柯克在场，我方打出或舍弃虚境裂隙时：对敌方出战角色造成1点冰元素伤害。（每回合1次）
 * （牌组中包含丝柯克，才能加入牌组）
 */
define card {
  id 211161 as FarToFall;
  since "v6.3.0";
  cost DiceType.Cryo, 1;
  talent [Skirk, Skirk01], none {
    variable usagePerRound, 1;
    on playCard {
      when :( :getVariable("usagePerRound") && :e.card.definition.id === VoidRift );
      :damage(DamageType.Cryo, 1, "opp active");
      :setVariable("usagePerRound", 0);
    }
    on disposeCard {
      when :( :getVariable("usagePerRound") && :e.entity.definition.id === VoidRift );
      :damage(DamageType.Cryo, 1, "opp active");
      :setVariable("usagePerRound", 0);
    }
    on roundEnd {
      :setVariable("usagePerRound", 1);
    }
  }
}

/**
 * @id 11166
 * @name 理外之理
 * @description
 * 【被动】丝柯克无法获得充能，改为可以积累蛇之狡谋，最多7点。
 * 我方触发冻结/冰扩散/超导/冰结晶反应后：生成手牌 虚境裂隙。（每回合3次）
 */
define skill {
  id 11166 as ReasonBeyondReason02;
  skillType passive {
    reserved;
  }
}
