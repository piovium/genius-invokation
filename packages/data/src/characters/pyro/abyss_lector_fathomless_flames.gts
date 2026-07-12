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

import { card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 123021
 * @name 黯火炉心
 * @description
 * 结束阶段：造成1点火元素伤害，对所有敌方后台角色造成1点穿透伤害。
 * 可用次数：2
 */
define summon {
  id 123021 as DarkfireFurnace;
  hint DamageType.Pyro, "1";
  on endPhase {
    usage 2;
    :damage(DamageType.Piercing, 1, "opp standby");
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 123024
 * @name 渊火加护
 * @description
 * 为所附属角色提供2点护盾。
 * 此护盾耗尽后：对所有敌方角色造成1点穿透伤害。
 */
define status {
  id 123024 as AegisOfAbyssalFlame;
  shield 2;
  on selfDispose {
    :damage(DamageType.Piercing, 1, "all opp characters");
  }
}

/**
 * @id 123026
 * @name 火之新生·锐势
 * @description
 * 角色造成的火元素伤害+1。
 */
define status {
  id 123026 as FieryRebirthHoned;
  on increaseSkillDamage {
    when :( :e.type === DamageType.Pyro );
    :e.increaseDamage(1);
  }
}

/**
 * @id 123022
 * @name 火之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到4点生命值。此效果触发后，角色造成的火元素伤害+1。
 */
define status {
  id 123022 as FieryRebirthStatus;
  on beforeDefeated {
    :immune(4);
    const talent = :self.master.hasEquipment(EmbersRekindled);
    if (talent) {
      :dispose(talent);
      :characterStatus(AegisOfAbyssalFlame, "@master");
    }
    :self.master.setVariable("fieryRebirthTriggered", 1);
    :characterStatus(FieryRebirthHoned, "@master");
    :dispose();
  }
}

/**
 * @id 123025
 * @name 将熄的余烬
 * @description
 * 所附属角色无法使用技能。
 * 结束阶段：对所附属角色造成6点穿透伤害，然后移除此效果。
 */
define status {
  id 123025 as QuenchedEmbers;
  reserved;
}

/**
 * @id 123023
 * @name 涌火护罩
 * @description
 * 所附属角色免疫所有伤害。
 * 此状态提供2次火元素附着（可被元素反应消耗）：耗尽后移除此效果，并使所附属角色无法使用技能且在结束阶段受到6点穿透伤害。
 */
define status {
  id 123023 as ShieldOfSurgingFlame;
  reserved;
}

/**
 * @id 23021
 * @name 拯救之焰
 * @description
 * 造成1点火元素伤害。
 */
define skill {
  id 23021 as FlameOfSalvation;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Pyro, 1);
}

/**
 * @id 23022
 * @name 炽烈箴言
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 23022 as SearingPrecept;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 23023
 * @name 天陨预兆
 * @description
 * 造成3点火元素伤害，召唤黯火炉心。
 */
define skill {
  id 23023 as OminousStar;
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :summon(DarkfireFurnace);
}

/**
 * @id 23024
 * @name 火之新生
 * @description
 * 【被动】战斗开始时，初始附属火之新生。
 */
define skill {
  id 23024 as FieryRebirth;
  skillType passive {
    on battleBegin {
      :characterStatus(FieryRebirthStatus);
    }
  }
}

/**
 * @id 23028
 * @name 火之新生
 * @description
 * 
 */
define skill {
  id 23028 as FieryRebirthSkill;
  skillType passive {
    variable fieryRebirthTriggered, 0;
  }
}

/**
 * @id 2302
 * @name 深渊咏者·渊火
 * @description
 * 章典示现，劝听箴言。
 */
define character {
  id 2302 as AbyssLectorFathomlessFlames;
  since "v3.7.0";
  tags pyro, monster;
  health 6;
  energy 2;
  skills FlameOfSalvation, SearingPrecept, OminousStar, FieryRebirth, FieryRebirthSkill;
}

/**
 * @id 223021
 * @name 烬火重燃
 * @description
 * 入场时：如果装备有此牌的深渊咏者·渊火已触发过火之新生，就立刻弃置此牌，为角色附属渊火加护。
 * 装备有此牌的深渊咏者·渊火触发火之新生时：弃置此牌，为角色附属渊火加护。
 * （牌组中包含深渊咏者·渊火，才能加入牌组）
 */
define card {
  id 223021 as EmbersRekindled;
  since "v3.7.0";
  cost DiceType.Pyro, 2;
  talent AbyssLectorFathomlessFlames, none {
    on enter {
      when :( :self.master.getVariable("fieryRebirthTriggered") );
      :characterStatus(AegisOfAbyssalFlame, "@master");
      :dispose();
    }
  }
}
