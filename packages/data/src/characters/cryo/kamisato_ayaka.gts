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

import { character, skill, summon, status, card, DamageType, type PassiveSkillHandle, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 111051
 * @name 霜见雪关扉
 * @description
 * 结束阶段：造成2点冰元素伤害。
 * 可用次数：2
 */
define summon {
  id 111051 as FrostflakeSekiNoTo;
  hint DamageType.Cryo, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 2);
  }
}

/**
 * @id 111053
 * @name 冰元素附魔
 * @description
 * 所附属角色造成的物理伤害变为冰元素伤害，且角色造成的冰元素伤害+1。
 * （持续到回合结束）
 */
define status {
  id 111053 as CryoElementalInfusion01;
  conflictWith 111052;
  oneDuration;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Cryo);
  }
  on increaseSkillDamage {
    when :( :e.type === DamageType.Cryo );
    :e.increaseDamage(1);
  }
}

/**
 * @id 111052
 * @name 冰元素附魔
 * @description
 * 所附属角色造成的物理伤害变为冰元素伤害。
 * （持续到回合结束）
 */
define status {
  id 111052 as CryoElementalInfusion;
  conflictWith 111053;
  oneDuration;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Cryo);
  }
}

/**
 * @id 111054
 * @name 神里流·霰步
 * @description
 * 本回合内，所附属角色下次「普通攻击」造成的伤害+1。
 */
define status {
  id 111054 as KamisatoArtSenhoStatus;
  since "v6.0.0";
  oneDuration;
  once increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
}


/**
 * @id 11051
 * @name 神里流·倾
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11051 as KamisatoArtKabuki;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11052
 * @name 神里流·冰华
 * @description
 * 造成3点冰元素伤害。
 */
define skill {
  id 11052 as KamisatoArtHyouka;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
}

/**
 * @id 11053
 * @name 神里流·霜灭
 * @description
 * 造成4点冰元素伤害，召唤霜见雪关扉。
 */
define skill {
  id 11053 as KamisatoArtSoumetsu;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Cryo, 4);
  :summon(FrostflakeSekiNoTo);
}

/**
 * @id 11054
 * @name 神里流·霰步
 * @description
 * 【被动】此角色被切换为「出战角色」时，附属冰元素附魔，本回合下次「普通攻击」造成的伤害+1。（每回合2次）。
 */
define skill {
  id 11054 as KamisatoArtSenho01;
  skillType passive {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.id );
      if (:self.hasEquipment(KantenSenmyouBlessing)) {
        :characterStatus(CryoElementalInfusion01);
      }
      else {
        :characterStatus(CryoElementalInfusion);
      }
    }
  }
}

/**
 * @id 11055
 * @name 神里流·霰步
 * @description
 * 【被动】此角色被切换为「出战角色」时，附属冰元素附魔，本回合下次「普通攻击」造成的伤害+1。（每回合2次）。
 */
define skill {
  id 11055 as KamisatoArtSenho02;
  skillType passive {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.id );
      usage perRound, 2 {
        name "usagePerRound1";
      };
      :characterStatus(KamisatoArtSenhoStatus);
      :addVariable("usagePerRound1", -1);
    }
  }
}

/**
 * @id 1105
 * @name 神里绫华
 * @description
 * 如霜凝华，如鹭在庭。
 */
define character {
  id 1105 as KamisatoAyaka;
  since "v3.3.0";
  tags cryo, sword, inazuma;
  health 10;
  energy 3;
  skills KamisatoArtKabuki, KamisatoArtHyouka, KamisatoArtSoumetsu, KamisatoArtSenho01, KamisatoArtSenho02;
}

/**
 * @id 211051
 * @name 寒天宣命祝词
 * @description
 * 装备有此牌的神里绫华生成的冰元素附魔会使所附属角色造成的冰元素伤害+1。
 * 切换到装备有此牌的神里绫华时：少花费1个元素骰。（每回合1次）
 * （牌组中包含神里绫华，才能加入牌组）
 */
define card {
  id 211051 as KantenSenmyouBlessing;
  since "v3.3.0";
  cost DiceType.Cryo, 2;
  talent KamisatoAyaka, none {
    on deductOmniDiceSwitch {
      when :( :e.action.to.id === :self.master.id );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}
