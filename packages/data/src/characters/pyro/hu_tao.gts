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
 * @id 113072
 * @name 血梅香
 * @description
 * 结束阶段：对所附属角色造成1点火元素伤害。
 * 可用次数：1
 */
define status {
  id 113072 as BloodBlossom;
  on endPhase {
    usage 1;
    :damage(DamageType.Pyro, 1, "@master");
  }
}

/**
 * @id 113071
 * @name 彼岸蝶舞
 * @description
 * 所附属角色造成的物理伤害变为火元素伤害，且角色造成的火元素伤害+1。
 * 所附属角色进行重击时：目标角色附属血梅香。
 * 持续回合：2
 */
define status {
  id 113071 as ParamitaPapilio;
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on increaseSkillDamage {
    when :( :e.type === DamageType.Pyro );
    :e.increaseDamage(1);
    if (:e.viaChargedAttack()) {
      :characterStatus(BloodBlossom, "@damage.target");
    }
  }
}

/**
 * @id 13071
 * @name 往生秘传枪法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13071 as SecretSpearOfWangsheng;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13072
 * @name 蝶引来生
 * @description
 * 本角色附属彼岸蝶舞。
 */
define skill {
  id 13072 as GuideToAfterlife;
  skillType elemental;
  cost DiceType.Pyro, 2;
  :characterStatus(ParamitaPapilio);
}

/**
 * @id 13073
 * @name 安神秘法
 * @description
 * 造成4点火元素伤害，治疗自身2点。如果本角色生命值不多于6，则造成的伤害和治疗各+1。
 */
define skill {
  id 13073 as SpiritSoother;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 3;
  if (:self.health <= 6) {
    :damage(DamageType.Pyro, 5);
    :heal(3, "@self");
  } else {
    :damage(DamageType.Pyro, 4);
    :heal(2, "@self");
  }
}

/**
 * @id 1307
 * @name 胡桃
 * @description
 * 「送走，全送走。」
 */
define character {
  id 1307 as HuTao;
  since "v3.7.0";
  tags pyro, pole, liyue;
  health 12;
  energy 3;
  skills SecretSpearOfWangsheng, GuideToAfterlife, SpiritSoother;
}

/**
 * @id 213071
 * @name 血之灶火
 * @description
 * 战斗行动：我方出战角色为胡桃时，装备此牌。
 * 胡桃装备此牌后，立刻使用一次蝶引来生。
 * 装备有此牌的胡桃在生命值不多于6时：造成的火元素伤害+1。
 * （牌组中包含胡桃，才能加入牌组）
 */
define card {
  id 213071 as SanguineRouge;
  since "v3.7.0";
  cost DiceType.Pyro, 2;
  talent HuTao {
    on enter {
      :useSkill(GuideToAfterlife);
    }
    on increaseSkillDamage {
      when :( :self.master.health <= 6 && :e.type === DamageType.Pyro );
      :e.increaseDamage(1);
    }
  }
}
