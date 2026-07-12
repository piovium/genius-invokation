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

import { card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 122061
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
define summon {
  id 122061 as HalfTulpa01;
  since "v6.1.0";
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  }
  on selfDispose {
    :heal(2, "my characters with definition id 2206");
  }
}

/**
 * @id 122062
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
define summon {
  id 122062 as HalfTulpa02;
  since "v6.1.0";
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  }
  on selfDispose {
    :heal(2, "my characters with definition id 2206");
  }
}

/**
 * @id 122063
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
define summon {
  id 122063 as HalfTulpa03;
  since "v6.1.0";
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  }
  on selfDispose {
    :heal(2, "my characters with definition id 2206");
  }
}

/**
 * @id 122064
 * @name 半幻人
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 此卡牌被弃置时：治疗我方水形幻人2点。
 * 可用次数：2
 */
define summon {
  id 122064 as HalfTulpa04;
  since "v6.1.0";
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  }
  on selfDispose {
    :heal(2, "my characters with definition id 2206");
  }
}

/**
 * @id 22061
 * @name 涌浪
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 22061 as SavageSwell;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 22062
 * @name 汛波
 * @description
 * 造成2点水元素伤害，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
define skill {
  id 22062 as StormSurge;
  skillType elemental;
  cost DiceType.Hydro, 3;
  noEnergy;
  // 出于神秘原因，e的所有效果，包括获得充能，都以使用技能后的方式写出
}

/**
 * @id 22063
 * @name 洪啸
 * @description
 * 造成4点水元素伤害，触发我方所有「召唤物」的「结束阶段」效果。
 */
define skill {
  id 22063 as ThunderingTide;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Hydro, 4);
}

/**
 * @id 22064
 * @name 分流
 * @description
 * 自身生命值不低于3，我方半幻人以外的「召唤物」离场时：自身受到2点穿透伤害，召唤1个独立的半幻人。（每回合1次）
 */
define skill {
  id 22064 as BranchingFlow;
  skillType passive {
    // 分流：每回合一次在召唤物离场时召唤半幻人
    on dispose {
      when :( :e.entity.definition.type === "summon" &&
          !([HalfTulpa01, HalfTulpa02, HalfTulpa03, HalfTulpa04] as number[]).includes(:e.entity.definition.id) &&
          :self.health >= 3 );
      listenTo samePlayer;
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :damage(DamageType.Piercing, 2, "@self");
      if (!:$(`my summon with definition id ${HalfTulpa01}`)) {
        :summon(HalfTulpa01);
      } else if (!:$(`my summon with definition id ${HalfTulpa02}`)) {
        :summon(HalfTulpa02);
      } else if (!:$(`my summon with definition id ${HalfTulpa03}`)) {
        :summon(HalfTulpa03);
      } else {
        :summon(HalfTulpa04);
      }
    }
    // 汛波：造成2点水元素伤害；如果自身生命值不低于2，就造成1点穿透伤害
    on useSkill {
      when :( :e.skill.definition.id === StormSurge );
      asSkillType elemental;
      :damage(DamageType.Hydro, 2);
      if (:self.health >= 2) {
        :damage(DamageType.Piercing, 1, "@self");
      }
    }
    // 汛波：获得充能
    on useSkill {
      when :( :e.skill.definition.id === StormSurge );
      :gainEnergy(1, "@self");
    }
    // 汛波：随机触发一个召唤物的结束阶段技能
    on useSkill {
      when :( :e.skill.definition.id === StormSurge && :$(`my summons`) );
      :abortPreview();
      const target = :random(:player.summons);
      :triggerEndPhaseSkill(target);
    }
    // 洪啸：触发所有召唤物的结束阶段技能
    on useSkill {
      when :( :e.skill.definition.id === ThunderingTide );
      for (const summon of :$$(`my summons`)) {
        :triggerEndPhaseSkill(summon);
      }
    }
  }
}

/**
 * @id 22065
 * @name 汛波
 * @description
 * 造成2点水元素伤害，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
define skill {
  id 22065 as StormSurge01;
  skillType passive;
  reserved;
}

/**
 * @id 22066
 * @name 汛波
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，随机触发我方1个「召唤物」的「结束阶段」效果。如果自身生命值不低于2，则自身受到1点穿透伤害。
 */
define skill {
  id 22066 as StormSurge02;
  skillType passive;
  reserved;
}

/**
 * @id 22067
 * @name 洪啸
 * @description
 * 造成4点水元素伤害，触发我方所有「召唤物」的「结束阶段」效果。
 */
define skill {
  id 22067 as ThunderingTide01;
  skillType passive;
  reserved;
}

/**
 * @id 22068
 * @name 洪啸
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，触发我方所有「召唤物」的「结束阶段」效果。
 */
define skill {
  id 22068 as ThunderingTide02;
  skillType passive;
  reserved;
}

/**
 * @id 2206
 * @name 水形幻人
 * @description
 * 由无数的水滴凝聚成的，初具人形的魔物。
 */
define character {
  id 2206 as HydroTulpa;
  since "v6.1.0";
  tags hydro, monster;
  health 10;
  energy 3;
  skills SavageSwell, StormSurge, ThunderingTide, BranchingFlow;
}

/**
 * @id 222062
 * @name 元素生命·水
 * @description
 * 角色总是附着水元素，并且免疫水元素伤害。
 * 持续回合：2
 */
define status {
  id 222062 as ElementalLifeformHydro;
  duration 2;
  on enter {
    :apply(DamageType.Hydro, "@master");
  }
  on modifyReaction {
    :e.reApplyTo(DamageType.Hydro);
  }
  on decreaseDamaged {
    when :( :e.type === DamageType.Hydro );
    :e.decreaseDamage(:e.value);
  }
}

/**
 * @id 222061
 * @name 汇流
 * @description
 * 快速行动：装备给我方的水形幻人，使其附属元素生命·水。（角色总是附着水元素，并且免疫水元素伤害。持续回合：2）
 * 装备有此牌的水形幻人在场时，我方宣布结束后，如果所附属角色生命值不低于3，则所附属角色受到2点穿透伤害，召唤1个独立的半幻人。
 * （牌组中包含水形幻人，才能加入牌组）
 */
define card {
  id 222061 as FlowConvergence;
  since "v6.1.0";
  cost DiceType.Hydro, 2;
  talent HydroTulpa, none {
    on enter {
      :characterStatus(ElementalLifeformHydro, "@master");
    }
    on declareEnd {
      when :( :self.master.health >= 3 );
      :damage(DamageType.Piercing, 2, "@master");
      if (!:$(`my summon with definition id ${HalfTulpa01}`)) {
        :summon(HalfTulpa01);
      } else if (!:$(`my summon with definition id ${HalfTulpa02}`)) {
        :summon(HalfTulpa02);
      } else if (!:$(`my summon with definition id ${HalfTulpa03}`)) {
        :summon(HalfTulpa03);
      } else {
        :summon(HalfTulpa04);
      }
    }
  }
}
