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

import { card, character, DamageType, DiceType, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 114101
 * @name 售后服务弹
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：1
 */
define summon {
  id 114101 as AftersalesServiceRounds;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 1;
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 114103
 * @name 灯中幽精
 * @description
 * 结束阶段：治疗我方出战角色2点，并使其获得1点充能。
 * 治疗生命值不多于6的角色时，治疗量+1；使没有充能的角色获得充能时，获得量+1。
 * 可用次数：2
 */
define summon {
  id 114103 as Jinni01;
  conflictWith 114102;
  hint DamageType.Heal, "2";
  on endPhase {
    usage 2;
    const ch = :$("my active")!;
    if (ch.health <= 6) {
      ch.heal(3);
    } else {
      ch.heal(2);
    }
    if (ch.energy === 0) {
      ch.gainEnergy(2);
    } else {
      ch.gainEnergy(1);
    }
  }
}

/**
 * @id 114102
 * @name 灯中幽精
 * @description
 * 结束阶段：治疗我方出战角色2点，并使其获得1点充能。
 * 可用次数：2
 */
define summon {
  id 114102 as Jinni;
  conflictWith 114103;
  hint DamageType.Heal, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Heal, 2, "my active");
    :gainEnergy(1, "my active");
  }
}

/**
 * @id 14101
 * @name 妙显剑舞·改
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14101 as MarvelousSworddanceModified;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14102
 * @name 镇灵之灯·烦恼解决炮
 * @description
 * 造成2点雷元素伤害，召唤售后服务弹。
 */
define skill {
  id 14102 as SpiritwardingLampTroubleshooterCannon;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 2);
  :summon(AftersalesServiceRounds);
}

/**
 * @id 14103
 * @name 卡萨扎莱宫的无微不至
 * @description
 * 造成1点雷元素伤害，召唤灯中幽精。
 */
define skill {
  id 14103 as AlcazarzaraysExactitude;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 1);
  if (:self.hasEquipment(DiscretionarySupplement)) {
    :summon(Jinni01);
  }
  else {
    :summon(Jinni);
  }
}

/**
 * @id 1410
 * @name 多莉
 * @description
 * 摩拉多多，快乐多多！
 */
define character {
  id 1410 as Dori;
  since "v4.2.0";
  tags electro, claymore, sumeru;
  health 10;
  energy 2;
  skills MarvelousSworddanceModified, SpiritwardingLampTroubleshooterCannon, AlcazarzaraysExactitude;
}

/**
 * @id 214101
 * @name 酌盈剂虚
 * @description
 * 战斗行动：我方出战角色为多莉时，装备此牌。
 * 多莉装备此牌后，立刻使用一次卡萨扎莱宫的无微不至。
 * 装备有此牌的多莉所召唤的灯中幽精，对生命值不多于6的角色造成的治疗+1，使没有充能的角色获得充能时获得量+1。
 * （牌组中包含多莉，才能加入牌组）
 */
define card {
  id 214101 as DiscretionarySupplement;
  since "v4.2.0";
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  talent Dori {
    on enter {
      :useSkill(AlcazarzaraysExactitude);
    }
  }
}
