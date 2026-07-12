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

import { character, skill, status, combatStatus, card, DamageType, DiceType, type CardHandle } from "@gi-tcg/core/builder";

/**
 * @id 116071
 * @name 旋云护盾
 * @description
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
define status {
  id 116071 as ShieldOfSwirlingClouds;
  shield 2;
}

/**
 * @id 16074
 * @name 长枪开相
 * @description
 * 造成2点岩元素伤害；如果本回合中我方舍弃或调和过至少1张牌，则此伤害+1。
 */
define skill {
  id 16074 as SpearFlourish;
  skillType elemental;
  prepared;
  :$(`status with definition id ${ShieldOfSwirlingClouds} at @self`)?.dispose();
  if (:self.getVariable("disposeOrTuneCardCount") > 0) {
    :damage(DamageType.Geo, 3);
  }
  else {
    :damage(DamageType.Geo, 2);
  }
}

/**
 * @id 116072
 * @name 长枪开相
 * @description
 * 本角色将在下次行动时，直接使用技能：长枪开相。
 */
define status {
  id 116072 as SpearFlourishStatus;
  prepare SpearFlourish;
}

/**
 * @id 116073
 * @name 飞云旗阵
 * @description
 * 我方角色进行普通攻击时：如果我方手牌数量不多于1，则此技能少花费1个元素骰。
 * 可用次数：1（可叠加，最多叠加到4次）
 */
define combatStatus {
  id 116073 as FlyingCloudFlagFormation;
  on deductOmniDiceSkill {
    when :( :e.isSkillType("normal") && :player.hands.length <= 1 );
    :e.deductOmniCost(1);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") && :player.hands.length <= 1 );
    usage 1 {
      append 4;
    };
    if (:$(`my equipment with definition id ${DecorousHarmony}`) && // 装备了天赋
        :player.hands.length === 0) {
      :e.increaseDamage(2);
    }
  }
}

/**
 * @id 16071
 * @name 拂云出手
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16071 as CloudgrazingStrike;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16072
 * @name 旋云开相
 * @description
 * 生成飞云旗阵，本角色附属旋云护盾并准备技能：长枪开相。
 */
define skill {
  id 16072 as OpeningFlourish;
  skillType elemental;
  cost DiceType.Geo, 3;
  :combatStatus(FlyingCloudFlagFormation);
  :characterStatus(SpearFlourishStatus);
  :characterStatus(ShieldOfSwirlingClouds);
}

/**
 * @id 16073
 * @name 破嶂见旌仪
 * @description
 * 造成3点岩元素伤害，生成3层飞云旗阵。
 */
define skill {
  id 16073 as CliffbreakersBanner;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 3);
  :combatStatus(FlyingCloudFlagFormation, "my", {
      overrideVariables: { usage: 3 }
    });
}

/**
 * @id 16075
 * @name 
 * @description
 * 
 */
define skill {
  id 16075 as CountDisposeOrTune;
  skillType passive {
    variable disposeOrTuneCardCount, 0;
    on disposeOrTuneCard {
      :addVariable("disposeOrTuneCardCount", 1);
    }
    on roundEnd {
      :setVariable("disposeOrTuneCardCount", 0);
    }
  }
}

/**
 * @id 1607
 * @name 云堇
 * @description
 * 红毹婵娟，庄谐并举。
 */
define character {
  id 1607 as YunJin;
  since "v4.7.0";
  tags geo, pole, liyue;
  health 10;
  energy 2;
  skills CloudgrazingStrike, OpeningFlourish, CliffbreakersBanner, SpearFlourish, CountDisposeOrTune;
}

/**
 * @id 216071
 * @name 庄谐并举
 * @description
 * 战斗行动：我方出战角色为云堇时，装备此牌。
 * 云堇装备此牌后，立刻使用一次破嶂见旌仪。
 * 装备有此牌的云堇在场，且我方触发飞云旗阵时：如果我方没有手牌，则使此次技能伤害+2。
 * （牌组中包含云堇，才能加入牌组）
 */
define card {
  id 216071 as DecorousHarmony;
  since "v4.7.0";
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  talent YunJin {
    on enter {
      :useSkill(CliffbreakersBanner);
    }
  }
}
