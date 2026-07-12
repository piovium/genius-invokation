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

import { card, character, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115012
 * @name 大型风灵
 * @description
 * 结束阶段：造成2点风元素伤害。
 * 可用次数：3
 * 我方角色或召唤物引发扩散反应后：转换此牌的元素类型，改为造成被扩散的元素类型的伤害。（离场前仅限一次）
 * 此召唤物在场时：如果此牌的元素类型已转换，则使我方造成的此类元素伤害+1。
 */
define summon {
  id 115012 as LargeWindSpirit01;
  conflictWith 115011;
  hint swirled, 2;
  on endPhase {
    usage 3;
    :damage(:self.variables.hintIcon, 2);
  }
  on increaseDamage {
    when :{
      const color = :getVariable("hintIcon");
      return color !== DamageType.Anemo && color === :e.type;
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 115011
 * @name 大型风灵
 * @description
 * 结束阶段：造成2点风元素伤害。
 * 可用次数：3
 * 我方角色或召唤物引发扩散反应后：转换此牌的元素类型，改为造成被扩散的元素类型的伤害。（离场前仅限一次）
 */
define summon {
  id 115011 as LargeWindSpirit;
  conflictWith 115012;
  hint swirled, 2;
  on endPhase {
    usage 3;
    :damage(:self.variables.hintIcon, 2);
  }
}

/**
 * @id 15011
 * @name 简式风灵作成
 * @description
 * 造成1点风元素伤害。
 */
define skill {
  id 15011 as WindSpiritCreation;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15012
 * @name 风灵作成·陆叁零捌
 * @description
 * 造成3点风元素伤害，使对方强制切换到前一个角色。
 */
define skill {
  id 15012 as AstableAnemohypostasisCreation6308;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 3);
  :switchActive("opp prev");
}

/**
 * @id 15013
 * @name 禁·风灵作成·柒伍同构贰型
 * @description
 * 造成1点风元素伤害，召唤大型风灵。
 */
define skill {
  id 15013 as ForbiddenCreationIsomer75TypeIi;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 1);
  if (:self.hasEquipment(ChaoticEntropy)) {
    :summon(LargeWindSpirit01);
  }
  else {
    :summon(LargeWindSpirit);
  }
}

/**
 * @id 1501
 * @name 砂糖
 * @description
 * 「没有实战过的牌组不值得判断强度！」
 */
define character {
  id 1501 as Sucrose;
  since "v3.3.0";
  tags anemo, catalyst, mondstadt;
  health 10;
  energy 2;
  skills WindSpiritCreation, AstableAnemohypostasisCreation6308, ForbiddenCreationIsomer75TypeIi;
}

/**
 * @id 215011
 * @name 混元熵增论
 * @description
 * 战斗行动：我方出战角色为砂糖时，装备此牌。
 * 砂糖装备此牌后，立刻使用一次禁·风灵作成·柒伍同构贰型。
 * 装备有此牌的砂糖生成的大型风灵已转换成另一种元素后：我方造成的此类元素伤害+1。
 * （牌组中包含砂糖，才能加入牌组）
 */
define card {
  id 215011 as ChaoticEntropy;
  since "v3.3.0";
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  talent Sucrose {
    on enter {
      :useSkill(ForbiddenCreationIsomer75TypeIi);
    }
  }
}
