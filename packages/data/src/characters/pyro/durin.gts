// Copyright (C) 2026 Piovium Labs
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

import { DiceType, DamageType, $ } from "@gi-tcg/core/data";
import { EfficientSwitch } from "../../commons.gts";

/**
 * @id 113175
 * @name 精质转变
 * @description
 * 所附属角色下次使用「普通攻击」后：造成1点火元素伤害。
 * 所附属角色下次使用「元素战技」后：生成1层高效切换。
 */
define status {
  id 113175 as EssentialTransmutation;
  since "v7.0.0";
  once useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Pyro, 1);
  };
}

/**
 * @id 113171
 * @name 白化之是
 * @description
 * 我方角色使用技能后：造成1点火元素伤害。
 * 可用次数：4
 */
define combatStatus {
  id 113171 as ConfirmationOfPurity;
  since "v7.0.0";
  on useSkill {
    when :( :e.skill.definition.id !== PrincipleOfPurityAsTheLightShifts );
    usage 4;
    :damage(DamageType.Pyro, 1);
  };
}

/**
 * @id 113172
 * @name 黑度之否
 * @description
 * 我方宣布结束时：造成3点火元素伤害。
 * 可用次数：1
 */
define combatStatus {
  id 113172 as DenialOfDarkness;
  since "v7.0.0";
  on declareEnd {
    usage 1;
    :damage(DamageType.Pyro, 3);
  };
}

/**
 * @id 113173
 * @name 白焰之龙（生效中）
 * @description
 * 我方造成的伤害+1。
 * 可用次数：4
 */
define combatStatus {
  id 113173 as DragonOfWhiteFlameInEffect;
  since "v7.0.0";
  on increaseDamage {
    usage 4;
    :e.increaseDamage(1);
  };
}

/**
 * @id 113174
 * @name 黑蚀之龙（生效中）
 * @description
 * 我方杜林与黑度之否造成的伤害+2。
 */
define combatStatus {
  id 113174 as DragonOfDarkDecayInEffect;
  since "v7.0.0";
  on increaseDamage {
    when :(
      ([DurinWhite, DurinBlack, DenialOfDarkness] as number[]).includes(
        :e.source.definition.id,
      )
    );
    :e.increaseDamage(2);
  };
}

/**
 * @id 13171
 * @name 芒焰之翼斩
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13171 as RadiantWingslash;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);

}

/**
 * @id 13172
 * @name 二元式·聚分熔炼
 * @description
 * 造成3点火元素伤害，自身附属精质转变。
 */
define skill {
  id 13172 as BinaryFormConvergenceAndDivision;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  if (:self.hasStatus(EssentialTransmutation)) {
    :combatStatus(EfficientSwitch);
    :dispose(:query($.my.typeStatus.def(EssentialTransmutation)));
  }
  :characterStatus(EssentialTransmutation, :self);
}

/**
 * @id 13173
 * @name 白化法·如光流变
 * @description
 * 造成1点火元素伤害，生成白化之是。
 */
define skill {
  id 13173 as PrincipleOfPurityAsTheLightShifts;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 1);
  :combatStatus(ConfirmationOfPurity);
}

/**
 * @id 13175
 * @name 光灵遵神数显现
 * @description
 * 【被动】自身使用「普通攻击」后：将自身「元素爆发」切换为黑度法·如星阴燃。
 * 自身使用「元素战技」后：将自身「元素爆发」切换为白化法·如光流变。
 */
define skill {
  id 13175 as LightManifestOfTheDivineCalculus;
  skillType passive {
    on useSkill {
      when :( :e.isSkillType("normal") && :self.definition.id === DurinWhite );
      :transformDefinition(:self, DurinBlack);
    };
    on useSkill {
      when :(
        :e.isSkillType("elemental") && :self.definition.id === DurinBlack
      );
      :transformDefinition(:self, DurinWhite);
    };
  };
}

/**
 * @id 1317
 * @name 杜林
 * @description
 * 启自笔下，翱于星间。
 */
define character {
  id 1317 as DurinWhite;
  since "v7.0.0";
  tags pyro, sword, mondstadt;
  health 10;
  energy 2;
  skills RadiantWingslash, BinaryFormConvergenceAndDivision, PrincipleOfPurityAsTheLightShifts, LightManifestOfTheDivineCalculus;
}

/**
 * @id 213171
 * @name 红土之逆
 * @description
 * 战斗行动：我方出战角色为杜林时，装备此牌。
 * 杜林装备此牌后，根据自身当前「元素爆发」立刻使用一次白化法·如光流变或黑度法·如星阴燃。
 * 所附属角色使用白化法·如光流变后：我方下4次造成的伤害+1。
 * 所附属角色使用黑度法·如星阴燃后：我方杜林与黑度之否造成的伤害+2。
 * （牌组中包含杜林，才能加入牌组）
 */
define card {
  id 213171 as AdamahsRedemption;
  since "v7.0.0";
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  talent [DurinWhite, DurinBlack] {
    on staged {
      if (:e.targets[0].definition.id === DurinWhite) {
        :useSkill(PrincipleOfPurityAsTheLightShifts);
      } else if (:e.targets[0].definition.id === DurinBlack) {
        :useSkill(PrincipleOfDarknessAsTheStarsSmolder);
      }
    };
    on useSkill {
      when :( :e.skill.definition.id === PrincipleOfPurityAsTheLightShifts );
      :combatStatus(DragonOfWhiteFlameInEffect);
    };
    on useSkill {
      when :( :e.skill.definition.id === PrincipleOfDarknessAsTheStarsSmolder );
      :combatStatus(DragonOfDarkDecayInEffect);
    };
  };
}

/**
 * @id 13174
 * @name 黑度法·如星阴燃
 * @description
 * 造成3点火元素伤害，生成黑度之否。
 */
define skill {
  id 13174 as PrincipleOfDarknessAsTheStarsSmolder;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :combatStatus(DenialOfDarkness);
}

/**
 * @id 6606
 * @name 杜林
 * @description
 * 
 */
define character {
  id 6606 as DurinBlack;
  since "v7.0.0";
  tags pyro, sword, mondstadt;
  health 10;
  energy 2;
  skills RadiantWingslash, BinaryFormConvergenceAndDivision, PrincipleOfDarknessAsTheStarsSmolder, LightManifestOfTheDivineCalculus;
}
