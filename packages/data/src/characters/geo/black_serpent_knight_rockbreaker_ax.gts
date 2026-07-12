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

import { card, character, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";

/**
 * @id 126041
 * @name 摧岩伟力
 * @description
 * 所附属角色造成的伤害+1，对处于护盾或减伤状态下的敌方角色则改为造成的伤害+3。
 * 可用次数：1（可叠加，没有上限）
 */
define status {
  id 126041 as MightOfStone;
  since "v6.2.0";
  on increaseSkillDamage {
    usage 1 {
      append;
    };
    const targetId = :e.target.id;
    const entities = :$$(`(opp statuses) or (opp equipments) or (opp combat statuses)`);
    const isUnderShield = entities.some((e) =>
      e.definition.tags.includes("shield") || e.definition.tags.includes("barrier")
    );
    if (isUnderShield) {
      :e.increaseDamage(3);
    } else {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 26047
 * @name 大师之击
 * @description
 * 造成3点岩元素伤害。
 */
define skill {
  id 26047 as MastersStrike;
  skillType burst;
  prepared;
  :damage(DamageType.Geo, 3);
}

/**
 * @id 126043
 * @name 大师之击
 * @description
 * 本角色将在下次行动时，直接使用技能：大师之击。
 */
define status {
  id 126043 as MastersStrikeStatus;
  since "v6.2.0";
  prepare MastersStrike;
}

/**
 * @id 26045
 * @name 巨钺强袭
 * @description
 * 造成3点岩元素伤害，准备技能大师之击。
 */
define skill {
  id 26045 as GreataxeStrike;
  skillType burst;
  prepared;
  :damage(DamageType.Geo, 3);
}

/**
 * @id 126042
 * @name 巨钺强袭
 * @description
 * 本角色将在下次行动时，直接使用技能：巨钺强袭。
 */
define status {
  id 126042 as GreataxeStrikeStatus;
  since "v6.2.0";
  prepare GreataxeStrike {
    nextStatus MastersStrikeStatus;
  };
}

/**
 * @id 26041
 * @name 顶位迅斩
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 26041 as SupremeStrike;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 26042
 * @name 斧盾震击
 * @description
 * 造成3点岩元素伤害。
 */
define skill {
  id 26042 as AxeAndAegis;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 3);
}

/**
 * @id 26043
 * @name 坚岩姿态
 * @description
 * 自身附着岩元素，准备技能巨钺强袭，然后准备技能大师之击。
 */
define skill {
  id 26043 as StoneStance;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :apply(DamageType.Geo, "@self");
  :characterStatus(GreataxeStrikeStatus, "@self");
}

/**
 * @id 26044
 * @name 攻阵气势
 * @description
 * 【被动】如果敌方场上存在 伤害抵消、护盾状态；或存在 伤害抵消、护盾出战状态，则我方角色使用技能后，自身附属1层摧岩伟力。
 */
define skill {
  id 26044 as AttackingMomentum;
  skillType passive {
    variable shouldAttachCatalysisOfStone, 0;
    on beforeSkill {
      when :{
        const entities = :$$(`(opp statuses) or (opp equipments) or (opp combat statuses)`);
        return entities.some((e) =>
          e.definition.tags.includes("shield") || e.definition.tags.includes("barrier")
        );
      };
      listenTo samePlayer;
      :setVariable("shouldAttachCatalysisOfStone", 1);
    }
    on useSkill {
      when :( :getVariable("shouldAttachCatalysisOfStone") );
      listenTo samePlayer;
      :characterStatus(MightOfStone, "@self");
      :setVariable("shouldAttachCatalysisOfStone", 0);
    }
  }
}

/**
 * @id 26046
 * @name 大师之击
 * @description
 * 【被动】如果敌方场上存在护盾或减伤状态，我方角色使用技能后，自身附属1层摧岩伟力。
 */
define skill {
  id 26046 as MastersStrikePassive;
  skillType passive;
  reserved;
}

/**
 * @id 2604
 * @name 黑蛇骑士·摧岩之钺
 * @description
 * 「在宫廷当中颇具地位的近卫军人，以名唤「至真之术」的剑斗技巧，扫除王家的敌人。」
 */
define character {
  id 2604 as BlackSerpentKnightRockbreakerAx;
  since "v6.2.0";
  tags geo, monster;
  health 12;
  energy 2;
  skills SupremeStrike, AxeAndAegis, StoneStance, AttackingMomentum, GreataxeStrike, MastersStrike, MastersStrike;
}

/**
 * @id 226041
 * @name 「曾如磐石抵挡黑水奔流…」
 * @description
 * 战斗行动：我方出战角色为黑蛇骑士·摧岩之钺时，装备此牌。
 * 打出或行动阶段开始时：使黑蛇骑士·摧岩之钺附着岩元素。
 * （牌组中包含黑蛇骑士·摧岩之钺，才能加入牌组）
 */
define card {
  id 226041 as OnceStoodAgainstTheTideOfDarkWatersLikeBedrock;
  since "v6.2.0";
  cost DiceType.Geo, 1;
  talent BlackSerpentKnightRockbreakerAx {
    on enter {
      :apply(DamageType.Geo, "@master");
    }
    on actionPhase {
      :apply(DamageType.Geo, "@master");
    }
  }
}
