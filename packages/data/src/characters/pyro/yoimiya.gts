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

import { card, character, combatStatus, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113053
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 所附属角色使用普通攻击后：造成1点火元素伤害。
 * 可用次数：3
 */
define status {
  id 113053 as NiwabiEnshou01;
  conflictWith 113051;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 3;
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 113051
 * @name 庭火焰硝
 * @description
 * 所附属角色普通攻击伤害+1，造成的物理伤害变为火元素伤害。
 * 可用次数：3
 */
define status {
  id 113051 as NiwabiEnshou;
  conflictWith 113053;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 3;
    :e.increaseDamage(1);
  }
}

/**
 * @id 113052
 * @name 琉金火光
 * @description
 * 宵宫以外的我方角色使用技能后：造成1点火元素伤害。
 * 持续回合：2
 */
define combatStatus {
  id 113052 as AurousBlaze;
  duration 2;
  on useSkill {
    when :( :e.skill.caller.definition.id !== Yoimiya );
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 13051
 * @name 烟火打扬
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13051 as FireworkFlareup;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13052
 * @name 焰硝庭火舞
 * @description
 * 本角色附属庭火焰硝。（此技能不产生充能）
 */
define skill {
  id 13052 as NiwabiFiredance;
  skillType elemental;
  cost DiceType.Pyro, 1;
  noEnergy;
  if (:self.hasEquipment(NaganoharaMeteorSwarm)) {
    :characterStatus(NiwabiEnshou01);
  }
  else {
    :characterStatus(NiwabiEnshou);
  }
}

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成3点火元素伤害，生成琉金火光。
 */
define skill {
  id 13053 as RyuukinSaxifrage;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Pyro, 3);
  :combatStatus(AurousBlaze);
}

/**
 * @id 1305
 * @name 宵宫
 * @description
 * 花见坂第十一届全街邀请赛「长野原队」队长兼首发牌手。
 */
define character {
  id 1305 as Yoimiya;
  since "v3.3.0";
  tags pyro, bow, inazuma;
  health 10;
  energy 3;
  skills FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage;
}

/**
 * @id 213051
 * @name 长野原龙势流星群
 * @description
 * 战斗行动：我方出战角色为宵宫时，装备此牌。
 * 宵宫装备此牌后，立刻使用一次焰硝庭火舞。
 * 装备有此牌的宵宫所生成的庭火焰硝触发后额外造成1点火元素伤害。
 * （牌组中包含宵宫，才能加入牌组）
 */
define card {
  id 213051 as NaganoharaMeteorSwarm;
  since "v3.3.0";
  cost DiceType.Pyro, 1;
  talent Yoimiya {
    on enter {
      :useSkill(NiwabiFiredance);
    }
  }
}
