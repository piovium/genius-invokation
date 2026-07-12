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
import { BondOfLife } from "../../commons.gts";

/**
 * @id 121042
 * @name 掠袭锐势
 * @description
 * 结束阶段：对所有附属有生命之契的敌方角色造成1点穿透伤害。
 * 持续回合：2
 */
define status {
  id 121042 as OnslaughtStance;
  since "v4.8.0";
  duration 2;
  on endPhase {
    :damage(DamageType.Piercing, 1, `opp characters has status with definition id ${BondOfLife}`);
  }
}

/**
 * @id 21041
 * @name 迅捷剑锋
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 21041 as SwiftPoint;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 21042
 * @name 霜刃截击
 * @description
 * 造成3点冰元素伤害。
 */
define skill {
  id 21042 as FrostyInterjection;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
}

/**
 * @id 21043
 * @name 掠袭之刺
 * @description
 * 造成5点冰元素伤害，本角色附属掠袭锐势。
 */
define skill {
  id 21043 as ThornyOnslaught;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 5);
  :characterStatus(OnslaughtStance, "@self");
}

/**
 * @id 21044
 * @name 血契掠影
 * @description
 * 【被动】本角色使用技能后：对敌方出战角色附属可用次数为（本技能最终伤害值-2）的生命之契。（最多5层）
 */
define skill {
  id 21044 as BloodbondedShadow;
  skillType passive {
    variable damageValue, 0;
    on skillDamage {
      :addVariable("damageValue", :e.damageInfo.value);
    }
    on useSkill {
      const usage = Math.min(:getVariable("damageValue") - 2, 5);
      :setVariable("damageValue", 0);
      if (usage > 0) {
        :characterStatus(BondOfLife, "opp active", {
          overrideVariables: { usage }
        });
        if (:self.hasEquipment(RimeflowRapier)) {
          const bondSt = :$(`status with definition id ${BondOfLife} at opp active`);
          if (bondSt) {
            const oldUsage = bondSt.getVariable("usage");
            bondSt.setVariable("usage", oldUsage * 2);
          }
        }
      }
    }
  }
}

/**
 * @id 2104
 * @name 愚人众·霜役人
 * @description
 * 自幼就被选中的人，经长久年月的教化与训练，在无数次的汰换后才能成为所谓的「役人」。
 */
define character {
  id 2104 as FrostOperative;
  since "v4.8.0";
  tags cryo, fatui;
  health 11;
  energy 2;
  skills SwiftPoint, FrostyInterjection, ThornyOnslaught, BloodbondedShadow;
}

/**
 * @id 221041
 * @name 冰雅刺剑
 * @description
 * 战斗行动：我方出战角色为愚人众·霜役人时，装备此牌。
 * 愚人众·霜役人装备此牌后，立刻使用一次霜刃截击。
 * 装备有此牌的愚人众·霜役人触发血契掠影后：使敌方出战角色的生命之契层数翻倍。
 * （牌组中包含愚人众·霜役人，才能加入牌组）
 */
define card {
  id 221041 as RimeflowRapier;
  since "v4.8.0";
  cost DiceType.Cryo, 3;
  talent FrostOperative {
    on enter {
      :useSkill(FrostyInterjection);
    }
  }
}
