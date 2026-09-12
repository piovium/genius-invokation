// Copyright (C) 2026 Piovium Labs
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

import { DiceType, DamageType, $ } from "@gi-tcg/core/data";

/**
 * @id 116121
 * @name 阿咚
 * @description
 * 战斗行动：选一个敌方角色，对其造成1点岩元素伤害。
 */
define card {
  id 116121 as Aedon;
  since "v7.1.0";
  // TODO
}

/**
 * @id 116122
 * @name 夜莺之歌
 * @description
 * 敌方受到的岩元素伤害+1。
 * 可用次数：1（可叠加，无上限）
 * 我方「召唤物」入场时，此牌可用次数+1。
 */
define combatStatus {
  id 116122 as NightingalesSong;
  since "v7.1.0";
  // TODO
}

/**
 * @id 16121
 * @name 守誓枪术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16121 as OathkeepersSpear;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  // TODO

}

/**
 * @id 16122
 * @name 衔莺破晓
 * @description
 * 造成3点岩元素伤害，生成手牌阿咚。
 */
define skill {
  id 16122 as DawnbearingSongbird;
  skillType elemental;
  cost DiceType.Geo, 3;
  // TODO

}

/**
 * @id 16123
 * @name 鉴照无影
 * @description
 * 造成3点岩元素伤害，生成可用次数为3的夜莺之歌。
 */
define skill {
  id 16123 as ShadowlessReflection;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  // TODO

}

/**
 * @id 16124
 * @name 月兆祝赐·凌冬不凋
 * @description
 * 【被动】名称不存在于本局最初牌组的牌加入我方手牌时，赋予其费用降低。（每回合1次）
 */
define skill {
  id 16124 as MoonsignBenedictionUnwitheringInWinter;
  skillType passive {
    // TODO
  }
}

/**
 * @id 1612
 * @name 叶洛亚
 * @description
 * 普照魇夜，方启明昼。
 */
define character {
  id 1612 as Illuga;
  since "v7.1.0";
  tags geo, pole, nodkrai;
  health 10;
  energy 2;
  skills OathkeepersSpear, DawnbearingSongbird, ShadowlessReflection, MoonsignBenedictionUnwitheringInWinter;
}

/**
 * @id 216121
 * @name 噬枝之麋
 * @description
 * 快速行动：我方出战角色为叶洛亚时，装备此牌。
 * 生成1层夜莺之歌。
 * 装备有此牌的叶洛亚在场时：每消耗2层夜莺之歌，生成1张手牌阿咚。
 * （牌组中包含叶洛亚，才能加入牌组）
 */
define card {
  id 216121 as ElkWithFangedAntlers;
  since "v7.1.0";
  cost DiceType.Geo, 1;
  talent Illuga {
    // TODO
  }
}
