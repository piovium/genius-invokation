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

import { card, character, combatStatus, DamageType, DiceType, skill, status, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113094
 * @name 净焰剑狱之护
 * @description
 * 当净焰剑狱领域在场且迪希雅在我方后台，我方出战角色受到伤害时：抵消1点伤害；然后，如果迪希雅生命值至少为7，则其受到1点穿透伤害。（每回合1次）
 */
define combatStatus {
  id 113094 as FierySanctumsProtection;
  tags barrier;
  on decreaseDamaged {
    when :( :e.target.isActive() &&
        :$(`my standby characters with definition id ${Dehya}`) );
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
}

/**
 * @id 113093
 * @name 净焰剑狱领域
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：3
 * 当此召唤物在场且迪希雅在我方后台，我方出战角色受到伤害时：抵消1点伤害；然后，如果迪希雅生命值至少为7，则对其造成1点穿透伤害。（每回合1次）
 */
define summon {
  id 113093 as FierySanctumField;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Pyro, 1);
  }
  on enter {
    :combatStatus(FierySanctumsProtection);
  }
  on actionPhase {
    :combatStatus(FierySanctumsProtection);
  }
  on selfDispose {
    :$(`my combat status with definition id ${FierySanctumsProtection}`)?.dispose();
  }
}

/**
 * @id 113091
 * @name 炽炎狮子·炽鬃拳
 * @description
 * 本角色将在下次行动时，直接使用技能：炽鬃拳。
 */
define status {
  id 113091 as BlazingLionessFlamemanesFist;
  reserved;
}

/**
 * @id 13095
 * @name 焚落踢
 * @description
 * 造成3点火元素伤害。
 */
define skill {
  id 13095 as IncinerationDrive;
  skillType burst;
  prepared;
  :damage(DamageType.Pyro, 3);
}

/**
 * @id 113092
 * @name 炽炎狮子·焚落踢
 * @description
 * 本角色将在下次行动时，直接使用技能：焚落踢。
 */
define status {
  id 113092 as BlazingLionessIncinerationDrive;
  prepare IncinerationDrive;
}

/**
 * @id 13091
 * @name 拂金剑斗术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13091 as SandstormAssault;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13092
 * @name 熔铁流狱
 * @description
 * 召唤净焰剑狱领域；如果已存在净焰剑狱领域，就先造成1点火元素伤害。
 */
define skill {
  id 13092 as MoltenInferno;
  skillType elemental;
  cost DiceType.Pyro, 3;
  if (:$(`my summon with definition id ${FierySanctumField}`)) {
    :damage(DamageType.Pyro, 1);
  }
  :summon(FierySanctumField);
}

/**
 * @id 13093
 * @name 炎啸狮子咬
 * @description
 * 造成3点火元素伤害，然后准备技能：焚落踢。
 */
define skill {
  id 13093 as LeonineBite;
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :characterStatus(BlazingLionessIncinerationDrive);
}

/**
 * @id 13096
 * @name 净焰剑狱·赤鬃之血
 * @description
 * 
 */
define skill {
  id 13096 as FierySanctumRedmanesBlood;
  skillType passive {
    on damaged {
      when :( :e.target.id !== :self.id );
      listenTo samePlayer;
      const protection = :$(`my combat status with definition id ${FierySanctumsProtection}`);
      if (protection?.getVariable("usage") === 0) {
        protection.dispose();
        if (:self.health >= 7) {
          :damage(DamageType.Piercing, 1, "@self");
        }
      }
    }
  }
}

/**
 * @id 1309
 * @name 迪希雅
 * @description
 * 鹫鸟的眼睛，狮子的灵魂，沙漠自由的女儿。
 */
define character {
  id 1309 as Dehya;
  since "v4.1.0";
  tags pyro, claymore, sumeru, eremite;
  health 10;
  energy 2;
  skills SandstormAssault, MoltenInferno, LeonineBite, IncinerationDrive, FierySanctumRedmanesBlood;
}

/**
 * @id 213091
 * @name 崇诚之真
 * @description
 * 战斗行动：我方出战角色为迪希雅时，装备此牌。
 * 迪希雅装备此牌后，立刻使用一次熔铁流狱。
 * 结束阶段：如果装备有此牌的迪希雅生命值不多于6，则治疗该角色2点。
 * （牌组中包含迪希雅，才能加入牌组）
 */
define card {
  id 213091 as StalwartAndTrue;
  since "v4.1.0";
  cost DiceType.Pyro, 4;
  talent Dehya {
    on enter {
      :useSkill(MoltenInferno);
    }
    on endPhase {
      when :( :self.master.health <= 6 );
      :heal(2, "@master");
    }
  }
}
