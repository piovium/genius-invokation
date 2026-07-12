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
 * @id 114021
 * @name 雷狼
 * @description
 * 所附属角色使用普通攻击或元素战技后：造成2点雷元素伤害。
 * 持续回合：2
 */
define status {
  id 114021 as TheWolfWithin;
  duration 2;
  on useSkill {
    when :( :e.isSkillType("normal") || :e.isSkillType("elemental") );
    :damage(DamageType.Electro, 2);
  }
}

/**
 * @id 14021
 * @name 钢脊
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14021 as SteelFang;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14022
 * @name 利爪与苍雷
 * @description
 * 造成3点雷元素伤害。
 */
define skill {
  id 14022 as ClawAndThunder;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
}

/**
 * @id 14023
 * @name 雷牙
 * @description
 * 造成3点雷元素伤害，本角色附属雷狼。
 */
define skill {
  id 14023 as LightningFang;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 3);
  :characterStatus(TheWolfWithin);
}

/**
 * @id 1402
 * @name 雷泽
 * @description
 * 「牌，难。」
 * 「但，有朋友…」
 */
define character {
  id 1402 as Razor;
  since "v3.3.0";
  tags electro, claymore, mondstadt;
  health 10;
  energy 2;
  skills SteelFang, ClawAndThunder, LightningFang;
}

/**
 * @id 214021
 * @name 觉醒
 * @description
 * 战斗行动：我方出战角色为雷泽时，装备此牌。
 * 雷泽装备此牌后，立刻使用一次利爪与苍雷。
 * 装备有此牌的雷泽使用利爪与苍雷后：使我方一个雷元素角色获得1点充能。（每回合1次，出战角色优先）
 * （牌组中包含雷泽，才能加入牌组）
 */
define card {
  id 214021 as Awakening;
  since "v3.3.0";
  cost DiceType.Electro, 3;
  talent Razor {
    on enter {
      :useSkill(ClawAndThunder);
    }
    on useSkill {
      when :( :e.skill.definition.id === ClawAndThunder );
      usage perRound, 1;
      :gainEnergy(1, "my characters with tag (electro) and with energy < maxEnergy limit 1");
    }
  }
}
