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

import { character, skill, summon, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 116041
 * @name 阳华
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：3
 * 此召唤物在场，我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
define summon {
  id 116041 as SolarIsotoma;
  hint DamageType.Geo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Geo, 1);
  }
  on beforeFastSwitch {
    usage perRound, 1;
    :e.setFastAction();
  }
}

/**
 * @id 16041
 * @name 西风剑术·白
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16041 as FavoniusBladeworkWeiss;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16042
 * @name 创生法·拟造阳华
 * @description
 * 召唤阳华。
 */
define skill {
  id 16042 as AbiogenesisSolarIsotoma;
  skillType elemental;
  cost DiceType.Geo, 3;
  :summon(SolarIsotoma);
}

/**
 * @id 16043
 * @name 诞生式·大地之潮
 * @description
 * 造成4点岩元素伤害，如果阳华在场，就使此伤害+2。
 */
define skill {
  id 16043 as RiteOfProgenitureTectonicTide;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  if (:$(`my summons with definition id ${SolarIsotoma}`)) {
    :damage(DamageType.Geo, 6);
  }
  else {
    :damage(DamageType.Geo, 4);
  }
}

/**
 * @id 1604
 * @name 阿贝多
 * @description
 * 黑土与白垩，赤成与黄金。
 */
define character {
  id 1604 as Albedo;
  since "v4.0.0";
  tags geo, sword, mondstadt;
  health 12;
  energy 2;
  skills FavoniusBladeworkWeiss, AbiogenesisSolarIsotoma, RiteOfProgenitureTectonicTide;
}

/**
 * @id 216041
 * @name 神性之陨
 * @description
 * 战斗行动：我方出战角色为阿贝多时，装备此牌。
 * 阿贝多装备此牌后，立刻使用一次创生法·拟造阳华。
 * 装备有此牌的阿贝多在场时，如果我方场上存在阳华，则我方角色进行下落攻击时少花费1个无色元素，并且造成的伤害+1。
 * （牌组中包含阿贝多，才能加入牌组）
 */
define card {
  id 216041 as DescentOfDivinity;
  since "v4.0.0";
  cost DiceType.Geo, 3;
  talent Albedo {
    on enter {
      :useSkill(AbiogenesisSolarIsotoma);
    }
    on deductVoidDiceSkill {
      when :( :$(`my summons with definition id ${SolarIsotoma}`) &&
          :e.isPlungingAttack() );
      listenTo samePlayer;
      :e.deductVoidCost(1);
    }
    on increaseSkillDamage {
      when :( :$(`my summons with definition id ${SolarIsotoma}`) &&
          :e.viaPlungingAttack() );
      listenTo samePlayer;
      :e.increaseDamage(1);
    }
  }
}
