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

import { card, character, DamageType, DiceType, skill, status, type CardHandle } from "@gi-tcg/core/builder";

/**
 * @id 23046
 * @name 炽烈轰破
 * @description
 * （需准备1个行动轮）
 * 造成1点火元素伤害，对敌方所有后台角色造成2点穿透伤害。本角色每附属有2层重甲蟹壳，就使此技能造成的火元素伤害+1。
 */
define skill {
  id 23046 as SearingBlast;
  skillType burst;
  prepared;
  :damage(DamageType.Piercing, 2, "opp standby");
  const value = :$(`status with definition id ${ArmoredCrabCarapace} at @self`)?.getVariable("shield") ?? 0;
  :damage(DamageType.Pyro, 1 + Math.floor(value / 2));
}

/**
 * @id 123043
 * @name 积蓄烈威
 * @description
 * 本角色将在下次行动时，直接使用技能：炽烈轰破。
 */
define status {
  id 123043 as AccruingPower;
  prepare SearingBlast;
}

/**
 * @id 123041
 * @name 重甲蟹壳
 * @description
 * 每层提供1点护盾，保护所附属角色。
 */
define status {
  id 123041 as ArmoredCrabCarapace;
  shield 0, Infinity;
}

/**
 * @id 123044
 * @name 披甲钳进
 * @description
 * 行动阶段开始时：如果所附属角色未附属重甲蟹壳，则附属3层重甲蟹壳。
 */
define status {
  id 123044 as HeavyClampdown;
  reserved;
}

/**
 * @id 23041
 * @name 重钳碎击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 23041 as ShatterclampStrike;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 23042
 * @name 烈焰燃绽
 * @description
 * 造成1点火元素伤害；如果本角色附属有至少7层重甲蟹壳，则此伤害+1。
 * 然后，本角色附属2层重甲蟹壳。
 */
define skill {
  id 23042 as BusterBlaze;
  skillType elemental;
  cost DiceType.Pyro, 3;
  const value = :$(`status with definition id ${ArmoredCrabCarapace} at @self`)?.getVariable("shield") ?? 0;
  if (value >= 7) {
    :damage(DamageType.Pyro, 2);
  } else {
    :damage(DamageType.Pyro, 1);
  }
  :characterStatus(ArmoredCrabCarapace, "@self", {
      overrideVariables: {
        shield: 2
      }
    });
}

/**
 * @id 23043
 * @name 战阵爆轰
 * @description
 * 本角色准备技能：炽烈轰破。
 */
define skill {
  id 23043 as BattlelineDetonation;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :characterStatus(AccruingPower, "@self");
}

/**
 * @id 23044
 * @name 帝王甲胄
 * @description
 * 【被动】战斗开始时：初始附属5层重甲蟹壳。
 * 我方执行任意行动后：如果我方场上存在重甲蟹壳以外的护盾状态或护盾出战状态，则将其全部移除；每移除1个，就使角色附属2层重甲蟹壳。
 */
define skill {
  id 23044 as ImperialPanoply;
  skillType passive {
    on battleBegin {
      :characterStatus(ArmoredCrabCarapace, "@master", {
          overrideVariables: {
            shield: 5
          }
        });
    }
    on action {
      when :( :$(`(my statuses with tag (shield) or my combat statuses with tag (shield)) and not with definition id ${ArmoredCrabCarapace}`) );
      const shields = :$$(`my statuses with tag (shield) or my combat statuses with tag (shield)`);
      let shieldValue = 0;
      for (const shield of shields) {
        if (shield.definition.id === ArmoredCrabCarapace) {
          shieldValue += shield.getVariable("shield");
        } else {
          shieldValue += 2;
        }
        shield.dispose();
      }
      if (shieldValue > 0) {
        :characterStatus(ArmoredCrabCarapace, "@master", {
          overrideVariables: {
            shield: shieldValue
          }
        });
      }
    }
  }
}

/**
 * @id 23047
 * @name 帝王甲胄
 * @description
 * 
 */
define skill {
  id 23047 as ImperialPanoply01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 2304
 * @name 铁甲熔火帝皇
 * @description
 * 矗立在原海异种顶端的两位霸主之一，不遇天敌，不倦狩猎并成长之蟹。有着半是敬畏，半是戏谑的「帝皇」之称。
 */
define character {
  id 2304 as EmperorOfFireAndIron;
  since "v4.6.0";
  tags pyro, monster;
  health 5;
  energy 2;
  skills ShatterclampStrike, BusterBlaze, BattlelineDetonation, ImperialPanoply, SearingBlast;
}

/**
 * @id 223041
 * @name 熔火铁甲
 * @description
 * 入场时：对装备有此牌的铁甲熔火帝皇附着火元素。
 * 我方除重甲蟹壳以外的护盾状态或护盾出战状态被移除后：装备有此牌的铁甲熔火帝皇附属2层重甲蟹壳。（每回合1次）
 * （牌组中包含铁甲熔火帝皇，才能加入牌组）
 */
define card {
  id 223041 as MoltenMail;
  since "v4.6.0";
  cost DiceType.Pyro, 1;
  talent EmperorOfFireAndIron, none {
    on enter {
      :apply(DamageType.Pyro, "@master");
    }
    on dispose {
      when :{
        return (:e.entity.definition.type === "combatStatus" || :e.entity.definition.type === "status") &&
          :e.entity.definition.id !== ArmoredCrabCarapace &&
          :e.entity.definition.tags.includes("shield");
      };
      listenTo samePlayer;
      usage perRound, 1;
      :characterStatus(ArmoredCrabCarapace, "@master", {
          overrideVariables: {
            shield: 2
          }
        });
    }
  }
}
