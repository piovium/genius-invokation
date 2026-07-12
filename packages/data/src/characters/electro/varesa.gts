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

import { card, character, DamageType, DiceType, skill, status, type EquipmentHandle } from "@gi-tcg/core/builder";

/**
 * @id 114151
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 夜魂值为0时，退出夜魂加持。
 */
define status {
  id 114151 as NightsoulsBlessing;
  since "v6.1.0";
  nightsoulsBlessing 2 {
    autoDispose;
  };
}

/**
 * @id 14155
 * @name 闪烈降临·大火山崩落
 * @description
 * 造成3点雷元素伤害，此技能视为下落攻击。
 */
export const GuardianVentVolcanoKablam = skill(14155)
  .type("burst")
  .prepared()
  .forcePlunging()
  .damage(DamageType.Electro, 3)
  .done();


/**
 * @id 114153
 * @name 闪烈降临·大火山崩落
 * @description
 * 本角色将在下次行动时，直接使用技能：闪烈降临·大火山崩落。
 */
define status {
  id 114153 as GuardianVentVolcanoKablamStatus;
  since "v6.1.0";
  prepare GuardianVentVolcanoKablam;
}

/**
 * @id 114152
 * @name 极限驱动
 * @description
 * 瓦雷莎切换为「出战角色」后：准备技能：闪烈降临·大火山崩落。
 * 可用次数：1
 */
define status {
  id 114152 as ApexDrive;
  since "v6.1.0";
  on switchActive {
    when :( :e.switchInfo.to.id === :self.master.id );
    usage 1;
    :characterStatus(GuardianVentVolcanoKablamStatus, "@master");
  }
}

/**
 * @id 114154
 * @name 突驰烈进
 * @description
 * 我方下次行动前，将所附属角色切换为出战角色。
 */
define status {
  id 114154 as SuddenOnrush;
  since "v6.1.0";
  once beforeAction {
    :switchActive("@master");
  }
}

/**
 * @id 14151
 * @name 角力搏摔
 * @description
 * 造成1点雷元素伤害。此次技能为下落攻击时：造成的伤害+1，自身进入夜魂加持，并获得1点「夜魂值」。
 */
define skill {
  id 14151 as ByTheHorns;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  if (:skillInfo.plunging) {
    :damage(DamageType.Electro, 2);
    :gainNightsoul("@self", 1);
  } else {
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 14152
 * @name 夜虹逐跃
 * @description
 * 造成2点雷元素伤害，自身附属突驰烈进，进入夜魂加持，并获得1点「夜魂值」，然后我方切换到下一个角色。
 */
define skill {
  id 14152 as RidingTheNightrainbow;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 2);
  :characterStatus(SuddenOnrush);
  :gainNightsoul("@self", 1);
}

/**
 * @id 14153
 * @name 闪烈降临！
 * @description
 * 造成3点雷元素伤害，自身附属极限驱动。
 */
define skill {
  id 14153 as GuardianVent;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Electro, 3);
  :characterStatus(ApexDrive);
}

/**
 * @id 14154
 * @name 连势，三重腾跃！
 * @description
 * 【被动】瓦雷莎使用技能后：如果自身「夜魂值」等于2，则消耗2点「夜魂值」，自身附属极限驱动。
 */
define skill {
  id 14154 as TagteamTripleJump;
  skillType passive {
    on useSkill {
      when :( :self.hasNightsoulsBlessing()?.variables.nightsoul === 2 );
      :consumeNightsoul("@self", 2);
      :characterStatus(ApexDrive);
      if (:self.hasEquipment(AHeroOfJusticesTriumph)) {
        :gainEnergy(1, "@self");
      }
    }
  }
}

/**
 * @id 14156
 * @name 夜虹逐跃
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，自身附属突驰烈进，进入夜魂加持，并获得1点「夜魂值」，然后我方切换到下一个角色。
 */
define skill {
  id 14156 as RidingTheNightrainbowPassive;
  skillType passive {
    on useSkill {
      when :( :e.skill.definition.id === RidingTheNightrainbow );
      :switchActive("my next");
    }
  }
}

/**
 * @id 1415
 * @name 瓦雷莎
 * @description
 * 谨守恬安，豪勇锐进。
 */
define character {
  id 1415 as Varesa;
  since "v6.1.0";
  tags electro, catalyst, natlan;
  health 10;
  energy 3;
  skills ByTheHorns, RidingTheNightrainbow, GuardianVent, TagteamTripleJump, GuardianVentVolcanoKablam, RidingTheNightrainbowPassive;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 214151
 * @name 正义英雄的凯旋
 * @description
 * 快速行动：装备给我方的瓦雷莎。
 * 瓦雷莎触发连势，三重腾跃！后：获得1点充能。
 * 装备有此牌的瓦雷莎的「元素爆发」造成的伤害+1。
 * （牌组中包含瓦雷莎，才能加入牌组）
 */
define card {
  id 214151 as AHeroOfJusticesTriumph;
  since "v6.1.0";
  cost DiceType.Electro, 1;
  talent Varesa, none {
    on increaseSkillDamage {
      when :( :e.viaSkillType("burst") );
      :e.increaseDamage(1);
    }
  }
}
