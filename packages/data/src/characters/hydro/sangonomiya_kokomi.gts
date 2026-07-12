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

import { card, character, DamageType, DiceType, skill, status, summon, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 112051
 * @name 化海月
 * @description
 * 结束阶段：造成1点水元素伤害，治疗我方出战角色1点。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
define summon {
  id 112051 as BakeKurage;
  hint DamageType.Hydro, "1";
  on endPhase {
    usage 2 {
      append 4;
    };
    if (:$(`my equipment with definition id ${TamakushiCasket}`) && :$(`my status with definition id ${CeremonialGarment}`)) {
      :damage(DamageType.Hydro, 2);
    }
    else {
      :damage(DamageType.Hydro, 1);
    }
    :heal(1, "my active");
  }
}

/**
 * @id 112052
 * @name 仪来羽衣
 * @description
 * 所附属角色普通攻击造成的伤害+1。
 * 所附属角色普通攻击后：治疗所有我方角色1点。
 * 持续回合：2
 */
define status {
  id 112052 as CeremonialGarment;
  duration 2;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :heal(1, "all my characters");
  }
}

/**
 * @id 12051
 * @name 水有常形
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 12051 as TheShapeOfWater;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 12052
 * @name 海月之誓
 * @description
 * 本角色附着水元素，召唤化海月。
 */
define skill {
  id 12052 as KuragesOath;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :apply(DamageType.Hydro, "@self");
  :summon(BakeKurage);
}

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成2点水元素伤害，治疗所有我方角色1点，本角色附属仪来羽衣。
 */
define skill {
  id 12053 as NereidsAscension;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :heal(1, "all my characters");
  :characterStatus(CeremonialGarment);
  if (:self.hasEquipment(TamakushiCasket)) {
    let summon = :$(`my summon with definition id ${BakeKurage}`);
    if (summon) {
      summon.addVariable("usage", 1);
    } else {
      summon = :createEntity("summon", BakeKurage)!;
      summon.setVariable("usage", 1);
    }
  }
}

/**
 * @id 1205
 * @name 珊瑚宫心海
 * @description
 * 未雨绸缪，临危莫乱。
 */
define character {
  id 1205 as SangonomiyaKokomi;
  since "v3.5.0";
  tags hydro, catalyst, inazuma;
  health 12;
  energy 2;
  skills TheShapeOfWater, KuragesOath, NereidsAscension;
}

/**
 * @id 212051
 * @name 匣中玉栉
 * @description
 * 战斗行动：我方出战角色为珊瑚宫心海时，装备此牌。
 * 珊瑚宫心海装备此牌后，立刻使用一次海人化羽。
 * 装备有此牌的珊瑚宫心海使用海人化羽时：召唤一个可用次数为1的化海月；如果化海月已在场，则改为使其可用次数+1。
 * 仪来羽衣存在期间，化海月造成的伤害+1。
 * （牌组中包含珊瑚宫心海，才能加入牌组）
 */
define card {
  id 212051 as TamakushiCasket;
  since "v3.5.0";
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  talent SangonomiyaKokomi {
    on enter {
      :useSkill(NereidsAscension);
    }
  }
}
