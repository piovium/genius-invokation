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

import { Aura, card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 113101
 * @name 怪笑猫猫帽
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define summon {
  id 113101 as GrinmalkinHat;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 1 {
      append 2;
    };
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 113102
 * @name 隐具余数
 * @description
 * 隐具余数最多可以叠加到3层。
 * 角色使用眩惑光戏法时：每层隐具余数使伤害+1。技能结算后，耗尽隐具余数，每层治疗角色1点。
 */
define status {
  id 113102 as PropSurplus;
  variable surplus, 1;
  on increaseSkillDamage {
    when :( :e.via.definition.id === BewilderingLights );
    :e.increaseDamage(:getVariable("surplus"));
  }
  on useSkill {
    when :( :e.skill.definition.id === BewilderingLights );
    const surplus = :getVariable("surplus");
    :heal(surplus, "@master");
    :dispose();
  }
}

/**
 * @id 13101
 * @name 迫牌易位式
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13101 as CardForceTranslocation;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13102
 * @name 隐具魔术箭
 * @description
 * 造成2点火元素伤害，召唤怪笑猫猫帽，累积1层隐具余数。
 * 如果本角色生命值至少为6，则对自身造成1点穿透伤害。
 */
define skill {
  id 13102 as PropArrow;
  skillType normal;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 2);
  :summon(GrinmalkinHat);
  const surplusSt = :self.hasStatus(PropSurplus);
  if (surplusSt) {
    :addVariableWithMax("surplus", 1, 3, surplusSt);
  } else {
    :self.addStatus(PropSurplus);  
  }
  if (:self.health >= 6) {
    :damage(DamageType.Piercing, 1, "@self");
  }
}

/**
 * @id 13103
 * @name 眩惑光戏法
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 13103 as BewilderingLights;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 13104
 * @name 大魔术·灵迹巡游
 * @description
 * 造成3点火元素伤害，召唤怪笑猫猫帽，累积1层隐具余数。
 */
define skill {
  id 13104 as WondrousTrickMiracleParade;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :summon(GrinmalkinHat);
  const surplusSt = :self.hasStatus(PropSurplus);
  if (surplusSt) {
    :addVariableWithMax("surplus", 1, 3, surplusSt);
  } else {
    :self.addStatus(PropSurplus);
  }
}

/**
 * @id 1310
 * @name 林尼
 * @description
 * 镜中捧花，赠予何人。
 */
define character {
  id 1310 as Lyney;
  since "v4.3.0";
  tags pyro, bow, fontaine, fatui, ousia;
  health 10;
  energy 2;
  skills CardForceTranslocation, PropArrow, BewilderingLights, WondrousTrickMiracleParade;
}

/**
 * @id 213101
 * @name 完场喝彩
 * @description
 * 战斗行动：我方出战角色为林尼时，装备此牌。
 * 林尼装备此牌后，立刻使用一次隐具魔术箭。
 * 装备有此牌的林尼在场时，林尼自身和怪笑猫猫帽对具有火元素附着的角色造成的伤害+2。（每回合1次）
 * （牌组中包含林尼，才能加入牌组）
 */
define card {
  id 213101 as ConclusiveOvation;
  since "v4.3.0";
  cost DiceType.Pyro, 3;
  talent Lyney {
    on enter {
      :useSkill(PropArrow);
    }
    on increaseSkillDamage {
      when :( [Lyney as number, GrinmalkinHat as number].includes(:e.source.definition.id) && 
          :e.target.aura === Aura.Pyro );
      usage perRound, 1;
      :e.increaseDamage(2);
    }
  }
}
