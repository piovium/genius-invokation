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

import { character, skill, summon, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 114071
 * @name 雷罚恶曜之眼
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：3
 * 此召唤物在场时：我方角色「元素爆发」造成的伤害+1。
 */
define summon {
  id 114071 as EyeOfStormyJudgment;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Electro, 1);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("burst") );
    :e.increaseDamage(1);
  }
}

/**
 * @id 114072
 * @name 诸愿百眼之轮
 * @description
 * 其他我方角色使用「元素爆发」后：累积1点「愿力」。（最多累积3点）
 * 所附属角色使用奥义·梦想真说时：消耗所有「愿力」，每点「愿力」使造成的伤害+1。
 */
define status {
  id 114072 as ChakraDesiderataStatus;
  variable chakra, 0;
  on useSkill {
    when :( :e.isSkillType("burst") && :e.skill.caller.id !== :self.master.id )
    listenTo samePlayer;
    :addVariableWithMax("chakra", 1, 3);
  }
  on increaseSkillDamage {
    when :( :e.via.definition.id === SecretArtMusouShinsetsu );
    const currentVal = :getVariable("chakra");
    if (:self.master.hasEquipment(WishesUnnumbered)) {
      :e.increaseDamage(currentVal * 2);
    } else {
      :e.increaseDamage(currentVal);
    }
    :setVariable("chakra", 0);
  }
}

/**
 * @id 14071
 * @name 源流
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14071 as Origin;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14072
 * @name 神变·恶曜开眼
 * @description
 * 召唤雷罚恶曜之眼。
 */
define skill {
  id 14072 as TranscendenceBalefulOmen;
  skillType elemental;
  cost DiceType.Electro, 3;
  :summon(EyeOfStormyJudgment);
}

/**
 * @id 14073
 * @name 奥义·梦想真说
 * @description
 * 造成3点雷元素伤害，其他我方角色获得2点充能。
 */
define skill {
  id 14073 as SecretArtMusouShinsetsu;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 3);
  :gainEnergy(2, "all my characters and not @self");
}

/**
 * @id 14074
 * @name 诸愿百眼之轮
 * @description
 * 【被动】战斗开始时，初始附属诸愿百眼之轮。
 */
define skill {
  id 14074 as ChakraDesiderata;
  skillType passive {
    on battleBegin {
      :characterStatus(ChakraDesiderataStatus)
    }
    on revive {
      :characterStatus(ChakraDesiderataStatus)
    }
  }
}

/**
 * @id 1407
 * @name 雷电将军
 * @description
 * 鸣雷寂灭，浮世泡影。
 */
define character {
  id 1407 as RaidenShogun;
  since "v3.7.0";
  tags electro, pole, inazuma;
  health 10;
  energy 2;
  skills Origin, TranscendenceBalefulOmen, SecretArtMusouShinsetsu, ChakraDesiderata;
}

/**
 * @id 214071
 * @name 万千的愿望
 * @description
 * 战斗行动：我方出战角色为雷电将军时，装备此牌。
 * 雷电将军装备此牌后，立刻使用一次奥义·梦想真说。
 * 装备有此牌的雷电将军使用奥义·梦想真说时：每消耗1点「愿力」，都使造成的伤害额外+1。
 * （牌组中包含雷电将军，才能加入牌组）
 */
define card {
  id 214071 as WishesUnnumbered;
  since "v3.7.0";
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  talent RaidenShogun {
    on enter {
      :useSkill(SecretArtMusouShinsetsu);
    }
  }
}
