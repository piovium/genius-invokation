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

import { character, skill, summon, combatStatus, card, DamageType, extension, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 111011
 * @name 冰灵珠
 * @description
 * 结束阶段：造成1点冰元素伤害，对所有敌方后台角色造成1点穿透伤害。
 * 可用次数：2
 */
define summon {
  id 111011 as SacredCryoPearl;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
    :damage(DamageType.Piercing, 1, "opp standby");
  }
}

/**
 * @id 111012
 * @name 冰莲
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：2
 */
define combatStatus {
  id 111012 as IceLotus;
  tags barrier;
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 2;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 11011
 * @name 流天射术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11011 as LiutianArchery;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11012
 * @name 山泽麟迹
 * @description
 * 造成1点冰元素伤害，生成冰莲。
 */
define skill {
  id 11012 as TrailOfTheQilin;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :combatStatus(IceLotus);
}

define extension {
  idHint 11013 as private FrostflakeArrowUsedExtension;
  schema ({ used: "pair<boolean>" });
  initialState ({ used: [false, false] });
  mutateWhen onDamageOrHeal, ((st, e) => {
    // 甘雨倒下时重置
    if (e.target.definition.id === Ganyu && e.damageInfo.causeDefeated) {
      st.used[e.targetWho] = false;
    }
  });
}

/**
 * @id 11013
 * @name 霜华矢
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
define skill {
  id 11013 as FrostflakeArrow;
  skillType normal;
  cost DiceType.Cryo, 5;
  associateExtension FrostflakeArrowUsedExtension;
  if (:self.hasEquipment(UndividedHeart) && :getExtensionState().used[:self.who]) {
    :damage(DamageType.Piercing, 3, "opp standby");
  } else {
    :damage(DamageType.Piercing, 2, "opp standby");
  }
  :damage(DamageType.Cryo, 2);
  :setExtensionState((st) => st.used[:self.who] = true);
}

/**
 * @id 11014
 * @name 降众天华
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤冰灵珠。
 */
define skill {
  id 11014 as CelestialShower;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Cryo, 2);
  :summon(SacredCryoPearl);
}

/**
 * @id 1101
 * @name 甘雨
 * @description
 * 「既然是明早前要，那这份通稿，只要熬夜写完就好。」
 */
define character {
  id 1101 as Ganyu;
  since "v3.3.0";
  tags cryo, bow, liyue;
  health 12;
  energy 3;
  skills LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower;
}

/**
 * @id 211011
 * @name 唯此一心
 * @description
 * 战斗行动：我方出战角色为甘雨时，装备此牌。
 * 甘雨装备此牌后，立刻使用一次霜华矢。
 * 装备有此牌的甘雨使用霜华矢时：如果此技能在本场对局中曾经被使用过，则其对敌方后台角色造成的穿透伤害改为3点。
 * （牌组中包含甘雨，才能加入牌组）
 */
define card {
  id 211011 as UndividedHeart;
  since "v3.3.0";
  cost DiceType.Cryo, 5;
  talent Ganyu {
    on enter {
      :useSkill(FrostflakeArrow);
    }
  }
}
