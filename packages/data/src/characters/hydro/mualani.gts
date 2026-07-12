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
 * @id 112141
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
define status {
  id 112141 as NightsoulsBlessing;
  since "v5.3.0";
  nightsoulsBlessing 2;
}

/**
 * @id 112143
 * @name 啃咬目标
 * @description
 * 受到玛拉妮或鲨鲨飞弹伤害时：移除此效果，每层使此伤害+2。
 * （层数可叠加，没有上限）
 */
define status {
  id 112143 as BiteTarget;
  since "v5.3.0";
  variable count, 1 {
    append;
  };
  on increaseDamaged {
    when :( :e.source.definition.id === Mualani || :e.source.definition.id === SharkMissile );
    :e.increaseDamage(2 * :getVariable("count"));
    :dispose();
  }
}

/**
 * @id 112142
 * @name 咬咬鲨鱼
 * @description
 * 双方切换角色后，且玛拉妮为出战角色时：消耗1点「夜魂值」，使敌方出战角色附属啃咬目标。
 * 特技：鲨鲨冲浪板
 * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持。
 * [1121421: ] ()
 * [1121422: 鲨鲨冲浪板] (1*Hydro) 切换到上一个我方角色，使敌方出战角色附属1层啃咬目标。（若我方后台角色均被击倒，则额外消耗1点「夜魂值」）
 * [1121423: ] ()
 */
define card {
  id 112142 as BiteyShark;
  since "v5.3.0";
  technique {
    nightsoul;
    on switchActive {
      when :( :self.master.isActive() );
      listenTo all;
      :consumeNightsoul("@master");
      :characterStatus(BiteTarget, "opp active");
    }
    skill {
      id 1121422;
      cost DiceType.Hydro, 1;
      :switchActive("my prev");
      :characterStatus(BiteTarget, "opp active");
      if (:$$(`my standby`).length === 0) {
        :consumeNightsoul("@master");
      }
    }
  }
}

/**
 * @id 112144
 * @name 鲨鲨飞弹
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2（可叠加，没有上限）
 */
define summon {
  id 112144 as SharkMissile;
  since "v5.3.0";
  hint DamageType.Hydro, 2;
  on endPhase {
    usage 2 {
      append;
    };
    :damage(DamageType.Hydro, 2);
  }
}

/**
 * @id 12141
 * @name 降温处理
 * @description
 * 造成1点水元素伤害。
 */
define skill {
  id 12141 as CoolingTreatment;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Hydro, 1);
}

/**
 * @id 12142
 * @name 踏鲨破浪
 * @description
 * 自身附属咬咬鲨鱼，然后进入夜魂加持，并获得2点「夜魂值」。（角色进入夜魂加持后不可使用此技能）
 * （附属咬咬鲨鱼的角色可以使用特技：鲨鲨冲浪板）
 */
define skill {
  id 12142 as SurfsharkWavebreaker;
  skillType elemental;
  cost DiceType.Hydro, 2;
  filter :( !:self.hasStatus(NightsoulsBlessing) );
  :equip(BiteyShark, "@self");
  :gainNightsoul("@self", 2);
}

/**
 * @id 12143
 * @name 爆瀑飞弹
 * @description
 * 造成2点水元素伤害，召唤鲨鲨飞弹。
 */
define skill {
  id 12143 as BoomsharkaLaka;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :summon(SharkMissile);
}

/**
 * @id 1214
 * @name 玛拉妮
 * @description
 * 流泉不息，踏浪前行。
 */
define character {
  id 1214 as Mualani;
  since "v5.3.0";
  tags hydro, catalyst, natlan;
  health 10;
  energy 2;
  skills CoolingTreatment, SurfsharkWavebreaker, BoomsharkaLaka;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 212141
 * @name 夜域赐礼·波涛顶底
 * @description
 * 装备有此牌的玛拉妮切换为「出战角色」时：触发1个随机我方「召唤物」的「结束阶段」效果。（每回合1次）
 * （牌组中包含玛拉妮，才能加入牌组）
 */
define card {
  id 212141 as NightRealmsGiftCrestsAndTroughs;
  since "v5.3.0";
  cost DiceType.Hydro, 1;
  talent Mualani, none {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.master.id &&
          :$$(`my summon`).length > 0 );
      usage perRound, 1;
      const summons = :$$(`my summon`);
      if (summons.length > 0) {
        const targetSummon = :random(summons);
        :triggerEndPhaseSkill(targetSummon);
      }
    }
  }
}
