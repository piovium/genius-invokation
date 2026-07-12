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

import { card, character, combatStatus, DamageType, DiceType, skill, summon } from "@gi-tcg/core/builder";
import { Crystallize } from "../../commons.gts";

/**
 * @id 116062
 * @name 大将威仪
 * @description
 * 结束阶段：造成1点岩元素伤害；如果队伍中存在2名岩元素角色，则生成结晶。
 * 可用次数：2
 */
define summon {
  id 116062 as GeneralsGlory;
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
    if (:$$(`my character include defeated with tag (geo)`).length >= 2) {
      :combatStatus(Crystallize);
    }
  }
}

/**
 * @id 116061
 * @name 大将旗指物
 * @description
 * 我方角色造成的岩元素伤害+1。
 * 持续回合：2（可叠加，最多叠加到3回合）
 */
define combatStatus {
  id 116061 as GeneralsWarBanner;
  duration 2 {
    append {
    limit 3;
  };
  };
  on increaseSkillDamage {
    when :( :e.type === DamageType.Geo );
    :e.increaseDamage(1);
  }
}

/**
 * @id 16061
 * @name 呲牙裂扇箭
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16061 as RippingFangFletching;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16062
 * @name 犬坂吠吠方圆阵
 * @description
 * 造成2点岩元素伤害，生成大将旗指物。
 */
define skill {
  id 16062 as InuzakaAllroundDefense;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 2);
  :combatStatus(GeneralsWarBanner);
}

/**
 * @id 16063
 * @name 兽牙逐突形胜战法
 * @description
 * 造成2点岩元素伤害，生成大将旗指物，召唤大将威仪。
 */
define skill {
  id 16063 as JuugaForwardUntoVictory;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 2);
  :combatStatus(GeneralsWarBanner);
  :summon(GeneralsGlory);
}

/**
 * @id 1606
 * @name 五郎
 * @description
 * 锵锵领兵行！
 */
define character {
  id 1606 as Gorou;
  since "v4.3.0";
  tags geo, bow, inazuma;
  health 10;
  energy 2;
  skills RippingFangFletching, InuzakaAllroundDefense, JuugaForwardUntoVictory;
}

/**
 * @id 216061
 * @name 犬奔·疾如风
 * @description
 * 战斗行动：我方出战角色为五郎时，装备此牌。
 * 五郎装备此牌后，立刻使用一次犬坂吠吠方圆阵。
 * 装备有此牌的五郎在场时，我方角色造成岩元素伤害后：如果场上存在大将旗指物，抓1张牌。（每回合1次）
 * （牌组中包含五郎，才能加入牌组）
 */
define card {
  id 216061 as RushingHoundSwiftAsTheWind;
  since "v4.3.0";
  cost DiceType.Geo, 3;
  talent Gorou {
    on enter {
      :useSkill(InuzakaAllroundDefense);
    }
    on skillDamage {
      when :( :e.type === DamageType.Geo && 
          :$(`my combat status with definition id ${GeneralsWarBanner}`) );
      listenTo samePlayer;
      usage perRound, 1;
      :drawCards(1);
    }
  }
}
