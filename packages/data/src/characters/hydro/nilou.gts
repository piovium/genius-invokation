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

import { character, skill, summon, status, combatStatus, card, DamageType, DiceType, Reaction } from "@gi-tcg/core/builder";

/**
 * @id 112082
 * @name 丰穰之核
 * @description
 * 结束阶段：造成2点草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 * 我方宣布结束时：如果此牌的可用次数至少为2，则造成2点草元素伤害。（需消耗可用次数）
 */
define summon {
  id 112082 as BountifulCore;
  hint DamageType.Dendro, "2";
  on endPhase {
    usage 1 {
      append 3;
    };
    if (:$(`my equipment with definition id ${TheStarrySkiesTheirFlowersRain}`)) {
      :damage(DamageType.Dendro, 3);
    }
    else {
      :damage(DamageType.Dendro, 2);
    }
  }
  on declareEnd {
    when :( :getVariable("usage") >= 2 );
    if (:$(`my equipment with definition id ${TheStarrySkiesTheirFlowersRain}`)) {
      :damage(DamageType.Dendro, 3);
    }
    else {
      :damage(DamageType.Dendro, 2);
    }
    :consumeUsage();
  }
}

/**
 * @id 112083
 * @name 永世流沔
 * @description
 * 结束阶段：对所附属角色造成2点水元素伤害。
 * 可用次数：1
 */
define status {
  id 112083 as LingeringAeon;
  on endPhase {
    usage 1;
    :damage(DamageType.Hydro, 2, "@master");
  }
}

/**
 * @id 112081
 * @name 金杯的丰馈
 * @description
 * 敌方角色受到绽放反应时：我方不再生成草原核，而是改为召唤丰穰之核。
 */
define combatStatus {
  id 112081 as GoldenChalicesBounty;
  on modifyReaction {
    when :( :e.type === Reaction.Bloom && !:e.character.isMine() );
    listenTo all;
    :e.cancelEffects();
    :summon(BountifulCore);
  }
}

/**
 * @id 12081
 * @name 弦月舞步
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12081 as DanceOfSamser;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12082
 * @name 七域舞步
 * @description
 * 造成3点水元素伤害，如果队伍中包含水元素角色和草元素角色且不包含其他元素的角色，就生成金杯的丰馈。
 */
define skill {
  id 12082 as DanceOfHaftkarsvar;
  skillType elemental;
  cost DiceType.Hydro, 3;
  const elements = new Set(:$$(`all my characters include defeated`).map((ch) => ch.element()));
  if (elements.size === 2 && elements.has(DiceType.Hydro) && elements.has(DiceType.Dendro)) {
    :combatStatus(GoldenChalicesBounty);
  }
  :damage(DamageType.Hydro, 3); // 先给 buff 后出伤，此时产出的草原核也是丰穰之核
}

/**
 * @id 12083
 * @name 浮莲舞步·远梦聆泉
 * @description
 * 造成2点水元素伤害，目标及下一个角色附属永世流沔。
 */
define skill {
  id 12083 as DanceOfAbzendegiDistantDreamsListeningSpring;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :characterStatus(LingeringAeon, "opp active or opp next");
}

/**
 * @id 1208
 * @name 妮露
 * @description
 * 莲步轻舞，出尘醉梦。
 */
define character {
  id 1208 as Nilou;
  since "v4.2.0";
  tags hydro, sword, sumeru;
  health 10;
  energy 2;
  skills DanceOfSamser, DanceOfHaftkarsvar, DanceOfAbzendegiDistantDreamsListeningSpring;
}

/**
 * @id 212081
 * @name 星天的花雨
 * @description
 * 战斗行动：我方出战角色为妮露时，装备此牌。
 * 妮露装备此牌后，立刻使用一次七域舞步。
 * 装备有此牌的妮露在场时：我方丰穰之核造成的伤害+1。
 * （牌组中包含妮露，才能加入牌组）
 */
define card {
  id 212081 as TheStarrySkiesTheirFlowersRain;
  since "v4.2.0";
  cost DiceType.Hydro, 3;
  talent Nilou {
    on enter {
      :useSkill(DanceOfHaftkarsvar);
    }
  }
}
