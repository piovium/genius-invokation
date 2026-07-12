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
 * @id 124044
 * @name 雷压
 * @description
 * 每当我方累计打出3张行动牌，就会触发敌方场上雷萤的效果。（使雷萤的可用次数+1）
 */
define combatStatus {
  id 124044 as CrushingThunder;
  variable playedCard, 0;
  on playCard {
    :addVariable("playedCard", 1);
  }
  on playCard {
    when :( :getVariable("playedCard") === 3 );
    const cicin = :$(`opp summon with definition id ${ElectroCicin}`);
    if (cicin) {
      cicin.addVariableWithMax("usage", 1, 3);
    }
    :setVariable("playedCard", 0);
  }
}

/**
 * @id 124041
 * @name 雷萤
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：3
 * 敌方累计打出3张行动牌后：此牌可用次数+1。（最多叠加到3）
 * 愚人众·雷萤术士受到元素反应伤害后：此牌可用次数-1。
 */
define summon {
  id 124041 as ElectroCicin;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Electro, 1);
  }
  on damaged {
    when :( :e.target.definition.id === FatuiElectroCicinMage && :e.getReaction() !== null );
    :consumeUsage();
  }
  on enter {
    :combatStatus(CrushingThunder, "opp");
  }
  on selfDispose {
    :$(`opp combat status with definition id ${CrushingThunder}`)?.dispose();
  }
  on beforeAction {
    when :( :$(`my equipment with definition id ${ElectroCicinsGleam}`) && :getVariable("usage") >= 3 );
    :damage(DamageType.Electro, 1);
    :consumeUsage();
  }
}

/**
 * @id 24044
 * @name 霆电迸发
 * @description
 * （需准备1个行动轮）
 * 造成2点雷元素伤害。
 */
define skill {
  id 24044 as SurgingThunder;
  skillType burst;
  prepared;
  :damage(DamageType.Electro, 2);
}

/**
 * @id 124043
 * @name 霆电迸发
 * @description
 * 本角色将在下次行动时，直接使用技能：霆电迸发。
 */
define status {
  id 124043 as SurgingThunderStatus;
  prepare SurgingThunder;
}

/**
 * @id 124042
 * @name 雷萤护罩
 * @description
 * 为我方出战角色提供1点护盾。
 * 创建时：如果我方场上存在雷萤，则额外提供其可用次数的护盾。（最多额外提供3点护盾）
 */
define combatStatus {
  id 124042 as ElectroCicinShield;
  shield 1;
  on enter {
    const cicin = :$(`my summon with definition id ${ElectroCicin}`);
    if (cicin) {
      const usage = cicin.getVariable("usage");
      :addVariable("shield", Math.min(usage, 3));
    }
  }
}

/**
 * @id 24041
 * @name 轰闪落雷
 * @description
 * 造成1点雷元素伤害。
 */
define skill {
  id 24041 as HurtlingBolts;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Electro, 1);
}

/**
 * @id 24042
 * @name 雾虚之召
 * @description
 * 召唤雷萤。
 */
define skill {
  id 24042 as MistyCall;
  skillType elemental;
  cost DiceType.Electro, 3;
  :summon(ElectroCicin);
}

/**
 * @id 24043
 * @name 霆雷之护
 * @description
 * 造成1点雷元素伤害，本角色附着雷元素，生成雷萤护罩并准备技能霆电迸发。
 */
define skill {
  id 24043 as ThunderingShield;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 1);
  :apply(DamageType.Electro, "@self");
  :combatStatus(ElectroCicinShield);
  :characterStatus(SurgingThunderStatus);
}

/**
 * @id 2404
 * @name 愚人众·雷萤术士
 * @description
 * …正如雾虚草的气味会令雷萤迷醉，嗜虐的术士也贪恋着戏弄对手的快感…
 */
define character {
  id 2404 as FatuiElectroCicinMage;
  since "v4.5.0";
  tags electro, fatui;
  health 10;
  energy 2;
  skills HurtlingBolts, MistyCall, ThunderingShield, SurgingThunder;
}

/**
 * @id 224041
 * @name 雷萤浮闪
 * @description
 * 战斗行动：我方出战角色为愚人众·雷萤术士时，装备此牌。
 * 愚人众·雷萤术士装备此牌后，立刻使用一次雾虚之召。
 * 装备有此牌的愚人众·雷萤术士在场时，我方选择行动前：如果雷萤的可用次数至少为3，则雷萤立刻造成1点雷元素伤害。（需消耗可用次数，每回合1次）
 * （牌组中包含愚人众·雷萤术士，才能加入牌组）
 */
define card {
  id 224041 as ElectroCicinsGleam;
  since "v4.5.0";
  cost DiceType.Electro, 3;
  talent FatuiElectroCicinMage {
    on enter {
      :useSkill(MistyCall);
    }
  }
}
