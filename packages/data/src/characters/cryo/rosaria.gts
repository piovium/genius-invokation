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

import { card, character, combatStatus, DamageType, DiceType, skill, summon } from "@gi-tcg/core/builder";
import { ChangingShifts } from "../../cards/event/other.gts";

/**
 * @id 111133
 * @name 强攻破绽
 * @description
 * 我方造成技能伤害时：移除此状态，使本次伤害加倍。
 */
define combatStatus {
  id 111133 as StrikeWhereItHurts;
  since "v5.2.0";
  on multiplySkillDamage {
    :e.multiplyDamage(2);
    :dispose();
  }
}

/**
 * @id 111131
 * @name 洞察破绽
 * @description
 * 我方角色使用技能后：此效果每有1层，就有10%的概率生成强攻破绽。如果生成了强攻破绽，就使此效果层数减半。（向下取整）
 */
define combatStatus {
  id 111131 as ScopeOutSoftSpots;
  since "v5.2.0";
  variable layer, 0 {
    append;
  };
  on useSkill {
    const layer = :getVariable("layer");
    const buf = Array.from({ length: 10 }, (_, i) => i < layer);
    const take = :random(buf);
    if (take) {
      :combatStatus(StrikeWhereItHurts);
      const newLayer = Math.floor(layer / 2);
      if (newLayer > 0) {
        :setVariable("layer", newLayer);
      } else {
        :dispose();
      }
    }
  }
}

/**
 * @id 111132
 * @name 极寒的冰枪
 * @description
 * 结束阶段：造成1点冰元素伤害，生成2层洞察破绽。
 * 可用次数：2
 */
define summon {
  id 111132 as EvercoldFrostlance;
  since "v5.2.0";
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
    :combatStatus(ScopeOutSoftSpots, "my", {
        overrideVariables: {
          layer: 2
        }
      });
  }
}

/**
 * @id 11131
 * @name 教会枪术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11131 as SpearOfTheChurch;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11132
 * @name 噬罪的告解
 * @description
 * 造成1点冰元素伤害，生成1层洞察破绽。（触发洞察破绽的效果时，会生成强攻破绽。）
 */
define skill {
  id 11132 as RavagingConfession;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :combatStatus(ScopeOutSoftSpots, "my", {
      overrideVariables: {
        layer: 1
      }
    });
}

/**
 * @id 11133
 * @name 终命的圣礼
 * @description
 * 造成1点冰元素伤害，生成2层洞察破绽，召唤极寒的冰枪。
 */
define skill {
  id 11133 as RitesOfTermination;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 1);
  :combatStatus(ScopeOutSoftSpots, "my", {
      overrideVariables: {
        layer: 2
      }
    });
  :summon(EvercoldFrostlance);
}

/**
 * @id 1113
 * @name 罗莎莉亚
 * @description
 * 「黑影源于光明，光明却不统御黑影。」
 */
define character {
  id 1113 as Rosaria;
  since "v5.2.0";
  tags cryo, pole, mondstadt;
  health 10;
  energy 2;
  skills SpearOfTheChurch, RavagingConfession, RitesOfTermination;
}

/**
 * @id 211131
 * @name 代行裁判
 * @description
 * 战斗行动：我方出战角色为罗莎莉亚时，装备此牌。
 * 罗莎莉亚装备此牌后，立刻使用一次噬罪的告解。
 * 装备有此牌的罗莎莉亚在场时：使用噬罪的告解，或我方生成强攻破绽后，在手牌中生成1张换班时间。（每回合1次）
 * （牌组中包含罗莎莉亚，才能加入牌组）
 */
define card {
  id 211131 as DivineRetribution;
  since "v5.2.0";
  cost DiceType.Cryo, 3;
  talent Rosaria {
    on enter {
      :useSkill(RavagingConfession);
    }
    on useSkill {
      when :( :e.skill.definition.id === RavagingConfession );
      :createHandCard(ChangingShifts);
    }
    on enterRelative {
      when :( :e.entity.id === StrikeWhereItHurts );
      listenTo samePlayer;
      :createHandCard(ChangingShifts);
    }
  }
}
