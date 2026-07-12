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

import { card, character, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 127030
 * @name 增殖生命体·活跃
 * @description
 * 回合开始时：舍弃1张唤醒眷属，治疗该角色1点生命值。
 */
const ProliferatedOrganismAnimated = void 0; // PVE 从阿佩普那边挤过来的编号

/**
 * @id 127031
 * @name 增殖生命体·暴走
 * @description
 * 回合开始时：舍弃1张唤醒眷属，治疗该角色1点生命值，生成1张唤醒眷属，随机置入我方牌库。
 */
const ProliferatedOrganismBerserk = void 0; // PVE 从阿佩普那边挤过来的编号

/**
 * @id 127033
 * @name 灵蛇祝福
 * @description
 * 我方使用厄灵·草之灵蛇的特技时：此特技造成的伤害+1，并且不消耗厄灵·草之灵蛇的可用次数。
 * 可用次数：1（可叠加，没有上限）
 */
define combatStatus {
  id 127033 as SpiritserpentsBlessing;
  since "v5.1.0";
  on increaseTechniqueDamage {
    when :( :e.via.definition.id === 1230311 );
    usage 1 {
      append;
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 127032
 * @name 厄灵·草之灵蛇
 * @description
 * 特技：藤蔓锋鳞
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [1270321: 藤蔓锋鳞] (1*Aligned, 1*Energy) 造成1点草元素伤害。
 * [2270312: ] ()
 */
define card {
  id 127032 as SpiritOfOmenDendroSpiritserpent;
  since "v5.1.0";
  undiscoverable;
  technique {
    skill {
      id 1270321;
      cost DiceType.Aligned, 1;
      cost DiceType.Energy, 1;
      usage 2 {
        autoDecrease false;
      };
      :damage(DamageType.Dendro, 1);
      if (!:$(`my combat status with definition id ${SpiritserpentsBlessing}`)) {
        :consumeUsage(1);
      }
    }
  }
}

/**
 * @id 27031
 * @name 叶轮轻扫
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 27031 as FloralringCaress;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 27032
 * @name 蔓延旋舞
 * @description
 * 造成3点草元素伤害，生成1层灵蛇祝福。
 */
define skill {
  id 27032 as SpiralingWhirl;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 3);
  :combatStatus(SpiritserpentsBlessing);
}

/**
 * @id 27033
 * @name 厄灵苏醒·草之灵蛇
 * @description
 * 造成4点草元素伤害。整场牌局限制1次，将1张厄灵·草之灵蛇加入我方手牌。
 * （装备有厄灵·草之灵蛇的角色可以使用特技：藤蔓锋鳞）
 */
define skill {
  id 27033 as SpiritOfOmensAwakeningDendroSpiritserpent;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 4);
}

/**
 * @id 27034
 * @name 厄灵之能
 * @description
 * 【被动】此角色受到伤害后：如果此角色生命值不多于7，则获得1点充能。（每回合1次）
 */
define skill {
  id 27034 as SpiritOfOmensPower;
  skillType passive {
    on damaged {
      when :( :self.health <= 7 );
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :gainEnergy(1, "@self");
    }
    on useSkill {
      when :( :e.skill.definition.id === SpiritOfOmensAwakeningDendroSpiritserpent );
      usage 1 {
        name "createCardUsage";
      };
      :createHandCard(SpiritOfOmenDendroSpiritserpent);
    }
  }
}

/**
 * @id 2703
 * @name 镀金旅团·叶轮舞者
 * @description
 * 「沙之民有音乐与舞蹈的传统，起初是对神的礼赞，后来则是讨取王者欢心的演艺与战斗的技术。」
 */
define character {
  id 2703 as EremiteFloralRingdancer;
  since "v5.1.0";
  tags dendro, eremite;
  health 10;
  energy 2;
  skills FloralringCaress, SpiralingWhirl, SpiritOfOmensAwakeningDendroSpiritserpent, SpiritOfOmensPower;
}

/**
 * @id 227031
 * @name 灵蛇旋嘶
 * @description
 * 战斗行动：我方出战角色为镀金旅团·叶轮舞者时，装备此牌。
 * 镀金旅团·叶轮舞者装备此牌后，立刻使用一次蔓延旋舞。
 * 装备有此牌的镀金旅团·叶轮舞者在场，我方装备了厄灵·草之灵蛇的角色切换至出战时：造成1点草元素伤害。（每回合1次）
 * （牌组中包含镀金旅团·叶轮舞者，才能加入牌组）
 */
define card {
  id 227031 as SpiritSerpentsSwirl;
  since "v5.1.0";
  cost DiceType.Dendro, 3;
  talent EremiteFloralRingdancer {
    on enter {
      :useSkill(SpiralingWhirl);
    }
    on switchActive {
      when :( :e.switchInfo.to.hasTechnique()?.definition.id === SpiritOfOmenDendroSpiritserpent );
      listenTo samePlayer;
      usage perRound, 1;
      :damage(DamageType.Dendro, 1);
    }
  }
}
