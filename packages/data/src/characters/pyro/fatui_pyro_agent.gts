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

import { card, character, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 123012
 * @name 潜行
 * @description
 * 所附属角色受到的伤害-1，造成的伤害+1。
 * 可用次数：3
 * 所附属角色造成的物理伤害变为火元素伤害。
 */
define status {
  id 123012 as Stealth01;
  conflictWith 123011;
  tags barrier;
  usage 3;
  on decreaseDamaged {
    :e.decreaseDamage(1);
    :consumeUsage();
  }
  on increaseSkillDamage {
    :e.increaseDamage(1);
    :consumeUsage();
  }
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
}

/**
 * @id 123011
 * @name 潜行
 * @description
 * 所附属角色受到的伤害-1，造成的伤害+1。
 * 可用次数：2
 */
define status {
  id 123011 as Stealth;
  conflictWith 123012;
  tags barrier;
  usage 2;
  on decreaseDamaged {
    :e.decreaseDamage(1);
    :consumeUsage();
  }
  on increaseSkillDamage {
    :e.increaseDamage(1);
    :consumeUsage();
  }
}

/**
 * @id 23011
 * @name 突刺
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 23011 as Thrust;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 23012
 * @name 伺机而动
 * @description
 * 造成1点火元素伤害，本角色附属潜行。
 */
define skill {
  id 23012 as Prowl;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 1);
  if (:self.hasEquipment(PaidInFull)) {
    :characterStatus(Stealth01);
  }
  else {
    :characterStatus(Stealth);
  }
}

/**
 * @id 23013
 * @name 焚毁之锋
 * @description
 * 造成5点火元素伤害。
 */
define skill {
  id 23013 as BladeAblaze;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 5);
}

/**
 * @id 23014
 * @name 潜行大师
 * @description
 * 【被动】战斗开始时，初始附属潜行。
 */
define skill {
  id 23014 as StealthMaster;
  skillType passive {
    on battleBegin {
      :characterStatus(Stealth);
    }
  }
}

/**
 * @id 2301
 * @name 愚人众·火之债务处理人
 * @description
 * 「死债不可免，活债更难逃…」
 */
define character {
  id 2301 as FatuiPyroAgent;
  since "v3.3.0";
  tags pyro, fatui;
  health 11;
  energy 2;
  skills Thrust, Prowl, BladeAblaze, StealthMaster;
}

/**
 * @id 223011
 * @name 悉数讨回
 * @description
 * 战斗行动：我方出战角色为愚人众·火之债务处理人时，装备此牌。
 * 愚人众·火之债务处理人装备此牌后，立刻使用一次伺机而动。
 * 装备有此牌的愚人众·火之债务处理人生成的潜行获得以下效果：
 * 初始可用次数+1，并且使所附属角色造成的物理伤害变为火元素伤害。
 * （牌组中包含愚人众·火之债务处理人，才能加入牌组）
 */
define card {
  id 223011 as PaidInFull;
  since "v3.3.0";
  cost DiceType.Pyro, 3;
  talent FatuiPyroAgent {
    on enter {
      :useSkill(Prowl);
    }
  }
}
