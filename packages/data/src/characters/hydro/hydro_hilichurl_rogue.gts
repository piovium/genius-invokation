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

import { card, character, customEvent, DamageType, DiceType, skill, status, type SkillHandle, type StatusHandle } from "@gi-tcg/core/builder";
import { Frozen } from "../../commons.gts";

/**
 * @id 122052
 * @name 水泡围困
 * @description
 * 角色无法使用技能。（持续到回合结束）
 */
define status {
  id 122052 as MistBubblePrison;
  since "v5.0.0";
  oneDuration;
  tags disableSkill;
}

/**
 * @id 122053
 * @name 水泡封锁（准备中）
 * @description
 * 本角色将在下次行动时，直接使用技能：水泡封锁。
 */
define status {
  id 122053 as MistBubbleLockdownPreparing;
  since "v5.0.0";
  prepare (1220512 as SkillHandle);
  on dispose {
    when :( :e.entity.definition.id === MistBubbleSlime );
    :dispose();
  }
}

/**
 * @id 122051
 * @name 水泡史莱姆
 * @description
 * 特技：水泡战法
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1220511: 水泡战法] (1*Aligned) （需准备1个行动轮）造成1点水元素伤害，敌方出战角色附属水泡围困。
 * [1220512: 水泡封锁] () 造成1点水元素伤害，敌方出战角色附属水泡围困。
 * [1220513: 水泡封锁] () 造成1点水元素伤害，敌方出战角色附属水泡围困。
 */
define card {
  id 122051 as MistBubbleSlime;
  since "v5.0.0";
  undiscoverable;
  technique {
    skill {
      id 1220511;
      cost DiceType.Aligned, 1;
      usage 2 {
        autoDispose false;
      };
      :characterStatus(MistBubbleLockdownPreparing, "@master");
    }
    skill {
      id 1220512;
      prepared;
      :damage(DamageType.Hydro, 1);
      :characterStatus(MistBubblePrison, "opp active");
      if (:getVariable("usage") === 0) {
        :dispose();
      }
    }
    // 切人导致准备中状态消失时，自己如果可用次数耗尽也消失
    on switchActive {
      when :<boolean>{
        const ch = :self.master;
        return ch.id === :e.switchInfo.from?.id &&
          !!ch.hasStatus(MistBubbleLockdownPreparing) &&
          :getVariable("usage") === 0;
      };
      :dispose();
    }
  }
}

/**
 * @id 22051
 * @name 镰刀旋斩
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 22051 as WhirlingScythe;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

export const ShouldGainEnergy = customEvent("hydroHilichurl/shouldGainEnergy");

/**
 * @id 22052
 * @name 狂澜镰击
 * @description
 * 造成3点水元素伤害。
 * 如果有敌方角色附属有冻结或水泡围困，则本角色获得1点充能。（每回合1次）
 */
define skill {
  id 22052 as SlashOfSurgingTides;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 3);
  if (:$(`opp characters has status with definition id ${Frozen} or opp characters has status with definition id ${MistBubblePrison}`)) {
    :emitCustomEvent(ShouldGainEnergy);
  }
}

/**
 * @id 22053
 * @name 浮泡攻势
 * @description
 * 造成4点水元素伤害，生成手牌水泡史莱姆。
 * （装备有水泡史莱姆的角色可以使用特技：水泡战法）
 */
define skill {
  id 22053 as BubblefloatBlitz;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 4);
  :createHandCard(MistBubbleSlime);
}

/**
 * @id 22054
 * @name 狂澜镰击
 * @description
 * 
 */
define skill {
  id 22054 as SlashOfSurgingTidesPassive;
  skillType passive {
    on ShouldGainEnergy {
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :gainEnergy(1, "@self");
    }
  }
}

/**
 * @id 2205
 * @name 丘丘水行游侠
 * @description
 * 不属于任何部族的丘丘人流浪者，如同自我流放一般在荒野中四处漫游。
 */
define character {
  id 2205 as HydroHilichurlRogue;
  since "v5.0.0";
  tags hydro, monster, hilichurl;
  health 11;
  energy 2;
  skills WhirlingScythe, SlashOfSurgingTides, BubblefloatBlitz, SlashOfSurgingTidesPassive;
}

/**
 * @id 222051
 * @name 轻盈水沫
 * @description
 * 战斗行动：我方出战角色为丘丘水行游侠时，装备此牌。
 * 丘丘水行游侠装备此牌后，立刻使用一次狂澜镰击。
 * 装备有此牌的丘丘水行游侠在场，我方使用「特技」时：少花费1个元素骰。（每回合1次）
 * （牌组中包含丘丘水行游侠，才能加入牌组）
 */
define card {
  id 222051 as FeatherweightFoam;
  since "v5.0.0";
  cost DiceType.Hydro, 3;
  talent HydroHilichurlRogue {
    on enter {
      :useSkill(SlashOfSurgingTides);
    }
    on deductOmniDiceSkill {
      when :( :e.isSkillType("technique") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}
