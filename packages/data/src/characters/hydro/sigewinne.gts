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

import { card, character, combatStatus, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { SourcewaterDroplet } from "./neuvillette.gts";
import { BondOfLife } from "../../commons.gts";

/**
 * @id 12135
 * @name 满满心意药剂冲击
 * @description
 * 造成2点水元素伤害。
 */
define skill {
  id 12135 as MedicalInterventionOfPureIntention;
  skillType burst;
  prepared;
  :damage(DamageType.Hydro, 2);
}

/**
 * @id 112134
 * @name 满满心意药剂冲击
 * @description
 * 本角色将在下次行动时，直接使用技能：满满心意药剂冲击。
 */
define status {
  id 112134 as MedicalInterventionOfPureIntentionStatus;
  since "v5.2.0";
  prepare MedicalInterventionOfPureIntention;
}

/**
 * @id 112135
 * @name 静养
 * @description
 * 我方「元素战技」或召唤物造成的伤害+1。
 * 可用次数：2
 */
define combatStatus {
  id 112135 as Convalescence;
  since "v5.2.0";
  on increaseDamage {
    when :( :e.viaSkillType("elemental") || :e.source.definition.type === "summon" );
    usage 2;
    :e.increaseDamage(1);
  }
}

// 所附属角色的生命之契完全移除后，提高此角色1点最大生命值。
define status {
  id 112136 as DetailedDiagnosisThoroughTreatmentStatus;
  noDefaultDispose;
  on dispose {
    when :( :e.entity.definition.id === BondOfLife );
    usage 3;
    :increaseMaxHealth(1, "@master");
  }
}

/**
 * @id 112133
 * @name 激愈水球·小
 * @description
 * 抓到此牌时：治疗所有我方角色1点，生成源水之滴。
 */
export const SmallBolsteringBubblebalm = card(112133)
  .since("v5.2.0")
  .undiscoverable()
  .descriptionOnHCI()
  .heal(1, "all my characters")
  .combatStatus(SourcewaterDroplet)
  .done();


/**
 * @id 112132
 * @name 激愈水球·中
 * @description
 * 抓到此牌时：对所在阵营的出战角色造成2点水元素伤害。生成1张激愈水球·小，将其置于对方牌库顶部。
 */
export const MediumBolsteringBubblebalm = card(112132)
  .since("v5.2.0")
  .undiscoverable()
  .descriptionOnHCI()
  .damage(DamageType.Hydro, 2, "my active")
  .createPileCards(SmallBolsteringBubblebalm, 1, "top", "opp")
  .done();

/**
 * @id 112131
 * @name 激愈水球·大
 * @description
 * 抓到此牌时：治疗我方出战角色3点。生成1张激愈水球·中，将其置于对方牌库顶部第2张牌的位置。
 */
export const LargeBolsteringBubblebalm = card(112131)
  .since("v5.2.0")
  .undiscoverable()
  .descriptionOnHCI()
  .heal(3, "my active")
  .createPileCards(MediumBolsteringBubblebalm, 1, "topIndex1", "opp")
  .done();

/**
 * @id 12131
 * @name 靶向治疗
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12131 as TargetedTreatment;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12132
 * @name 弹跳水疗法
 * @description
 * 生成1张激愈水球·大，将其置于我方牌库顶部第3张牌的位置，本角色附属3层生命之契。（触发激愈水球·大的效果后，会生成激愈水球·中并置入对方牌库；触发激愈水球·中的效果后，会生成激愈水球·小并置入我方牌库）
 */
define skill {
  id 12132 as ReboundHydrotherapy;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :createPileCards(LargeBolsteringBubblebalm, 1, "topIndex2");
  :characterStatus(BondOfLife, "@self", {
      overrideVariables: {
        usage: 3
      }
    });
}

/**
 * @id 12133
 * @name 过饱和心意注射
 * @description
 * 造成2点水元素伤害，然后准备技能：满满心意药剂冲击。
 */
define skill {
  id 12133 as SuperSaturatedSyringing;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :characterStatus(MedicalInterventionOfPureIntentionStatus, "@self");
}

/**
 * @id 12134
 * @name 细致入微的诊疗
 * @description
 * 【被动】我方角色所附属的生命之契被完全移除后，该角色获得1点额外最大生命值。（对每名角色最多生效3次）
 * 我方切换到本角色时：如果我方场上存在源水之滴，则使其可用次数-1，本角色获得1点充能。
 */
define skill {
  id 12134 as DetailedDiagnosisThoroughTreatment01;
  skillType passive {
    on battleBegin {
      :characterStatus(DetailedDiagnosisThoroughTreatmentStatus, "all my characters");
    }
    on revive {
      :characterStatus(DetailedDiagnosisThoroughTreatmentStatus, "all my characters");
    }
  }
}

/**
 * @id 12136
 * @name 细致入微的诊疗
 * @description
 *
 */
define skill {
  id 12136 as DetailedDiagnosisThoroughTreatment02;
  skillType passive {
    on defeated {
      :dispose(`all my status with definition id ${DetailedDiagnosisThoroughTreatmentStatus}`);
    }
  }
}

/**
 * @id 12137
 * @name 细致入微的诊疗
 * @description
 * 【被动】我方切换到本角色时：如果我方场上存在源水之滴，则使其可用次数-1，本角色获得1点充能。
 */
define skill {
  id 12137 as DetailedDiagnosisThoroughTreatment03;
  skillType passive {
    on switchActive {
      when :( :e.switchInfo.to.id === :self.id );
      const droplet = :$(`my combat status with definition id ${SourcewaterDroplet}`);
      if (droplet) {
        :consumeUsage(1, droplet);
        :gainEnergy(1, "@self");
      }
    }
  }
}

/**
 * @id 1213
 * @name 希格雯
 * @description
 * 「圣洁之灵，请听我愿。」
 */
define character {
  id 1213 as Sigewinne;
  since "v5.2.0";
  tags hydro, bow, fontaine, pneuma;
  health 12;
  energy 2;
  skills TargetedTreatment, ReboundHydrotherapy, SuperSaturatedSyringing, DetailedDiagnosisThoroughTreatment01, MedicalInterventionOfPureIntention, DetailedDiagnosisThoroughTreatment02, DetailedDiagnosisThoroughTreatment03;
}

/**
 * @id 212131
 * @name 应当有适当的休憩
 * @description
 * 战斗行动：我方出战角色为希格雯时，装备此牌。
 * 希格雯装备此牌后，立刻使用一次弹跳水疗法。
 * 装备有此牌的希格雯使用弹跳水疗法后，使我方接下来2次「元素战技」或召唤物造成的伤害+1。
 * （牌组中包含希格雯，才能加入牌组）
 */
define card {
  id 212131 as RequiresAppropriateRest;
  since "v5.2.0";
  cost DiceType.Hydro, 3;
  talent Sigewinne {
    on enter {
      :useSkill(ReboundHydrotherapy);
    }
    on useSkill {
      when :( :e.skill.definition.id === ReboundHydrotherapy );
      :combatStatus(Convalescence);
    }
  }
}
