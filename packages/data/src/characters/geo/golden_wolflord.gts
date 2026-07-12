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

import { card, character, DamageType, DiceType, skill, status, summon, type SkillHandle, type StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 126031
 * @name 黄金侵蚀
 * @description
 * 结束阶段：如果所附属角色位于后台，则此效果每有1次可用次数，就对所附属角色造成1点穿透伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
define status {
  id 126031 as GoldenCorrosion;
  since "v5.2.0";
  on endPhase {
    when :( :$(`opp equipment with definition id ${BeastlyCorrosion}`) || !:self.master.isActive() );
    usage 1 {
      append 5;
    };
    :damage(DamageType.Piercing, :getVariable("usage"), "@master");
  }
  on enter {
    if (!:$(`opp equipment with definition id ${BeastlyCorrosion}`) && :getVariable("usage") > 3) {
      :setVariable("usage", 3);
    }
  }
}

/**
 * @id 126032
 * @name 兽境犬首
 * @description
 * 结束阶段：造成1点岩元素伤害，目标角色附属黄金侵蚀。
 * 可用次数：2
 */
define summon {
  id 126032 as RifthoundSkull;
  since "v5.2.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
    :characterStatus(GoldenCorrosion, "opp active");
  }
}

/**
 * @id 26031
 * @name 王狼直击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 26031 as WolflordsStrike;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 26032
 * @name 兽境轰召
 * @description
 * 造成2点岩元素伤害，目标角色附属2层黄金侵蚀，召唤兽境犬首。
 */
define skill {
  id 26032 as HowlingRiftcall;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 2);
  :characterStatus(GoldenCorrosion, "opp active", {
      overrideVariables: {
        usage: 2
      }
    });
  :summon(RifthoundSkull);
}

/**
 * @id 26033
 * @name 黄金侵绞
 * @description
 * 造成3点岩元素伤害，对所有敌方后台角色造成1点穿透伤害，并使所有敌方角色附属黄金侵蚀。
 */
define skill {
  id 26033 as GoldenCankerbind;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 3);
  :damage(DamageType.Piercing, 1, "opp standby");
  :characterStatus(GoldenCorrosion, "all opp characters");
}

/**
 * @id 2603
 * @name 黄金王兽
 * @description
 * 来自异界的扭曲魔兽，统领兽境群狼的王者，拥有指挥狼群溶解空间的权威。
 */
define character {
  id 2603 as GoldenWolflord;
  since "v5.2.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills WolflordsStrike, HowlingRiftcall, GoldenCankerbind;
}

/**
 * @id 226031
 * @name 异兽侵蚀
 * @description
 * 战斗行动：我方出战角色为黄金王兽时，装备此牌。
 * 黄金王兽装备此牌后，立刻使用一次兽境轰召。
 * 装备有此牌的黄金王兽在场时，对方的黄金侵蚀最多可叠加到5次，并且所附属角色不在后台时也会生效。
 * （牌组中包含黄金王兽，才能加入牌组）
 */
define card {
  id 226031 as BeastlyCorrosion;
  since "v5.2.0";
  cost DiceType.Geo, 3;
  talent GoldenWolflord {
    on enter {
      :useSkill(HowlingRiftcall);
    }
  }
}
