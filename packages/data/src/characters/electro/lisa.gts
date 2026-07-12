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

import { card, character, DamageType, DiceType, skill, status, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 114092
 * @name 蔷薇雷光
 * @description
 * 结束阶段：造成2点雷元素伤害。
 * 可用次数：2
 */
define summon {
  id 114092 as LightningRoseSummon;
  hint DamageType.Electro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 2);
  }
}

/**
 * @id 114091
 * @name 引雷
 * @description
 * 此状态初始具有2层「引雷」；重复附属时，叠加1层「引雷」。「引雷」最多可以叠加到4层。
 * 结束阶段：叠加1层「引雷」。
 * 所附属角色受到苍雷或蔷薇雷光的伤害时：移除此状态，每层「引雷」使此伤害+1。
 */
define status {
  id 114091 as ConductiveLisa;
  variable conductive, 2 {
    append {
    limit 4;
    value 1;
  };
  };
  on endPhase {
    :addVariableWithMax("conductive", 1, 4);
  }
  on increaseDamaged {
    when :( :e.via.definition.id === VioletArc || 
        :e.source.definition.id === LightningRoseSummon );
    :e.increaseDamage(:getVariable("conductive"));
    :dispose();
  }
}

/**
 * @id 14091
 * @name 指尖雷暴
 * @description
 * 造成1点雷元素伤害，并使敌方出战角色附属引雷。
 */
define skill {
  id 14091 as LightningTouch;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Electro, 1);
  :characterStatus(ConductiveLisa, "opp active");
}

/**
 * @id 14092
 * @name 苍雷
 * @description
 * 造成2点雷元素伤害；如果敌方出战角色未附属引雷，则使其附属引雷。
 */
define skill {
  id 14092 as VioletArc;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 2);
  if (!:$(`status with definition id ${ConductiveLisa} at opp active`)) {
    :characterStatus(ConductiveLisa, "opp active");
  }
}

/**
 * @id 14093
 * @name 蔷薇的雷光
 * @description
 * 造成2点雷元素伤害，召唤蔷薇雷光，使敌方出战角色附属引雷。
 */
define skill {
  id 14093 as LightningRose;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 2);
  :summon(LightningRoseSummon);
  :characterStatus(ConductiveLisa, "opp active");
}

/**
 * @id 1409
 * @name 丽莎
 * @description
 * 追寻魔导的奥秘，静待真相的机缘。
 */
define character {
  id 1409 as Lisa;
  since "v4.0.0";
  tags electro, catalyst, mondstadt;
  health 10;
  energy 2;
  skills LightningTouch, VioletArc, LightningRose;
}

/**
 * @id 214091
 * @name 脉冲的魔女
 * @description
 * 切换到装备有此牌的丽莎后：使敌方出战角色附属引雷。（每回合1次）
 * （牌组中包含丽莎，才能加入牌组）
 */
define card {
  id 214091 as PulsatingWitch;
  since "v4.0.0";
  cost DiceType.Electro, 1;
  talent Lisa, none {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.master.id );
      usage perRound, 1;
      :characterStatus(ConductiveLisa, "opp active");
    }
  }
}
