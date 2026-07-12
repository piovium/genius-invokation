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

import { card, character, combatStatus, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111073
 * @name 箓灵
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 * 此召唤物在场时：敌方角色受到的冰元素伤害和物理伤害+1。
 */
define summon {
  id 111073 as TalismanSpirit;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  }
  on increaseDamaged {
    when :( !:e.target.isMine() && ([DamageType.Cryo, DamageType.Physical] as DamageType[]).includes(:e.type) );
    listenTo all;
    :e.increaseDamage(1);
  }
}

/**
 * @id 111072
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：2
 * 我方角色通过「普通攻击」触发此效果时，不消耗可用次数。（每回合1次）
 */
define combatStatus {
  id 111072 as IcyQuill01;
  conflictWith 111071;
  variable noUsageEffect, 1 {
    visible false; // 每回合一次不消耗可用次数
  };
  on roundEnd {
    :setVariable("noUsageEffect", 1);
  }
  on increaseDamage {
    when :( :e.via.caller.definition.type === "character" && :e.type === DamageType.Cryo );
    usage 2 {
      autoDecrease false;
    };
    :e.increaseDamage(1);
    if (:e.viaSkillType("normal") && :getVariable("noUsageEffect")) {
      :setVariable("noUsageEffect", 0);
    } else {
      :consumeUsage()
    }
  }
}

/**
 * @id 111071
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：2
 */
define combatStatus {
  id 111071 as IcyQuill;
  conflictWith 111072;
  on increaseDamage {
    when :( :e.via.caller.definition.type === "character" && :e.type === DamageType.Cryo );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 11071
 * @name 踏辰摄斗
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11071 as DawnstarPiercer;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11072
 * @name 仰灵威召将役咒
 * @description
 * 造成2点冰元素伤害，生成冰翎。
 */
define skill {
  id 11072 as SpringSpiritSummoning;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 2);
  if (:self.hasEquipment(MysticalAbandon)) {
    :combatStatus(IcyQuill01);
  }
  else {
    :combatStatus(IcyQuill);
  }
}

/**
 * @id 11073
 * @name 神女遣灵真诀
 * @description
 * 造成1点冰元素伤害，召唤箓灵。
 */
define skill {
  id 11073 as DivineMaidensDeliverance;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 1);
  :summon(TalismanSpirit);
}

/**
 * @id 1107
 * @name 申鹤
 * @description
 * 红尘渺渺，因果烟消。
 */
define character {
  id 1107 as Shenhe;
  since "v3.7.0";
  tags cryo, pole, liyue;
  health 10;
  energy 2;
  skills DawnstarPiercer, SpringSpiritSummoning, DivineMaidensDeliverance;
}

/**
 * @id 211071
 * @name 忘玄
 * @description
 * 战斗行动：我方出战角色为申鹤时，装备此牌。
 * 申鹤装备此牌后，立刻使用一次仰灵威召将役咒。
 * 装备有此牌的申鹤生成的冰翎被我方角色的「普通攻击」触发时：不消耗可用次数。（每回合1次）
 * （牌组中包含申鹤，才能加入牌组）
 */
define card {
  id 211071 as MysticalAbandon;
  since "v3.7.0";
  cost DiceType.Cryo, 3;
  talent Shenhe {
    on enter {
      :useSkill(SpringSpiritSummoning);
    }
  }
}
