// Copyright (C) 2026 Piovium Labs
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

import { DiceType, DamageType, $ } from "@gi-tcg/core/data";
import {
  AnemoDMGBonus,
  CryoDMGBonus,
  ElectroDMGBonus,
  ElementalInfusionCryo,
  ElementalInfusionElectro,
  ElementalInfusionHydro,
  ElementalInfusionPyro,
  HydroDMGBonus,
  PyroDMGBonus,
} from "../../commons.gts";

/**
 * @id 115171
 * @name 狂飙突进
 * @description
 * 所附属角色使用「普通攻击」后：造成1点风元素伤害。
 * 持续回合：2
 * 所附属角色累计使用「普通攻击」2次后：生成烈风终坠。
 */
define status {
  id 115171 as SturmUndDrang;
  since "v7.2.0";
  duration 2;
  variable normalAttackCount, 0 {
    visible false;
  };
  on useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Anemo, 1, $.macros.oppActivePrioritized);
    :variables.normalAttackCount += 1;
  };
  on useSkill {
    when :( :e.isSkillType("normal") && :variables.normalAttackCount >= 2 );
    :createHandCard(WindboundExecution);
    :variables.normalAttackCount = 0;
  };
};

/**
 * @id 115175
 * @name 四风将起（生效中）
 * @description
 * 回合开始时，移除我方1个骰子，切换至法尔伽，并准备技能：四风将起
 */
define status {
  id 115175 as FourWindsAscensionInEffect;
  since "v7.2.0";
  once actionPhase {
    :absorbDice("seq", 1);
    :switchActive(:self.master);
    :characterStatus(StatusFourWindsAscensionPreparing, :self.master);
  };
};

/**
 * @id 115176
 * @name 苍噬（生效中）
 * @description
 * 回合开始时，移除我方1个骰子，切换至法尔伽，根据我方角色附属对应的元素附魔,并准备技能：2次苍噬
 */
define status {
  id 115176 as AzureDevourInEffect;
  since "v7.2.0";
  once actionPhase {
    :absorbDice("seq", 1);
    :switchActive(:self.master);
    const elements = new Set(
      :queryAll($.my.character.includesDefeated).map((ch) => ch.element()),
    );
    if (elements.has(DiceType.Pyro)) {
      :characterStatus(ElementalInfusionPyro, :self.master);
    } else if (elements.has(DiceType.Hydro)) {
      :characterStatus(ElementalInfusionHydro, :self.master);
    } else if (elements.has(DiceType.Electro)) {
      :characterStatus(ElementalInfusionElectro, :self.master);
    } else if (elements.has(DiceType.Cryo)) {
      :characterStatus(ElementalInfusionCryo, :self.master);
    }
    :characterStatus(StatusAzureDevourPreparing, :self.master);
  };
};

/**
 * @id 115177
 * @name 四风将起·准备中
 * @description
 * 本角色将在下次行动时，直接使用技能：四风将起。
 */
define status {
  id 115177 as StatusFourWindsAscensionPreparing;
  since "v7.2.0";
  prepare FourWindsAscension;
};

/**
 * @id 115178
 * @name 苍噬·准备中
 * @description
 * 本角色将在下次行动时，直接使用技能：苍噬，触发2次。
 */
define status {
  id 115178 as StatusAzureDevourPreparing;
  since "v7.2.0";
  tags preparingSkill;
  // prepare 当前只支持一次，手动实现两次准备技能。
  on replaceActionBySkill {
    usage 2;
    :useSkill(AzureDevour);
  };
  on switchActive {
    when :( :e.switchInfo.from?.id === :self.master.id );
    :dispose();
  };
};

/**
 * @id 115172
 * @name 烈风终坠
 * @cost 2*Aligned
 * @description
 * 为法尔伽挑选一项技能，在下个回合开始移除我方1个骰子，切换至法尔伽，并准备对应技能：
 * 造成6点风元素伤害。
 * 或
 * 根据我方角色附属对应的元素附魔。然后进行2次「普通攻击」。
 */
define card {
  id 115172 as WindboundExecution;
  since "v7.2.0";
  cost DiceType.Aligned, 2;
  undiscoverable;
  :selectAndPlay([FourWindsAscensionStatus, AzureDevourStatus]);
};

/**
 * @id 115173
 * @name 四风将起
 * @cost
 * @description
 * 下个回合开始时，移除我方1个骰子，切换至法尔伽，并准备技能：四风将起
 */
define card {
  id 115173 as FourWindsAscensionStatus;
  since "v7.2.0";
  undiscoverable;
  :characterStatus(FourWindsAscensionInEffect, $.my.def(Varka));
};

/**
 * @id 115174
 * @name 苍噬
 * @cost
 * @description
 * 下个回合开始时，移除我方1个骰子，切换至法尔伽，根据我方角色附属对应的元素附魔,并准备技能：2次苍噬
 */
define card {
  id 115174 as AzureDevourStatus;
  since "v7.2.0";
  undiscoverable;
  :characterStatus(AzureDevourInEffect, $.my.def(Varka));
};

/**
 * @id 115179
 * @name 我即朔风（生效中）
 * @description
 * 我方使用技能后：造成2点风元素伤害。
 */
define combatStatus {
  id 115179 as NorthwindAvatarInEffect;
  since "v7.2.0";
  once useSkill {
    :damage(DamageType.Anemo, 2);
  };
};

/**
 * @id 15171
 * @name 西风剑术·流光之舞
 * @cost 1*Anemo, 2*Void
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15171 as FavoniusBladeworkDancingRadiance;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
};

/**
 * @id 15172
 * @name 烈风终坠
 * @cost 3*Anemo
 * @description
 * 造成1点风元素伤害，自身附属狂飙突进，若我方场上存在火/水/雷/冰元素角色时，自身按照此优先级附属对应元素附魔。
 */
define skill {
  id 15172 as LieFengJiangZhui;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 1);
  :characterStatus(SturmUndDrang);
  const elements = new Set(
    :queryAll($.my.character.includesDefeated).map((ch) => ch.element()),
  );
  if (elements.has(DiceType.Pyro)) {
    :characterStatus(ElementalInfusionPyro);
  } else if (elements.has(DiceType.Hydro)) {
    :characterStatus(ElementalInfusionHydro);
  } else if (elements.has(DiceType.Electro)) {
    :characterStatus(ElementalInfusionElectro);
  } else if (elements.has(DiceType.Cryo)) {
    :characterStatus(ElementalInfusionCryo);
  }
};

/**
 * @id 15173
 * @name 我即朔风
 * @cost 3*Anemo, 3*Energy
 * @description
 * 造成3点风元素伤害，若我方场上存在火/水/雷/冰元素角色时，按照此优先级改为造成对应的元素伤害。此技能结束后，再造成2点风元素伤害。
 */
define skill {
  id 15173 as NorthwindAvatar;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 3;
  const elements = new Set(
    :queryAll($.my.character.includesDefeated).map((ch) => ch.element()),
  );
  if (elements.has(DiceType.Pyro)) {
    :damage(DamageType.Pyro, 3);
  } else if (elements.has(DiceType.Hydro)) {
    :damage(DamageType.Hydro, 3);
  } else if (elements.has(DiceType.Electro)) {
    :damage(DamageType.Electro, 3);
  } else if (elements.has(DiceType.Cryo)) {
    :damage(DamageType.Cryo, 3);
  } else {
    :damage(DamageType.Anemo, 3);
  }
  :combatStatus(NorthwindAvatarInEffect);
};

/**
 * @id 15174
 * @name 四风将起
 * @cost
 * @description
 * 造成6点风元素伤害。
 */
define skill {
  id 15174 as FourWindsAscension;
  skillType elemental;
  prepared;
  :damage(DamageType.Anemo, 6);
};

/**
 * @id 15175
 * @name 苍噬
 * @cost
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15175 as AzureDevour;
  skillType normal;
  prepared;
  :damage(DamageType.Physical, 2);
};

/**
 * @id 1517
 * @name 法尔伽
 * @hp 12
 * @energy 3
 * @description
 * 凡铁之剑，斩魔之锋。
 */
define character {
  id 1517 as Varka;
  since "v7.2.0";
  tags anemo, claymore, mondstadt;
  health 12;
  energy 3;
  skills FavoniusBladeworkDancingRadiance,
    LieFengJiangZhui,
    NorthwindAvatar,
    FourWindsAscension,
    AzureDevour;
};

/**
 * @id 215171
 * @name 「因为无人能夺去我们歌唱的自由」
 * @cost 3*Anemo
 * @description
 * 战斗行动：我方出战角色为法尔伽时，装备此牌。
 * 法尔伽装备此牌后，立刻使用一次烈风终坠。
 * 装备有此牌的法尔伽为出战角色，我方触发扩散反应后，我方下一次造成的风元素伤害与被扩散元素造成的伤害+1。（每回合1次）
 * （牌组中包含法尔伽，才能加入牌组）
 */
define card {
  id 215171 as ForNoneMayTakeFromUsOurFreedomOfSong;
  since "v7.2.0";
  cost DiceType.Anemo, 3;
  talent Varka {
    on staged {
      :useSkill(LieFengJiangZhui);
    };
    on dealReaction {
      when :( :self.master.isActive() && :e.relatedTo(DamageType.Anemo) );
      usage perRound, 1;
      :combatStatus(AnemoDMGBonus);
      if (:e.relatedTo(DamageType.Pyro)) {
        :combatStatus(PyroDMGBonus);
      } else if (:e.relatedTo(DamageType.Hydro)) {
        :combatStatus(HydroDMGBonus);
      } else if (:e.relatedTo(DamageType.Electro)) {
        :combatStatus(ElectroDMGBonus);
      } else if (:e.relatedTo(DamageType.Cryo)) {
        :combatStatus(CryoDMGBonus);
      }
    };
  };
};

/**
 * @id 215172
 * @name 重光临晨
 * @cost 3*Anemo
 * @description
 * 快速行动：装备给我方的法尔伽，生成烈风终坠。
 * 我方法尔伽使用「普通攻击」后，赋予我方手牌中1张烈风终坠费用降低。
 * （牌组中包含法尔伽，才能加入牌组）
 */
define card {
  id 215172 as DawnsReturn;
  since "v7.2.0";
  cost DiceType.Anemo, 3;
  tags hexenzirkel;
  talent Varka, none {
    on staged {
      :createHandCard(WindboundExecution);
    };
    on useSkill {
      when :( :e.isSkillType("normal") );
      const windboundExecution = :query($.my.hand.def(WindboundExecution));
      if (windboundExecution) {
        :attachCostReduction(windboundExecution);
      }
    };
  };
};
