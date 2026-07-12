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
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方出战角色1点。
 * 可用次数：3
 */
define summon {
  id 115021 as DandelionField;
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Anemo, 1);
    :heal(1, "my active");
  }
  on increaseDamage {
    when :( :$(`my equipment with definition id ${LandsOfDandelion}`) && // 装备有天赋的琴在场时
        :e.type === DamageType.Anemo );
    :e.increaseDamage(1);
  }
}

/**
 * @id 15021
 * @name 西风剑术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15021 as FavoniusBladework;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15022
 * @name 风压剑
 * @description
 * 造成3点风元素伤害，使对方强制切换到下一个角色。
 */
define skill {
  id 15022 as GaleBlade;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 3);
  :switchActive("opp next");
}

/**
 * @id 15023
 * @name 蒲公英之风
 * @description
 * 治疗所有我方角色2点，召唤蒲公英领域。
 */
define skill {
  id 15023 as DandelionBreeze;
  skillType burst;
  cost DiceType.Anemo, 4;
  cost DiceType.Energy, 2;
  :heal(2, "all my characters");
  :summon(DandelionField);
}

/**
 * @id 1502
 * @name 琴
 * @description
 * 在夺得最终的胜利之前，她总是认为自己做得还不够好。
 */
define character {
  id 1502 as Jean;
  since "v3.3.0";
  tags anemo, sword, mondstadt;
  health 12;
  energy 2;
  skills FavoniusBladework, GaleBlade, DandelionBreeze;
}

/**
 * @id 215021
 * @name 蒲公英的国土
 * @description
 * 战斗行动：我方出战角色为琴时，装备此牌。
 * 琴装备此牌后，立刻使用一次蒲公英之风。
 * 装备有此牌的琴在场时，蒲公英领域会使我方造成的风元素伤害+1。
 * （牌组中包含琴，才能加入牌组）
 */
define card {
  id 215021 as LandsOfDandelion;
  since "v3.3.0";
  cost DiceType.Anemo, 4;
  cost DiceType.Energy, 2;
  talent Jean {
    on enter {
      :useSkill(DandelionBreeze);
    }
  }
}
