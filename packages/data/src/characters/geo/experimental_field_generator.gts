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

import { $, card, character, combatStatus, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";
import { EfficientSwitch } from "../../commons.gts";

/**
 * @id 126053
 * @name 回避
 * @description
 * 本回合结束阶段不会受到来自振荡冲击的伤害。
 * 持续回合：1
 */
define status {
  id 126053 as Evasion;
  since "v6.6.0";
  duration 1;
}

/**
 * @id 126054
 * @name 力场操控
 * @description
 * 本回合中，该角色下次「普通攻击」少花费1个无色元素。
 */
define status {
  id 126054 as ForceFieldManipulation;
  since "v6.6.0";
  oneDuration;
  once deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(1);
  }
}

/**
 * @id 126051
 * @name 低重力背景
 * @description
 * 双方角色使用技能后：该角色附属回避并切换至下一名角色。
 * 持续回合：2
 */
define combatStatus {
  id 126051 as LowGravityBackground;
  since "v6.6.0";
  duration 2;
  on useSkill {
    when :( :e.skill.definition.id !== GravityApplicationFieldReduction );
    listenTo all;
    :characterStatus(Evasion, :e.skill.caller.cast<"character">());
    const target = :e.who === :self.who ? $.my.next : $.opp.next;
    :switchActive(target);
  }
}

/**
 * @id 126052
 * @name 振荡冲击
 * @description
 * 结束阶段：对所有未附属回避的角色造成1点穿透伤害。
 * 持续回合：2
 */
define combatStatus {
  id 126052 as ShockBlast;
  since "v6.6.0";
  duration 2;
  on endPhase {
    :damage(DamageType.Piercing, 1, $.character.exclude($.has.def(Evasion)));
  }
}

/**
 * @id 26051
 * @name 重力应用程式·砸击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 26051 as GravityApplicationCrush;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 26052
 * @name 重力应用程式·点状抵消
 * @description
 * 造成2点岩元素伤害，生成2层高效切换。
 */
define skill {
  id 26052 as GravityApplicationPointNull;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 2);
  :combatStatus(EfficientSwitch, "my", {
      overrideVariables: {
        usage: 2
      }
    });
}

/**
 * @id 26053
 * @name 重力应用程式·削减场域
 * @description
 * 造成3点岩元素伤害，生成低重力背景和振荡冲击，本回合中我方所有后台角色下次「普通攻击」少花费1个无色元素。
 */
define skill {
  id 26053 as GravityApplicationFieldReduction;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Geo, 3);
  :combatStatus(LowGravityBackground);
  :combatStatus(ShockBlast);
  :characterStatus(ForceFieldManipulation, $.my.standby);
}

/**
 * @id 2605
 * @name 实验性场力发生装置
 * @description
 * 枫丹动能工程科学研究院的作品，因为事故而失控，拥有「抵消」重力的效果。
 */
define character {
  id 2605 as ExperimentalFieldGenerator;
  since "v6.6.0";
  tags geo, monster;
  health 11;
  energy 2;
  skills GravityApplicationCrush, GravityApplicationPointNull, GravityApplicationFieldReduction;
}

/**
 * @id 226051
 * @name 重力场域
 * @description
 * 快速行动：装备给我方的实验性场力发生装置。
 * 任意阵营宣布结束后：该阵营切换至下一名角色。
 * 我方角色下落攻击造成的伤害+1。（每回合2次）
 * （牌组中包含实验性场力发生装置，才能加入牌组）
 */
define card {
  id 226051 as GravityField;
  since "v6.6.0";
  cost DiceType.Geo, 1;
  talent ExperimentalFieldGenerator, none {
    on declareEnd {
      listenTo all;
      const target = :e.who === :self.who ? $.my.next : $.opp.next;
      :switchActive(target);
    }
    on increaseSkillDamage {
      when :( :e.viaPlungingAttack() );
      listenTo samePlayer;
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}
