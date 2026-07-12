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

import { card, character, combatStatus, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";
import { AgileSwitch } from "../../commons.gts";

/**
 * @id 114141
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 夜魂值为0时，退出夜魂加持。
 */
define status {
  id 114141 as NightsoulsBlessing;
  since "v6.0.0";
  nightsoulsBlessing 2 {
    autoDispose;
  };
}

/**
 * @id 114142
 * @name 动能标示
 * @description
 * 我方角色造成伤害时：使该次伤害+2。如果伊安珊处于夜魂加持，则不消耗可用次数，改为消耗伊安珊1点「夜魂值」。
 * 可用次数：2
 */
define combatStatus {
  id 114142 as KineticEnergyScale;
  since "v6.0.0";
  on increaseSkillDamage {
    usage 2 {
      autoDecrease false;
    };
    :e.increaseDamage(2);
    const iansan = :$(`my character with definition id ${Iansan}`);
    if (iansan?.hasNightsoulsBlessing()){
      :consumeNightsoul(iansan);
    } else {
      :consumeUsage();
    }
  }
}


/**
 * @id 14141
 * @name 负重锥击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14141 as WeightedSpike;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14142
 * @name 电掣雷驰
 * @description
 * 造成2点雷元素伤害，自身进入夜魂加持，获得1点「夜魂值」，生成1层敏捷切换。
 */
define skill {
  id 14142 as ThunderboltRush;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 2);
  :gainNightsoul("@self", 1);
  :combatStatus(AgileSwitch);
}

/**
 * @id 14143
 * @name 力的三原理
 * @description
 * 造成2点雷元素伤害，自身进入夜魂加持，获得1点「夜魂值」，生成动能标示。
 */
define skill {
  id 14143 as TheThreePrinciplesOfPower;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 2);
  :gainNightsoul("@self", 1);
  if (:self.hasEquipment(TeachingsOfTheCollectiveOfPlenty)) {
    :combatStatus(KineticEnergyScale, "my", {
      overrideVariables: { usage: 3 }
    });
  }
  else {
    :combatStatus(KineticEnergyScale);
  }
}

/**
 * @id 14144
 * @name 热量均衡计划
 * @description
 * 【被动】自身处于夜魂加持时，我方角色准备技能或累计2次「切换角色」后，如果「夜魂值」为2，则治疗我方受伤最多的角色1点，否则，获得1点「夜魂值」。（每回合3次）
 */
define skill {
  id 14144 as CaloricBalancingPlan01;
  skillType passive {
    variable switchCount, 0;
    variable gainNightsoulPassiveUsagePerRound, 3;
    defineSnippet :{
      const nightsoul = :self.hasNightsoulsBlessing();
      if (!nightsoul) {
        return;
      }
      if (nightsoul.getVariable("nightsoul") === 2) {
        :heal(1, "my characters order by health - maxHealth limit 1");
      } else {
        :gainNightsoul("@self");
      }
      :addVariable("gainNightsoulPassiveUsagePerRound", -1);
    };
    // 我方角色准备技能
    on enterRelative {
      when :( :self.hasNightsoulsBlessing() &&
          :getVariable("gainNightsoulPassiveUsagePerRound") &&
          :e.entity.definition.type === "status" &&
          :e.entity.definition.tags.includes("preparingSkill") );
      listenTo samePlayer;
      :callSnippet();
    }
    // 或累计2次……
    on switchActive {
      when :( :self.hasNightsoulsBlessing() );
      listenTo samePlayer;
      :addVariable("switchCount", 1);
    }
    // ……「切换角色」后
    on switchActive {
      when :( :self.hasNightsoulsBlessing() &&
          :getVariable("gainNightsoulPassiveUsagePerRound") &&
          :getVariable("switchCount") % 2 === 0 );
      listenTo samePlayer;
      :callSnippet();
    }
    on roundEnd {
      :setVariable("gainNightsoulPassiveUsagePerRound", 3);
    }
  }
}

/**
 * @id 14145
 * @name 热量均衡计划
 * @description
 * 【被动】自身处于夜魂加持时，我方角色准备技能或累计2次「切换角色」后，如果「夜魂值」为2，则治疗我方受伤最多的角色1点，否则，获得1点「夜魂值」。（每回合3次）
 */
define skill {
  id 14145 as CaloricBalancingPlan02;
  skillType passive {
    reserved;
  }
}

/**
 * @id 14146
 * @name 热量均衡计划
 * @description
 * 【被动】自身处于夜魂加持时，我方角色准备技能或累计2次「切换角色」后，如果「夜魂值」为2，则治疗我方受伤最多的角色1点，否则，获得1点「夜魂值」。（每回合3次）
 */
define skill {
  id 14146 as CaloricBalancingPlan03;
  skillType passive {
    reserved;
  }
}

/**
 * @id 1414
 * @name 伊安珊
 * @description
 * 早睡早起，低糖低盐。
 */
define character {
  id 1414 as Iansan;
  since "v6.0.0";
  tags electro, pole, natlan;
  health 11;
  energy 2;
  skills WeightedSpike, ThunderboltRush, TheThreePrinciplesOfPower, CaloricBalancingPlan01;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 214141
 * @name 「沃陆之邦」的训教
 * @description
 * 战斗行动：我方出战角色为伊安珊时，装备此牌。
 * 伊安珊装备此牌后，立刻使用一次力的三原理。
 * 装备有此牌的伊安珊生成的动能标示，初始可用次数+1。
 * （牌组中包含伊安珊，才能加入牌组）
 */
define card {
  id 214141 as TeachingsOfTheCollectiveOfPlenty;
  since "v6.0.0";
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  talent Iansan {
    on enter {
      :useSkill(TheThreePrinciplesOfPower);
    }
  }
}
