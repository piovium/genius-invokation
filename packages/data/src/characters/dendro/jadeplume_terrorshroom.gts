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
 * @id 127011
 * @name 活化激能
 * @description
 * 本角色造成或受到元素伤害后：累积1层「活化激能」。（最多累积3层）
 * 结束阶段：如果「活化激能」层数已达到上限，就将其清空。同时，角色失去所有充能。
 */
define status {
  id 127011 as RadicalVitalityStatus;
  variable vitality, 0;
  defineSnippet addVitality, :{
    const max = :self.master.hasEquipment(ProliferatingSpores) ? 4 : 3;
    :addVariableWithMax("vitality", 1, max);
  };
  on dealDamage {
    :callSnippet.addVitality();
  }
  on damaged {
    :callSnippet.addVitality();
  }
  on endPhase {
    when :( :getVariable("vitality") >= 3 );
    :setVariable("vitality", 0);
    const ch = :self.master;
    ch.loseEnergy(ch.energy);
  }
}

/**
 * @id 27011
 * @name 菌王舞步
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 27011 as MajesticDance;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 27012
 * @name 不稳定孢子云
 * @description
 * 造成3点草元素伤害。
 */
define skill {
  id 27012 as VolatileSporeCloud;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 3);
}

/**
 * @id 27013
 * @name 尾羽豪放
 * @description
 * 造成4点草元素伤害，消耗所有活化激能层数，每层使此伤害+1。
 */
define skill {
  id 27013 as FeatherSpreading;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  const val = :$(`status with definition id ${RadicalVitalityStatus} at @self`)?.getVariable("vitality") ?? 0;
  :damage(DamageType.Dendro, 4 + val);
}

/**
 * @id 27014
 * @name 活化激能
 * @description
 * 【被动】战斗开始时，初始附属活化激能。
 */
define skill {
  id 27014 as RadicalVitality;
  skillType passive {
    on battleBegin {
      :characterStatus(RadicalVitalityStatus);
    }
    on revive {
      :characterStatus(RadicalVitalityStatus);
    }
  }
}

/**
 * @id 2701
 * @name 翠翎恐蕈
 * @description
 * 悄声静听，可以听到幽林之中，蕈类王者巡视领土的脚步…
 */
define character {
  id 2701 as JadeplumeTerrorshroom;
  since "v3.3.0";
  tags dendro, monster;
  health 12;
  energy 2;
  skills MajesticDance, VolatileSporeCloud, FeatherSpreading, RadicalVitality;
}

/**
 * @id 227011
 * @name 孢子增殖
 * @description
 * 战斗行动：我方出战角色为翠翎恐蕈时，装备此牌。
 * 翠翎恐蕈装备此牌后，立刻使用一次不稳定孢子云。
 * 装备有此牌的翠翎恐蕈，可累积的「活化激能」层数+1。
 * （牌组中包含翠翎恐蕈，才能加入牌组）
 */
define card {
  id 227011 as ProliferatingSpores;
  since "v3.3.0";
  cost DiceType.Dendro, 3;
  talent JadeplumeTerrorshroom {
    on enter {
      :useSkill(VolatileSporeCloud);
    }
  }
}
