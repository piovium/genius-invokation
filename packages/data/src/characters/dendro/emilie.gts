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

import { card, character, DamageType, DiceType, Reaction, skill, status, summon, type SummonHandle } from "@gi-tcg/core/builder";
import { BurningFlame } from "../../commons.gts";

/**
 * @id 117102
 * @name 柔灯之匣·二阶
 * @description
 * 结束阶段：造成2点草元素伤害。
 * 可用次数：3（可叠加，最多叠加到6次）
 */
define summon {
  id 117102 as LumidouceCaseLevel2;
  since "v5.5.0";
  hint DamageType.Dendro, 2;
  on endPhase {
    usage 3 {
      append 6;
    };
    :damage(DamageType.Dendro, 2);
  }
}

/**
 * @id 117101
 * @name 柔灯之匣·一阶
 * @description
 * 结束阶段：造成1点草元素伤害。
 * 我方造成燃烧反应伤害后：此牌升级为柔灯之匣·二阶。
 * 可用次数：3（可叠加，最多叠加到6次）
 */
define summon {
  id 117101 as LumidouceCaseLevel1;
  since "v5.5.0";
  hint DamageType.Dendro, "1";
  on endPhase {
    usage 3 {
      append 6;
    };
    // 节末升级二阶时仍然使用此技能定义，故检测自身为二阶时改为2伤
    if (:self.definition.id === LumidouceCaseLevel2) {
      :damage(DamageType.Dendro, 2);
    }
    else {
      :damage(DamageType.Dendro, 1);
    }
  }
  on dealDamage {
    when :( :e.getReaction() === Reaction.Burning );
    listenTo samePlayer;
    :transformDefinition("@self", LumidouceCaseLevel2);
  }
}

/**
 * @id 117103
 * @name 柔灯之匣·三阶
 * @description
 * 结束阶段：对敌方全体造成1点草元素伤害。
 * 可用次数：1
 */
define summon {
  id 117103 as LumidouceCaseLevel3;
  since "v5.5.0";
  hint DamageType.Dendro, 1;
  on endPhase {
    usage 1;
    :damage(DamageType.Dendro, 1, "all opp characters");
  }
}

/**
 * @id 117104
 * @name 余薰（生效中）
 * @description
 * 双方角色使用技能后：触发1次我方燃烧烈焰的回合结束效果。
 */
define status {
  id 117104 as LingeringFragranceInEffect;
  since "v5.5.0";
  once useSkill {
    listenTo all;
    const burning = :$(`my summons with definition id ${BurningFlame}`);
    if (burning) {
      :triggerEndPhaseSkill(burning);
    }
  }
}

/**
 * @id 17101
 * @name 逐影枪术·改
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17101 as ShadowhuntingSpearCustom;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17102
 * @name 撷萃调香
 * @description
 * 召唤柔灯之匣·一阶。
 */
define skill {
  id 17102 as FragranceExtraction;
  skillType elemental;
  cost DiceType.Dendro, 3;
  if (:$(`my summons with definition id ${LumidouceCaseLevel2}`)) {
    :summon(LumidouceCaseLevel2);
  }
  else {
    :summon(LumidouceCaseLevel1);
  }
}

/**
 * @id 17103
 * @name 香氛演绎
 * @description
 * 造成1点草元素伤害。召唤柔灯之匣·三阶。
 */
define skill {
  id 17103 as AromaticExplication;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 1);
  :summon(LumidouceCaseLevel3);
}

/**
 * @id 17104
 * @name 余薰
 * @description
 * 我方燃烧烈焰入场时：下次双方角色使用技能后，触发一次燃烧烈焰的回合结束效果。（每回合2次）
 */
define skill {
  id 17104 as LingeringFragrance01;
  skillType passive {
    on enterRelative {
      when :( :e.entity.definition.id === BurningFlame );
      listenTo samePlayer;
      usage perRound, 2 {
        name "usagePerRound1";
      };
      :characterStatus(LingeringFragranceInEffect, "@self");
    }
  }
}

/**
 * @id 17105
 * @name 余薰
 * @description
 * 我方燃烧烈焰入场时：下次双方角色使用技能后，触发1次我方燃烧烈焰的回合结束效果。（每回合2次）
 */
define skill {
  id 17105 as LingeringFragrance02;
  skillType passive;
  reserved;
}

/**
 * @id 1710
 * @name 艾梅莉埃
 * @description
 * 如香消，如雾散。
 */
define character {
  id 1710 as Emilie;
  since "v5.5.0";
  tags dendro, pole, fontaine, ousia;
  health 10;
  energy 2;
  skills ShadowhuntingSpearCustom, FragranceExtraction, AromaticExplication, LingeringFragrance01;
}

/**
 * @id 217101
 * @name 茉洁香迹
 * @description
 * 所附属角色造成的物理伤害变为草元素伤害。
 * 装备有此牌的艾梅莉埃普通攻击后：我方最高等级的「柔灯之匣」立刻行动1次。（每回合1次）
 * （牌组中包含艾梅莉埃，才能加入牌组）
 */
define card {
  id 217101 as MarcotteSillage;
  since "v5.5.0";
  cost DiceType.Dendro, 2;
  talent Emilie, none {
    on modifySkillDamageType {
      when :( :e.type === DamageType.Physical );
      :e.changeDamageType(DamageType.Dendro);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      usage perRound, 1;
      const lumidouceIds = [LumidouceCaseLevel3, LumidouceCaseLevel2, LumidouceCaseLevel1];
      for (const id of lumidouceIds) {
        const lumidouce = :$(`my summons with definition id ${id}`);
        if (lumidouce) {
          :triggerEndPhaseSkill(lumidouce);
          break;
        }
      }
    }
  }
}
