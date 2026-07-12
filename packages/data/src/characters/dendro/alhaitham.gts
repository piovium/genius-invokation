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
 * @id 117061
 * @name 琢光镜
 * @description
 * 角色造成的物理伤害变为草元素伤害。
 * 角色普通攻击后：造成1点草元素伤害。如果此技能为重击，则使此状态的持续回合+1。
 * 持续回合：2（可叠加，最多叠加到3回合）
 */
define status {
  id 117061 as ChisellightMirror;
  duration 2 {
    append {
    limit 3;
  };
  };
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Dendro);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Dendro, 1);
  }
  on useSkill {
    when :( :e.isChargedAttack() );
    :addVariable("duration", 1);
  }
}

/**
 * @id 17061
 * @name 溯因反绎法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17061 as AbductiveReasoning;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17062
 * @name 共相·理式摹写
 * @description
 * 造成2点草元素伤害，本角色附属琢光镜。
 */
define skill {
  id 17062 as UniversalityAnElaborationOnForm;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 2);
  :characterStatus(ChisellightMirror);
}

/**
 * @id 17063
 * @name 殊境·显象缚结
 * @description
 * 造成4点草元素伤害；消耗琢光镜，此伤害提升所消耗琢光镜的持续回合值。
 * 如果消耗琢光镜的持续回合为0/1/2，则为角色附属持续回合为3/2/1的琢光镜。
 */
define skill {
  id 17063 as ParticularFieldFettersOfPhenomena;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  const mirror = :self.hasStatus(ChisellightMirror);
  const duration = mirror ? :getVariable("duration", mirror) : 0 ;
  const damageValue = 4 + duration;
  if (mirror) {
    :dispose(mirror);
  }
  :damage(DamageType.Dendro, damageValue);
  if (duration >= 1 && :self.hasEquipment(Structuration)) {
    :self.addStatus(ChisellightMirror, {
      overrideVariables: {
        duration: 3
      }
    });
    :drawCards(1);
  } else if (duration < 3){
      :self.addStatus(ChisellightMirror, {
        overrideVariables: {
          duration: 3 - duration
        }
      });
    }
}

/**
 * @id 1706
 * @name 艾尔海森
 * @description
 * 学识、思考及处事之道。
 */
define character {
  id 1706 as Alhaitham;
  since "v4.3.0";
  tags dendro, sword, sumeru;
  health 10;
  energy 2;
  skills AbductiveReasoning, UniversalityAnElaborationOnForm, ParticularFieldFettersOfPhenomena;
}

/**
 * @id 217061
 * @name 正理
 * @description
 * 战斗行动：我方出战角色为艾尔海森时，装备此牌。
 * 艾尔海森装备此牌后，立刻使用一次殊境·显象缚结。
 * 装备有此牌的艾尔海森使用殊境·显象缚结时：如果消耗了持续回合至少为1的琢光镜，则总是附属持续回合为3的琢光镜，并且抓1张牌。
 * （牌组中包含艾尔海森，才能加入牌组）
 */
define card {
  id 217061 as Structuration;
  since "v4.3.0";
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  talent Alhaitham {
    on enter {
      :useSkill(ParticularFieldFettersOfPhenomena);
    }
  }
}
