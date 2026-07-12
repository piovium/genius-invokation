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

import { Aura, card, character, combatStatus, DamageType, DiceType, skill } from "@gi-tcg/core/builder";
import { EfficientSwitch } from "../../commons.gts";

/**
 * @id 115121
 * @name 凤缕护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，没有上限）
 */
define combatStatus {
  id 115121 as SwallowwispShield;
  since "v5.8.0";
  shield 1, Infinity;
}

/**
 * @id 15121
 * @name 玄鸾画水
 * @description
 * 造成1点风元素伤害。
 */
define skill {
  id 15121 as BlackPheasantStridesOnWater;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15122
 * @name 凤缕随翦舞
 * @description
 * 生成2层凤缕护盾，获得1层高效切换，并造成1点风元素伤害，如果此技能引发了扩散，则额外生成1层凤缕护盾。
 */
define skill {
  id 15122 as SwallowwispPinionDance;
  skillType elemental;
  cost DiceType.Anemo, 3;
  const aura = :$("opp active")?.aura;
  :combatStatus(SwallowwispShield, "my", {
    overrideVariables: { shield: 2 }
  });
  :combatStatus(EfficientSwitch);
  :damage(DamageType.Anemo, 1);
  switch (aura) {
    case Aura.Cryo:
    case Aura.CryoDendro:
    case Aura.Hydro:
    case Aura.Pyro:
    case Aura.Electro:
      :combatStatus(SwallowwispShield);
      break;
  }
}

/**
 * @id 15123
 * @name 鹍弦踏月出
 * @description
 * 造成3点风元素伤害，生成2层凤缕护盾。
 */
define skill {
  id 15123 as LustrousMoonrise;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 3);
  :combatStatus(SwallowwispShield, "my", {
      overrideVariables: { shield: 2 }
    });
}

/**
 * @id 1512
 * @name 蓝砚
 * @description
 * 巧燕衔枝，欣悦盈门。
 */
define character {
  id 1512 as LanYan;
  since "v5.8.0";
  tags anemo, catalyst, liyue;
  health 10;
  energy 2;
  skills BlackPheasantStridesOnWater, SwallowwispPinionDance, LustrousMoonrise;
}

/**
 * @id 215121
 * @name 舞袂翩兮扬玉霓
 * @description
 * 战斗行动：我方出战角色为蓝砚时，装备此牌。
 * 蓝砚装备此牌后，立刻使用一次凤缕随翦舞。
 * 装备有此牌的蓝砚在场，我方角色进行普通攻击时：获得1层凤缕护盾。（每回合1次）
 * （牌组中包含蓝砚，才能加入牌组）
 */
define card {
  id 215121 as DanceVestmentsBillowLikeRainbowJade;
  since "v5.8.0";
  cost DiceType.Anemo, 3;
  talent LanYan {
    on enter {
      :useSkill(SwallowwispPinionDance);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      listenTo samePlayer;
      usage perRound, 1;
      :combatStatus(SwallowwispShield);
    }
  }
}
