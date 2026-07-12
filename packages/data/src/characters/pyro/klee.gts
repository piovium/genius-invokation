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

import { character, skill, status, combatStatus, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113062
 * @name 爆裂火花
 * @description
 * 所附属角色进行重击时：少花费1个火元素，并且伤害+1。
 * 可用次数：2
 */
define status {
  id 113062 as ExplosiveSpark01;
  conflictWith 113061;
  on deductElementDiceSkill {
    when :( :e.isChargedAttack() && :e.canDeductCostOfType(DiceType.Pyro) );
    :e.deductCost(DiceType.Pyro, 1);
  }
  on increaseSkillDamage {
    when :( :e.viaChargedAttack() );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 113061
 * @name 爆裂火花
 * @description
 * 所附属角色进行重击时：少花费1个火元素，并且伤害+1。
 * 可用次数：1
 */
define status {
  id 113061 as ExplosiveSpark;
  conflictWith 113062;
  on deductElementDiceSkill {
    when :( :e.isChargedAttack() && :e.canDeductCostOfType(DiceType.Pyro) );
    :e.deductCost(DiceType.Pyro, 1);
  }
  on increaseSkillDamage {
    when :( :e.viaChargedAttack() );
    usage 1;
    :e.increaseDamage(1);
  }
}

/**
 * @id 113063
 * @name 轰轰火花
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成2点火元素伤害。
 * 可用次数：2
 */
define combatStatus {
  id 113063 as SparksNSplashStatus;
  on useSkill {
    usage 2;
    :damage(DamageType.Pyro, 2, "my active");
  }
}

/**
 * @id 13061
 * @name 砰砰
 * @description
 * 造成1点火元素伤害。
 */
define skill {
  id 13061 as Kaboom;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Pyro, 1);
}

/**
 * @id 13062
 * @name 蹦蹦炸弹
 * @description
 * 造成3点火元素伤害，本角色附属爆裂火花。
 */
define skill {
  id 13062 as JumpyDumpty;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  if (:self.hasEquipment(PoundingSurprise)) {
    :characterStatus(ExplosiveSpark01);
  }
  else {
    :characterStatus(ExplosiveSpark);
  }
}

/**
 * @id 13063
 * @name 轰轰火花
 * @description
 * 造成3点火元素伤害，在对方场上生成轰轰火花。
 */
define skill {
  id 13063 as SparksNSplash;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Pyro, 3);
  :combatStatus(SparksNSplashStatus, "opp");
}

/**
 * @id 1306
 * @name 可莉
 * @description
 * 每一次抽牌，都可能带来一次「爆炸性惊喜」。
 */
define character {
  id 1306 as Klee;
  since "v3.4.0";
  tags pyro, catalyst, mondstadt;
  health 10;
  energy 3;
  skills Kaboom, JumpyDumpty, SparksNSplash;
}

/**
 * @id 213061
 * @name 砰砰礼物
 * @description
 * 战斗行动：我方出战角色为可莉时，装备此牌。
 * 可莉装备此牌后，立刻使用一次蹦蹦炸弹。
 * 装备有此牌的可莉生成的爆裂火花的可用次数+1。
 * （牌组中包含可莉，才能加入牌组）
 */
define card {
  id 213061 as PoundingSurprise;
  since "v3.4.0";
  cost DiceType.Pyro, 3;
  talent Klee {
    on enter {
      :useSkill(JumpyDumpty);
    }
  }
}
