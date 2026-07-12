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

import { $, Aura, card, character, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 124063
 * @name 轰霆护罩
 * @description
 * 所附属角色免疫所有伤害。
 * 此状态提供2次雷元素附着（可被元素反应消耗）：耗尽后移除此效果，并使所附属角色无法使用技能且在结束阶段受到6点穿透伤害。
 */
define status {
  id 124063 as ThunderousWard;
  reserved;
}

/**
 * @id 124064
 * @name 深渊滚雷
 * @description
 * 所附属角色无法使用技能。
 * 结束阶段：对所附属角色造成6点穿透伤害，然后移除此效果。
 */
define status {
  id 124064 as RollingAbyssalThunder;
  reserved;
}

/**
 * @id 124062
 * @name 雷之新生·锐势
 * @description
 * 角色造成的雷元素伤害+1。
 */
define status {
  id 124062 as ElectricRebirthHoned;
  since "v5.1.0";
  on increaseSkillDamage {
    when :( :e.type === DamageType.Electro );
    :e.increaseDamage(1);
  }
}

/**
 * @id 124061
 * @name 雷之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到4点生命值。此效果触发后，角色造成的雷元素伤害+1。
 */
define status {
  id 124061 as ElectricRebirth;
  since "v5.1.0";
  on beforeDefeated {
    :immune(4);
    const talent = :self.master.hasEquipment(ChainLightningCascade);
    if (talent) {
      :dispose(talent);
      :$("opp active")?.loseEnergy(1);
    }
    :characterStatus(ElectricRebirthHoned, "@master");
    :dispose();
  }
}

/**
 * @id 24061
 * @name 渊薮落雷
 * @description
 * 造成1点雷元素伤害。
 */
define skill {
  id 24061 as DenOfThunder;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Electro, 1);
}

/**
 * @id 24062
 * @name 秘渊虚霆
 * @description
 * 造成3点雷元素伤害。
 * 如果目标已附着雷元素，则夺取对方1点充能。（如果夺取时此角色充能已满，则改为由下一个充能未满的角色获得充能）
 */
define skill {
  id 24062 as ShockOfTheEnigmaticAbyss;
  skillType elemental;
  cost DiceType.Electro, 3;
  const target = :$("opp active");
  if (target?.aura === Aura.Electro) {
    const energy = target.loseEnergy(1);
    if (energy > 0) {
      :$("my characters with energy < maxEnergy")?.gainEnergy(1);
    }
  }
  :damage(DamageType.Electro, 3);
}

/**
 * @id 24063
 * @name 狂迸骇雷
 * @description
 * 造成3点雷元素伤害。
 * 如果目标充能不多于1，造成的伤害+2。
 */
define skill {
  id 24063 as WildThunderburst;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  if (:$("opp active")!.energy <= 1) {
    :damage(DamageType.Electro, 5);
  }
  else {
    :damage(DamageType.Electro, 3);
  }
}

/**
 * @id 24064
 * @name 雷之新生
 * @description
 * 【被动】战斗开始时，初始附属雷之新生。
 */
define skill {
  id 24064 as ElectricRebirthPassive;
  skillType passive {
    on battleBegin {
      :characterStatus(ElectricRebirth);
    }
  }
}

/**
 * @id 24065
 * @name 雷之新生
 * @description
 * 战斗开始时，初始附属雷之新生。
 */
define skill {
  id 24065 as ElectricRebirthPassive01;
  skillType passive;
  reserved;
}

/**
 * @id 2406
 * @name 深渊咏者·紫电
 * @description
 * 高颂渊薮，侵蚀之智。
 */
define character {
  id 2406 as AbyssLectorVioletLightning;
  since "v5.1.0";
  tags electro, monster;
  health 6;
  energy 2;
  skills DenOfThunder, ShockOfTheEnigmaticAbyss, WildThunderburst, ElectricRebirthPassive;
}

// 侵雷重闪入场时创建此出战状态，检测咏者击倒后夺取1点充能
define combatStatus {
  id 124065 as ChainLightningCascadeCombatStatus;
  on defeated {
    when :( :e.target.definition.id === AbyssLectorVioletLightning );
    :query($.opp.active)?.loseEnergy(1);
    :dispose();
  }
}

/**
 * @id 224061
 * @name 侵雷重闪
 * @description
 * 入场时：如果装备有此牌的深渊咏者·紫电已触发过雷之新生，则使敌方出战角色失去1点充能。
 * 装备有此牌的深渊咏者·紫电被击倒或触发雷之新生时：弃置此牌，使敌方出战角色失去1点充能。
 * （牌组中包含深渊咏者·紫电，才能加入牌组）
 */
define card {
  id 224061 as ChainLightningCascade;
  since "v5.1.0";
  cost DiceType.Electro, 1;
  talent AbyssLectorVioletLightning, none {
    on enter {
      :combatStatus(ChainLightningCascadeCombatStatus);
      if (!:self.master.hasStatus(ElectricRebirth)) {
        :query($.opp.active)?.loseEnergy(1);
      }
    }
  }
}
