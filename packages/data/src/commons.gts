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

import { status, combatStatus, summon, DamageType, attachment, DiceType, $ } from "@gi-tcg/core/builder";

/**
 * @id 100
 * @name 抵抗之躯
 * 角色免疫冻结、眩晕、石化的效果。
 */
define status {
  id 100 as ResistantForm;
  tags immuneControl;
}

/**
 * @id 106
 * @name 冻结
 * @description
 * 角色无法使用技能。（持续到回合结束）
 * 角色受到火元素伤害或物理伤害时，移除此效果，使该伤害+2。
 */
define status {
  id 106 as Frozen;
  oneDuration;
  tags disableSkill;
  on increaseDamaged {
    when :( ([DamageType.Pyro, DamageType.Physical] as DamageType[]).includes(:e.type) );
    :e.increaseDamage(2);
    :dispose();
  }
}

/**
 * @id 111
 * @name 结晶
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，最多叠加到2点）
 */
define combatStatus {
  id 111 as Crystallize;
  shield 1, 2;
}

/**
 * @id 115
 * @name 燃烧烈焰
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define summon {
  id 115 as BurningFlame;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 1 {
      append 2;
    };
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 116
 * @name 草原核
 * @description
 * 我方对敌方出战角色造成火元素伤害或雷元素伤害时，伤害值+2。
 * 可用次数：1
 */
define combatStatus {
  id 116 as DendroCore;
  on increaseDamage {
    when :( ([DamageType.Pyro, DamageType.Electro] as DamageType[]).includes(:e.type) &&
        :e.target.id === :$("opp active")?.id );
    usage 1;
    :e.increaseDamage(2);
  }
}

/**
 * @id 117
 * @name 激化领域
 * @description
 * 我方对敌方出战角色造成雷元素伤害或草元素伤害时，伤害值+1。
 * 可用次数：2
 */
define combatStatus {
  id 117 as CatalyzingField;
  on increaseDamage {
    when :( ([DamageType.Electro, DamageType.Dendro] as DamageType[]).includes(:e.type) &&
        :e.target.id === :$("opp active")?.id );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 122
 * @name 生命之契
 * @description
 * 所附属角色受到治疗时：此效果每有1次可用次数，就消耗1次，以抵消1点所受到的治疗。（无法抵消复苏或分配生命值引发的治疗）
 * 可用次数：1（可叠加，没有上限）。
 */
define status {
  id 122 as BondOfLife;
  tags bondOfLife;
  on decreaseHealed {
    when :( :e.healInfo.healKind !== "distribution" );
    usage 1 {
      append {
      limit Infinity;
    };
      autoDecrease false;
    };
    const deducted = Math.min(:getVariable("usage"), :e.expectedValue);
    :e.decreaseHeal(deducted);
    :consumeUsage(deducted);
  }
}

/**
 * @id 169
 * @name 高效切换
 * @description
 * 我方下次执行「切换角色」行动时：少花费1个元素骰。
 */
define combatStatus {
  id 169 as EfficientSwitch;
  on deductOmniDiceSwitch {
    usage 1 {
      append;
    };
    :e.deductOmniCost(1);
  }
}

/**
 * @id 170
 * @name 敏捷切换
 * @description
 * 我方下次执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（可叠加，没有上限）
 */
define combatStatus {
  id 170 as AgileSwitch;
  on beforeFastSwitch {
    usage 1 {
      append;
    };
    :e.setFastAction();
  }
}

/**
 * @id 171
 * @name 完成冒险！
 * @description
 * 已完成过一次冒险。
 */
define combatStatus {
  id 171 as AdventureCompleted;
  variable layer, 1 {
    append;
  };
}

/**
 * @id 172
 * @name 战斗计划
 * @description
 * 所附属角色下次使用技能少花费1个元素骰。
 * 可用次数：1（可叠加，没有上限）
 */
define status {
  id 172 as BattlePlan;
  on deductOmniDiceSkill {
    usage 1 {
      append;
    };
    :e.deductOmniCost(1);
  }
}

/**
 * @id 209
 * @name 打磨利刃
 * @description
 * 所附属角色下次造成的伤害+1。
 * 可用次数：1（可叠加，没有上限）
 */
define status {
  id 209 as SharpenTheBlade;
  on increaseSkillDamage {
    usage 1 {
      append;
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 210
 * @name 抗性
 * @description
 * 所附属角色受到伤害时：抵消1点伤害。（可叠加，没有上限）
 */
define status {
  id 210 as RES;
  tags barrier;
  on decreaseDamaged {
    usage 1 { append };
    :e.decreaseDamage(1);
  }
}

/**
 * @id 201
 * @name 费用增加
 * @description
 * 此牌的元素骰费用增加1。（可叠加，没有上限）
 */
define attachment {
  id 201 as CostIncrease;
  variable layer, 1 { append };
  addCost ((st, self) => self.variables.layer);
}

/**
 * @id 202
 * @name 费用降低
 * @description
 * 此牌的元素骰费用降低1。（可叠加，没有上限）
 */
define attachment {
  id 202 as CostReduction;
  variable layer, 1 { append };
  deductCost ((st, self) => self.variables.layer);
};

/**
 * @id 203
 * @name 护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，没有上限）
 */
define combatStatus {
  id 203 as Shield;
  shield 1, Infinity;
}

/**
 * @id 204
 * @name 电击
 * @description
 * 结束阶段：如果此牌在手牌中，则对我方生命值最高角色造成等同于自身层数的穿透伤害。(可叠加，没有上限）
 */
define attachment {
  id 204 as Conductive;
  tags conductive;
  variable layer, 1 { append };
  on endPhase {
    when :( :self.area.type === "hands" );
    const target = :query($.macros.myMaxHealth);
    if (target) {
      :damage(DamageType.Piercing, :getVariable("layer"), target);
    }
  }
}

/**
 * @id 205
 * @name 雷暴云
 * @description
 * 结束阶段：造成2点雷元素伤害。
 * 可用次数：1（可叠加，没有上限）
 * 自身入场或可用次数增加时：赋予敌方随机1张手牌电击。
 */
define summon {
  id 205 as Thundercloud;
  hint DamageType.Electro, 2;
  on endPhase {
    usage 1 { append };
    :damage(DamageType.Electro, 2);
  }
  defineSnippet giveOppRandomCardConductive, :{
    if (:oppPlayer.hands.length === 0) {
      return;
    }
    const targetHand = :random(:oppPlayer.hands);
    :attach(Conductive, targetHand);
  }
  on enter {
    :callSnippet.giveOppRandomCardConductive();
  }
  on gainUsage {
    when :( :e.entity.id === :self.id );
    :callSnippet.giveOppRandomCardConductive();
  }
}

/**
 * @id 206
 * @name 赋能
 * @description
 * 此牌费用改为花费对应数量的任意元素骰
 * 调和此牌时：转换的元素类型改为万能元素。
 */
define attachment {
  id 206 as Empowerment;
  changeCostType DiceType.Void;
  changeTuningTarget DiceType.Omni;
}

/**
 * @id 207
 * @name 不可调和
 * @description
 * 此牌无法进行调和。
 */
define attachment {
  id 207 as NoTuningAllowed;
  disableTuning;
}

/**
 * @id 208
 * @name 无效化
 * @description
 * 此牌打出效果无效。
 */
define attachment {
  id 208 as IneffectiveWhenPlayed;
  makeEffectless;
}

/**
 * @id 303300
 * @name 饱腹
 * @description
 * 本回合无法食用更多「料理」
 */
define status {
  id 303300 as Satiated;
  oneDuration;
}
