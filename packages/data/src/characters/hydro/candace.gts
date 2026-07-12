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

import { card, character, combatStatus, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 12074
 * @name 苍鹭震击
 * @description
 * （需准备1个行动轮）
 * 造成3点水元素伤害。
 */
define skill {
  id 12074 as HeronStrike;
  skillType elemental;
  prepared;
  :$(`status with definition id ${HeronShield} at @self`)?.dispose();
  :damage(DamageType.Hydro, 3);
}

/**
 * @id 112071
 * @name 苍鹭护盾
 * @description
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
define status {
  id 112071 as HeronShield;
  shield 2;
}

/**
 * @id 112074
 * @name 苍鹭震击
 * @description
 * 本角色将在下次行动时，直接使用技能：苍鹭震击。
 */
define status {
  id 112074 as HeronStrikeStatus;
  prepare HeronStrike;
}

/**
 * @id 112073
 * @name 赤冕祝祷
 * @description
 * 我方角色普通攻击造成的伤害+1。
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为水元素伤害。
 * 我方切换角色后：造成1点水元素伤害。（每回合1次）
 * 我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * 持续回合：2
 */
define combatStatus {
  id 112073 as PrayerOfTheCrimsonCrown01;
  conflictWith 112072;
  duration 2;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on modifySkillDamageType {
    when :{
      if (:e.type !== DamageType.Physical) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.changeDamageType(DamageType.Hydro);
  }
  on switchActive {
    usage perRound, 1;
    :damage(DamageType.Hydro, 1);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage perRound, 1;
    :damage(DamageType.Hydro, 1);
  }
}

/**
 * @id 112072
 * @name 赤冕祝祷
 * @description
 * 我方角色普通攻击造成的伤害+1。
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为水元素伤害。
 * 我方切换角色后：造成1点水元素伤害。（每回合1次）
 * 持续回合：2
 */
define combatStatus {
  id 112072 as PrayerOfTheCrimsonCrown;
  conflictWith 112073;
  duration 2;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on modifySkillDamageType {
    when :{
      if (:e.type !== DamageType.Physical) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.changeDamageType(DamageType.Hydro);
  }
  on switchActive {
    usage perRound, 1;
    :damage(DamageType.Hydro, 1);
  }
}

/**
 * @id 12071
 * @name 流耀枪术·守势
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12071 as GleamingSpearGuardianStance;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12072
 * @name 圣仪·苍鹭庇卫
 * @description
 * 本角色附属苍鹭护盾并准备技能：苍鹭震击。
 */
define skill {
  id 12072 as SacredRiteHeronsSanctum;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :characterStatus(HeronShield);
  :characterStatus(HeronStrikeStatus);
}

/**
 * @id 12073
 * @name 圣仪·灰鸰衒潮
 * @description
 * 造成2点水元素伤害，生成赤冕祝祷。
 */
define skill {
  id 12073 as SacredRiteWagtailsTide;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  if (:self.hasEquipment(TheOverflow)) {
    :combatStatus(PrayerOfTheCrimsonCrown01);
  }
  else {
    :combatStatus(PrayerOfTheCrimsonCrown);
  }
}

/**
 * @id 1207
 * @name 坎蒂丝
 * @description
 * 赤沙浮金，恪誓戍御。
 */
define character {
  id 1207 as Candace;
  since "v3.8.0";
  tags hydro, pole, sumeru;
  health 11;
  energy 2;
  skills GleamingSpearGuardianStance, SacredRiteHeronsSanctum, SacredRiteWagtailsTide, HeronStrike;
}

/**
 * @id 212071
 * @name 衍溢的汐潮
 * @description
 * 战斗行动：我方出战角色为坎蒂丝时，装备此牌。
 * 坎蒂丝装备此牌后，立刻使用一次圣仪·灰鸰衒潮。
 * 装备有此牌的坎蒂丝生成的赤冕祝祷额外具有以下效果：我方角色普通攻击后：造成1点水元素伤害。（每回合1次）
 * （牌组中包含坎蒂丝，才能加入牌组）
 */
define card {
  id 212071 as TheOverflow;
  since "v3.8.0";
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  talent Candace {
    on enter {
      :useSkill(SacredRiteWagtailsTide);
    }
  }
}
