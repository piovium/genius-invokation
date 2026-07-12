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

import { card, character, DamageType, DiceType, skill, status, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111151
 * @name 厨艺机关·低温冷藏模式
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 */
define summon {
  id 111151 as CookingMekColdStorageMode;
  since "v6.2.0";
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  }
  on useSkill {
    when :{
      const escoffier = :$(`my character with definition id ${Escoffier}`);
      if (!escoffier || !escoffier.hasEquipment(TeaPartiesBurstingWithColor)) {
        return false;
      }
      return :e.isSkillType("normal") && :e.skillCaller.id !== escoffier.id;
    };
    usage perRound, 1;
    :damage(DamageType.Cryo, 1);
  }
}

/**
 * @id 111156
 * @name 鎏金殿堂（生效中）
 * @description
 * 本回合中，所附属角色下次造成的伤害+2。
 */
define status {
  id 111156 as GildedHallInEffect;
  since "v6.2.0";
  oneDuration;
  once increaseSkillDamage {
    :e.increaseDamage(2);
  }
}

/**
 * @id 111157
 * @name 白浪拂沙（生效中）
 * @description
 * 所附属角色下次使用技能时少花费1个元素骰。
 */
define status {
  id 111157 as WavekissedSandsInEffect;
  since "v6.2.0";
  once deductOmniDiceSkill {
    :e.deductOmniCost(1);
  }
}

/**
 * @id 111158
 * @name 一捧绿野（生效中）
 * @description
 * 所附属角色下次造成的伤害+1。
 */
define status {
  id 111158 as VerdantGiftInEffect;
  since "v6.2.0";
  once increaseSkillDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 111152
 * @name 鎏金殿堂
 * @description
 * 本回合中，目标角色下次造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 111152 as GildedHall;
  undiscoverable;
  food;
  :characterStatus(GildedHallInEffect, "@targets.0");
}

/**
 * @id 111153
 * @name 雾凇秋分
 * @description
 * 治疗目标角色1点，目标角色获得1点额外最大生命值。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 111153 as AutumnFrost;
  undiscoverable;
  food;
  :heal(1, "@targets.0");
  :increaseMaxHealth(1, "@targets.0");
}

/**
 * @id 111154
 * @name 白浪拂沙
 * @description
 * 所有我方角色获得饱腹，并且下次使用技能时少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 111154 as WaveKissedSands;
  undiscoverable;
  food combat {
    satiatedFilter "allNot";
  };
  cost DiceType.Void, 2;
  :characterStatus(WavekissedSandsInEffect, "all my characters");
}

/**
 * @id 111155
 * @name 一捧绿野
 * @description
 * 所有我方角色获得饱腹，并且下次造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 111155 as VerdantGift;
  undiscoverable;
  food combat {
    satiatedFilter "allNot";
  };
  cost DiceType.Aligned, 1;
  :characterStatus(VerdantGiftInEffect, "all my characters");
}

/**
 * @id 111159
 * @name 全频谱多重任务厨艺机关
 * @description
 * 任意一方触发冰元素相关反应后：从鎏金殿堂、雾凇秋分、白浪拂沙、一捧绿野中随机生成1张手牌。
 * 可用次数：2
 */
define card {
  id 111159 as AllspectrumMultiuseCookingMek;
  since "v6.2.0";
  undiscoverable;
  support place { // 神秘
    on reaction {
      when :( :e.relatedTo(DamageType.Cryo) );
      listenTo all;
      usage 2;
      const cards = [GildedHall, AutumnFrost, WaveKissedSands, VerdantGift];
      const selected = :random(cards)
      :createHandCard(selected);
    }
  }
}

/**
 * @id 11151
 * @name 后厨手艺
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11151 as KitchenSkills;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11152
 * @name 低温烹饪
 * @description
 * 造成1点冰元素伤害，召唤厨艺机关·低温冷藏模式。
 */
define skill {
  id 11152 as LowtemperatureCooking;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :summon(CookingMekColdStorageMode);
}

/**
 * @id 11153
 * @name 花刀技法
 * @description
 * 造成1点冰元素伤害，治疗我方所有角色2点。
 */
define skill {
  id 11153 as ScoringCuts;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 1);
  :heal(2, "all my characters");
}

/**
 * @id 11154
 * @name 时时刻刻的即兴料理
 * @description
 * 【被动】战斗开始时，生成全频谱多重任务厨艺机关。
 */
define skill {
  id 11154 as ConstantOffthecuffCookery;
  skillType passive {
    on battleBegin {
      :createEntity("support", AllspectrumMultiuseCookingMek);
    }
  }
}

/**
 * @id 1115
 * @name 爱可菲
 * @description
 * 调霜焙巧，琢味求臻。
 */
define character {
  id 1115 as Escoffier;
  since "v6.2.0";
  tags cryo, pole, fontaine, pneuma;
  health 10;
  energy 2;
  skills KitchenSkills, LowtemperatureCooking, ScoringCuts, ConstantOffthecuffCookery;
}

/**
 * @id 211151
 * @name 虹彩缤纷的甜点茶话
 * @description
 * 战斗行动：我方出战角色为爱可菲时，装备此牌。
 * 爱可菲装备此牌后，立刻使用一次低温烹饪。
 * 我方其他角色使用「普通攻击」后：触发我方厨艺机关·低温冷藏模式的「结束阶段」效果。（不消耗使用次数，每回合1次）
 * （牌组中包含爱可菲，才能加入牌组）
 */
define card {
  id 211151 as TeaPartiesBurstingWithColor;
  since "v6.2.0";
  cost DiceType.Cryo, 4;
  talent Escoffier {
    on enter {
      :useSkill(LowtemperatureCooking);
    }
  }
}
