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

import { card, character, DamageType, DiceType, skill, summon, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 122013
 * @name 纯水幻形·蛙
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点水元素伤害。
 */
define summon {
  id 122013 as OceanicMimicFrog;
  tags barrier;
  hint DamageType.Hydro, "2";
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Hydro, 2);
    :dispose();
  }
}

/**
 * @id 122012
 * @name 纯水幻形·飞鸢
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 可用次数：3
 */
define summon {
  id 122012 as OceanicMimicRaptor;
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Hydro, 1);
  }
}

/**
 * @id 122011
 * @name 纯水幻形·花鼠
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2
 */
define summon {
  id 122011 as OceanicMimicSquirrel;
  hint DamageType.Hydro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 2);
  }
}

/**
 * @id 122010
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用1次；耗尽后，在结束阶段造成2点水元素伤害。
 */
define summon {
  id 122010 as OceanicMimicRaptorPreview; // 这是纯水幻形·飞鸢的预览版本
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Hydro, 1);
  }
}

/**
 * @id 122014
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种，最多同时存在2种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用1次；耗尽后，在结束阶段造成2点水元素伤害。
 */
define summon {
  id 122014 as OceanicMimicFrogPreview; // 这是纯水幻形·蛙的预览版本
  hint DamageType.Hydro, "2";
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Hydro, 2);
    :dispose();
  }
}

/**
 * @id 22011
 * @name 翻涌
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 22011 as Surge;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

export const NORMAL_MIMICS = [OceanicMimicSquirrel, OceanicMimicRaptor, OceanicMimicFrog] as number[];

export const PREVIEW_MIMICS = [OceanicMimicSquirrel, OceanicMimicRaptorPreview, OceanicMimicFrogPreview] as number[];

/**
 * @id 22012
 * @name 纯水幻造
 * @description
 * 随机召唤1种纯水幻形。（优先生成不同的类型）
 */
define skill {
  id 22012 as OceanidMimicSummoning;
  skillType elemental;
  cost DiceType.Hydro, 3;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  let target;
  const rest = mimics.filter((id) => !exists.includes(id));
  if (rest.length > 0) {
    target = :random(rest);
  } else {
    target = :random(mimics);
  }
  :summon(target as SummonHandle);
}

/**
 * @id 22013
 * @name 林野百态
 * @description
 * 随机召唤2种纯水幻形。（优先生成不同的类型）
 */
define skill {
  id 22013 as TheMyriadWilds;
  skillType elemental;
  cost DiceType.Hydro, 5;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  for (let i = 0; i < 2; i++) {
    let target;
    const rest = mimics.filter((id) => !exists.includes(id));
    if (rest.length > 0) {
      target = :random(rest);
    } else {
      target = :random(mimics);
    }
    :summon(target as SummonHandle);
    exists.push(target);
  }
}

/**
 * @id 22014
 * @name 潮涌与激流
 * @description
 * 造成4点水元素伤害；我方每有1个召唤物，再使此伤害+1。
 */
define skill {
  id 22014 as TideAndTorrent;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  const summons = :$$("my summons");
  const damageValue = 4 + summons.length;
  :damage(DamageType.Hydro, damageValue);
  if (:self.hasEquipment(StreamingSurge)) {
    summons.forEach((s) => s.addVariable("usage", 1))
  }
}

/**
 * @id 2201
 * @name 纯水精灵·洛蒂娅
 * @description
 * 「但，只要百川奔流，雨露不休，水就不会消失…」
 */
define character {
  id 2201 as RhodeiaOfLoch;
  since "v3.3.0";
  tags hydro, monster;
  health 11;
  energy 3;
  skills Surge, OceanidMimicSummoning, TheMyriadWilds, TideAndTorrent;
}

/**
 * @id 222011
 * @name 百川奔流
 * @description
 * 战斗行动：我方出战角色为纯水精灵·洛蒂娅时，装备此牌。
 * 纯水精灵·洛蒂娅装备此牌后，立刻使用一次潮涌与激流。
 * 装备有此牌的纯水精灵·洛蒂娅使用潮涌与激流时：我方所有召唤物可用次数+1。
 * （牌组中包含纯水精灵·洛蒂娅，才能加入牌组）
 */
define card {
  id 222011 as StreamingSurge;
  since "v3.3.0";
  cost DiceType.Hydro, 4;
  cost DiceType.Energy, 3;
  talent RhodeiaOfLoch {
    on enter {
      :useSkill(TideAndTorrent);
    }
  }
}
