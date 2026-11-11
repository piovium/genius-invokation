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
