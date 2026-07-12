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

import { $, card, character, combatStatus, DamageType, DiceType, skill, status, type StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 112042
 * @name 近战状态
 * @description
 * 角色造成的物理伤害转换为水元素伤害。
 * 角色进行重击后：目标角色附属断流。
 * 角色对附属有断流的角色造成的伤害+1；
 * 角色对已附属有断流的角色使用技能后：对下一个敌方后台角色造成1点穿透伤害。（每回合至多2次）
 * 持续回合：2
 */
define status {
  id 112042 as MeleeStance;
  duration 2;
  conflictWith 112041;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.target.hasStatus(Riptide) );
    :e.increaseDamage(1);
  }
  // 此处使用 increaseSkillDamage; 因为官方实现中，此穿透伤害是与增伤同时发生的，而非“使用技能后”
  on increaseSkillDamage {
    when :( :e.target.hasStatus(Riptide) );
    usage perRound, 2;
    :damage(DamageType.Piercing, 1, "opp next");
  }
}

/**
 * @id 112041
 * @name 远程状态
 * @description
 * 所附属角色进行重击后：目标角色附属断流。
 */
define status {
  id 112041 as RangedStance;
  conflictWith 112042;
}

/**
 * @id 112043
 * @name 断流
 * @description
 * 所附属角色被击倒后：对所在阵营的出战角色附属「断流」。
 * （处于「近战状态」的达达利亚攻击所附属角色时，会造成额外伤害。）
 */
define status {
  id 112043 as Riptide;
  // 当带有断流的角色被击倒时（也即断流弃置时）：
  // - 若出战角色被击倒（稍后玩家需选择出战）： 则在下次切换角色后，为新的出战角色附属断流。
  // - 否则直接为当前出战角色附属断流。
  on selfDispose {
    const active = :query($.my.active.includesDefeated);
    if (active?.variables.alive) {
      active.addStatus(Riptide);
    } else {
      :combatStatus(Riptide2);
    }
  }
}

define combatStatus {
  id 112044 as private Riptide2;
  once switchActive {
    :characterStatus(Riptide, "my active");
  }
}

/**
 * @id 12041
 * @name 断雨
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12041 as CuttingTorrent;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
  if (:skillInfo.charged) {
    :characterStatus(Riptide, "opp active");
  }
}

/**
 * @id 12042
 * @name 魔王武装·狂澜
 * @description
 * 切换为近战状态，然后造成2点水元素伤害，并使目标角色附属断流。
 */
define skill {
  id 12042 as FoulLegacyRagingTide;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :characterStatus(MeleeStance);
  :damage(DamageType.Hydro, 2);
  :characterStatus(Riptide, "opp active");
}

/**
 * @id 12043
 * @name 极恶技·尽灭闪
 * @description
 * 依据达达利亚当前所处的状态，进行不同的攻击：
 * 远程状态·魔弹一闪：造成5点水元素伤害，返还2点充能，目标角色附属断流。
 * 近战状态·尽灭水光：造成7点水元素伤害。
 */
define skill {
  id 12043 as HavocObliteration;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  if (:self.hasStatus(RangedStance)) {
    :damage(DamageType.Hydro, 5);
    :self.gainEnergy(2);
    :characterStatus(Riptide, "opp active");
  } else {
    :damage(DamageType.Hydro, 7);
  }
}

/**
 * @id 12044
 * @name 遏浪
 * @description
 * 【被动】战斗开始时，初始附属远程状态。
 * 角色所附属的近战状态效果结束时，重新附属远程状态。
 */
define skill {
  id 12044 as TideWithholder;
  skillType passive {
    on battleBegin {
      :characterStatus(RangedStance);
    }
    on revive {
      :characterStatus(RangedStance);
    }
    on dispose {
      when :( :e.entity.definition.id === MeleeStance );
      :characterStatus(RangedStance);
    }
  }
}

/**
 * @id 12045
 * @name 远程状态
 * @description
 *
 */
define skill {
  id 12045 as private RangedStanceSkill;
  skillType passive {
    reserved;
  }
}


/**
 * @id 12046
 * @name 遏浪
 * @description
 *
 */
define skill {
  id 12046 as private UnknownSkill;
  skillType passive;
  reserved;
}

/**
 * @id 1204
 * @name 达达利亚
 * @description
 * 牌局亦为战场，能者方可争先。
 */
define character {
  id 1204 as Tartaglia;
  since "v3.7.0";
  tags hydro, bow, fatui;
  health 10;
  energy 3;
  skills CuttingTorrent, FoulLegacyRagingTide, HavocObliteration, TideWithholder;
}

/**
 * @id 212041
 * @name 深渊之灾·凝水盛放
 * @description
 * 战斗行动：我方出战角色为达达利亚时，装备此牌。
 * 达达利亚装备此牌后，立刻使用一次魔王武装·狂澜。
 * 结束阶段：装备有此牌的达达利亚在场时，如果敌方出战角色附属有断流，则对其造成1点穿透伤害。
 * （牌组中包含达达利亚，才能加入牌组）
 */
define card {
  id 212041 as AbyssalMayhemHydrospout;
  since "v3.7.0";
  cost DiceType.Hydro, 3;
  talent Tartaglia {
    on enter {
      :useSkill(FoulLegacyRagingTide);
    }
    on endPhase {
      when :( :$(`opp active has status with definition id ${Riptide}`) );
      :damage(DamageType.Piercing, 1, "opp active");
    }
  }
}
