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

import { card, character, DamageType, DiceType, skill, status, summon, type StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 112062
 * @name 清净之园囿
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2
 * 此召唤物在场时：我方角色「普通攻击」造成的伤害+1。
 */
define summon {
  id 112062 as GardenOfPurity;
  hint DamageType.Hydro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 2);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
}

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
define status {
  id 112061 as TakimeguriKanka;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 3;
    :e.increaseDamage(1);
    const talent = :self.master.hasEquipment(KyoukaFuushi);
    if (talent) {
      talent.setVariable("skillIsUsedWithKanka", 1);
    }
  }
}

/**
 * @id 12061
 * @name 神里流·转
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12061 as KamisatoArtMarobashi;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12062
 * @name 神里流·镜花
 * @description
 * 造成2点水元素伤害，本角色附属泷廻鉴花。
 */
define skill {
  id 12062 as KamisatoArtKyouka;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 2);
  :characterStatus(TakimeguriKanka);
}

/**
 * @id 12063
 * @name 神里流·水囿
 * @description
 * 造成1点水元素伤害，召唤清净之园囿。
 */
define skill {
  id 12063 as KamisatoArtSuiyuu;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 1);
  :summon(GardenOfPurity);
}

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
define character {
  id 1206 as KamisatoAyato;
  since "v3.6.0";
  tags hydro, sword, inazuma;
  health 11;
  energy 2;
  skills KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu;
}

/**
 * @id 212062
 * @name 镜华风姿（生效中）
 * @description
 * 本回合中，所附属角色下次「普通攻击」少花费2个无色元素。
 */
define status {
  id 212062 as KyoukaFuushiInEffect;
  oneDuration;
  once deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(2);
    const talent = :self.master.hasEquipment(KyoukaFuushi);
    if (talent) {
      talent.setVariable("deductEffectHasBeenTriggeredFromThisCard", 1);
    }
  }
}

/**
 * @id 212061
 * @name 镜华风姿
 * @description
 * 战斗行动：我方出战角色为神里绫人时，装备此牌。
 * 神里绫人装备此牌后，立刻使用一次神里流·镜花。
 * 附属有泷廻鉴花的神里绫人「普通攻击」后：所附属角色本回合中下次「普通攻击」少花费2个无色元素。（该次普通攻击不会重复触发此卡牌的效果）
 * （牌组中包含神里绫人，才能加入牌组）
 */
define card {
  id 212061 as KyoukaFuushi;
  since "v3.6.0";
  cost DiceType.Hydro, 3;
  talent KamisatoAyato {
    variable deductEffectHasBeenTriggeredFromThisCard, 0;
    variable skillIsUsedWithKanka, 0;
    on enter {
      :useSkill(KamisatoArtKyouka);
    }
    on useSkill {
      when :( :e.isSkillType("normal") );
      if (:getVariable("skillIsUsedWithKanka") && !:getVariable("deductEffectHasBeenTriggeredFromThisCard")) {
        :characterStatus(KyoukaFuushiInEffect, "@master");
      }
      :setVariable("deductEffectHasBeenTriggeredFromThisCard", 0);
      :setVariable("skillIsUsedWithKanka", 0);
    }
  }
}
