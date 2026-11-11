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

import {
  $,
  DiceType,
  type StatusHandle,
  type CombatStatusHandle,
  type EquipmentHandle,
} from "#custom-data-loader";

// 终末嗟叹之诗
const ElegyForTheEnd = 311205 as EquipmentHandle;

// 沙海守望·主动出击
const DesertWatchTakeTheInitiative = 301105 as StatusHandle;

/**
 * @id 323003
 * @name 红羽团扇
 * @cost 2*Aligned
 * @description
 * 我方切换角色后：本回合中，我方下次执行「切换角色」行动视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。（每回合1次）
 */
define card {
  id 323003;
  cost DiceType.Aligned, 2;
  support item {
    // 本回合是否切换角色
    variable switched, 0;
    // 是否触发减骰**或**快速效果
    variable triggered, 0 { visible false; };
    on switchActive {
      :variables.switched = 1;
    }
    on roundEnd {
      :variables.switched = 0;
    };
    on deductOmniDiceSwitch {
      when :( :variables.switched );
      usage perRound, 1 {
        name usagePerRound1;
        autoDecrease false;
      };
      :e.deductOmniCost(1);
      :variables.triggered = 1;
    };
    on beforeFastSwitch {
      when :( :variables.switched );
      usage perRound, 1 {
        name usagePerRound1;
        autoDecrease false;
      };
      :e.setFastAction();
      :variables.triggered = 1;
    };
    on switchActive {
      when :( :variables.triggered );
      usage perRound, 1 {
        name usagePerRound1;
      };
      :variables.triggered = 0;
    };
  };
};

// 根据Q&A，仅存在场上「终末嗟叹之诗」时生效
/**
 * @id 301102
 * @name 千年的大乐章·别离之歌
 * @description
 * 我方存在装备中的「终末嗟叹之诗」时：我方角色造成的伤害+1。
 * 持续回合：2
 */
define combatStatus {
  id 301102;
  description "我方角色造成的伤害+1（仅在我方存在终末嗟叹之诗时生效）。持续回合：2";
  duration 2;
  on increaseSkillDamage {
    when :( :query($.my.equipped.def(ElegyForTheEnd)) );
    :e.increaseDamage(1);
  };
};

// 共享可用次数
/**
 * @id 311306
 * @name 苇海信标
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」或受到伤害后：本回合内，角色下次造成的伤害额外+1。（每回合2次）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311306;
  description "角色造成的伤害+1。角色使用元素战技或受到伤害后：本回合内，角色下次造成的伤害额外+1。（共用每回合2次）";
  cost DiceType.Aligned, 3;
  weapon claymore {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    };
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 2 { name usagePerRound1; };
      :characterStatus(DesertWatchTakeTheInitiative, :self.master);
    };
    on damaged {
      usage perRound, 2 { name usagePerRound1; };
      :characterStatus(DesertWatchTakeTheInitiative, :self.master);
    };
  };
};

// 钟剑系列：允许独立生成、关联来源并自动弃置

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield0;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield1;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield2;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

const BELL_SHIELDS = [BellShield0, BellShield1, BellShield2];

/**
 * @id 311305
 * @name 钟剑
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用技能后：生成1点绑定此武器的「护盾」，保护我方出战角色。（每回合1次，可叠加到2点）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311305;
  description "角色造成的伤害+1。角色使用技能后：生成1点绑定此武器的出战护盾。（每回合1次，自身最多叠加到2点）不同钟剑的护盾分别记录，装备者倒下或武器移除时对应护盾消失。";
  cost DiceType.Aligned, 3;
  weapon claymore {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    };
    on useSkill {
      usage perRound, 1;
      const shields = :queryAll($.my.combatStatus);
      const existing = shields.find((s) => s.variables.weaponId === :self.id);
      const defId =
        existing?.definition.id ??
        BELL_SHIELDS.find((id) => !shields.some((s) => s.definition.id === id));
      if (defId) {
        :combatStatus(defId as CombatStatusHandle, "my", {
          overrideVariables: {
            weaponId: :self.id,
          },
        });
      }
    };
  };
};
