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

import { character, skill, status, combatStatus, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 116022
 * @name 大扫除
 * @description
 * 角色使用普通攻击时：少花费1个岩元素。（每回合1次）
 * 角色普通攻击造成的伤害+2，造成的物理伤害变为岩元素伤害。
 * 持续回合：2
 */
define status {
  id 116022 as SweepingTimeStatus;
  duration 2;
  on deductElementDiceSkill {
    when :( :e.isSkillType("normal") && :e.canDeductCostOfType(DiceType.Geo) );
    usage perRound, 1;
    :e.deductCost(DiceType.Geo, 1);
  }
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Geo);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(2);
  }
}

/**
 * @id 116021
 * @name 护体岩铠
 * @description
 * 为我方出战角色提供2点护盾。
 * 此护盾耗尽前，我方受到的物理伤害减半。（向上取整）
 */
define combatStatus {
  id 116021 as FullPlate;
  shield 2;
  on multiplyDamaged {
    when :( :e.type === DamageType.Physical );
    :e.divideDamage(2);
  }
}

/**
 * @id 16021
 * @name 西风剑术·女仆
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16021 as FavoniusBladeworkMaid;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16022
 * @name 护心铠
 * @description
 * 造成1点岩元素伤害，生成护体岩铠。
 */
define skill {
  id 16022 as Breastplate;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 1);
  :combatStatus(FullPlate);
}

/**
 * @id 16023
 * @name 大扫除
 * @description
 * 造成4点岩元素伤害，本角色附属大扫除。
 */
define skill {
  id 16023 as SweepingTime;
  skillType burst;
  cost DiceType.Geo, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 4);
  :characterStatus(SweepingTimeStatus);
}

/**
 * @id 1602
 * @name 诺艾尔
 * @description
 * 整理牌桌这种事，真的可以交给她。
 */
define character {
  id 1602 as Noelle;
  since "v3.3.0";
  tags geo, claymore, mondstadt;
  health 12;
  energy 2;
  skills FavoniusBladeworkMaid, Breastplate, SweepingTime;
}

/**
 * @id 216021
 * @name 支援就交给我吧
 * @description
 * 战斗行动：我方出战角色为诺艾尔时，装备此牌。
 * 诺艾尔装备此牌后，立刻使用一次护心铠。
 * 诺艾尔普通攻击后：如果此牌和护体岩铠仍在场，则治疗我方所有角色1点。（每回合1次）
 * （牌组中包含诺艾尔，才能加入牌组）
 */
define card {
  id 216021 as IGotYourBack;
  since "v3.3.0";
  cost DiceType.Geo, 3;
  talent Noelle {
    on enter {
      :useSkill(Breastplate);
    }
    on useSkill {
      when :( :e.isSkillType("normal") && :$(`my combat status with definition id ${FullPlate}`) );
      usage perRound, 1;
      :heal(1, "all my characters");
    }
  }
}
