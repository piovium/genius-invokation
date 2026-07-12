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

import { card, character, combatStatus, DamageType, DiceType, skill, type EquipmentHandle } from "@gi-tcg/core/builder";

/**
 * @id 113032
 * @name 鼓舞领域
 * @description
 * 我方角色使用技能时：此技能伤害+2；技能结算后，如果该角色生命值不多于6，则治疗该角色2点。
 * 持续回合：2
 */
define combatStatus {
  id 113032 as InspirationField01;
  conflictWith 113031;
  duration 2;
  on increaseSkillDamage {
    :e.increaseDamage(2);
  }
  on useSkill {
    when :( :e.skillCaller.variables.health <= 6 );
    :heal(2, "@event.skillCaller");
  }
}

/**
 * @id 113031
 * @name 鼓舞领域
 * @description
 * 我方角色使用技能时：如果该角色生命值至少为7，则使此伤害额外+2；技能结算后，如果该角色生命值不多于6，则治疗该角色2点。
 * 持续回合：2
 */
define combatStatus {
  id 113031 as InspirationField;
  conflictWith 113032;
  duration 2;
  on increaseSkillDamage {
    when :( :e.source.cast<"character">().health >= 7 );
    :e.increaseDamage(2);
  }
  on useSkill {
    when :( :e.skillCaller.variables.health <= 6 );
    :heal(2, "@event.skillCaller");
  }
}

/**
 * @id 13031
 * @name 好运剑
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13031 as StrikeOfFortune;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13032
 * @name 热情过载
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 13032 as PassionOverload;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 13033
 * @name 美妙旅程
 * @description
 * 造成2点火元素伤害，生成鼓舞领域。
 */
define skill {
  id 13033 as FantasticVoyage;
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 2);
  if (:self.hasEquipment(GrandExpectation)) {
    :combatStatus(InspirationField01);
  }
  else {
    :combatStatus(InspirationField);
  }
}

/**
 * @id 1303
 * @name 班尼特
 * @description
 * 当你知道自己一定会输时，那你肯定也知道如何能赢。
 */
define character {
  id 1303 as Bennett;
  since "v3.3.0";
  tags pyro, sword, mondstadt;
  health 10;
  energy 2;
  skills StrikeOfFortune, PassionOverload, FantasticVoyage;
}

/**
 * @id 213031
 * @name 冒险憧憬
 * @description
 * 战斗行动：我方出战角色为班尼特时，装备此牌。
 * 班尼特装备此牌后，立刻使用一次美妙旅程。
 * 装备有此牌的班尼特生成的鼓舞领域，其伤害提升效果改为总是生效，不再具有生命值限制。
 * （牌组中包含班尼特，才能加入牌组）
 */
define card {
  id 213031 as GrandExpectation;
  since "v3.3.0";
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  talent Bennett {
    on enter {
      :useSkill(FantasticVoyage);
    }
  }
}
