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

import { card, character, combatStatus, customEvent, DamageType, DiceType, skill, status, type CardHandle, type EntityState } from "@gi-tcg/core/builder";
import { BountifulCore } from "../hydro/nilou.gts";
import { DendroCore } from "../../commons.gts";

export const ShouldTriggerTalent = customEvent<EntityState>("kaveh/shouldTriggerTalent");
/**
 * @id 117082
 * @name 迸发扫描
 * @description
 * 双方选择行动前：如果我方场上存在草原核或丰穰之核，则使其可用次数-1，并舍弃我方牌库顶的1张卡牌。然后，造成所舍弃卡牌当前元素骰费用的草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
define combatStatus {
  id 117082 as BurstScan;
  on beforeAction {
    when :( :$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`) );
    listenTo all;
    :disposeCard(:player.pile[0]);
  }
  on disposeCard {
    when :( :e.via?.caller.id === :self.id );
    usage 1 {
      append 3;
    };
    :$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`)?.consumeUsage(1);
    const cost = :e.entity.diceCost();
    :damage(DamageType.Dendro, cost);
    :emitCustomEvent(ShouldTriggerTalent, :e.entity.latest());
  }
}

/**
 * @id 117081
 * @name 梅赫拉克的助力
 * @description
 * 角色「普通攻击」造成的伤害+1，且造成的物理伤害变为草元素伤害。
 * 角色普通攻击后：生成迸发扫描。
 * 持续回合：2
 */
define status {
  id 117081 as MehraksAssistance;
  duration 2;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Dendro);
  }
  on useSkill {
    when :( :e.isSkillType("normal") );
    :combatStatus(BurstScan);
  }
}

/**
 * @id 117083
 * @name 预算师的技艺（生效中）
 * @description
 * 我方下次打出「场地」支援牌时：少花费2个元素骰。
 */
define combatStatus {
  id 117083 as TheArtOfBudgetingInEffect;
  once deductOmniDiceCard {
    when :( :e.action.skill.caller.definition.tags.includes("place") );
    :e.deductOmniCost(2);
  }
}

/**
 * @id 17081
 * @name 旋规设矩
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17081 as SchematicSetup;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17082
 * @name 画则巧施
 * @description
 * 造成2点草元素伤害，生成迸发扫描。
 */
define skill {
  id 17082 as ArtisticIngenuity;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :damage(DamageType.Dendro, 2);
  :combatStatus(BurstScan);
}

/**
 * @id 17083
 * @name 繁绘隅穹
 * @description
 * 造成3点草元素伤害，本角色附属梅赫拉克的助力，生成2层迸发扫描。
 */
define skill {
  id 17083 as PaintedDome;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 3);
  :characterStatus(MehraksAssistance, "@self");
  :combatStatus(BurstScan, "my", {
      overrideVariables: { usage: 2 }
    });
}

/**
 * @id 1708
 * @name 卡维
 * @description
 * 体悟、仁爱与识美之知。
 */
define character {
  id 1708 as Kaveh;
  since "v4.7.0";
  tags dendro, claymore, sumeru;
  health 12;
  energy 2;
  skills SchematicSetup, ArtisticIngenuity, PaintedDome;
}

/**
 * @id 217081
 * @name 预算师的技艺
 * @description
 * 战斗行动：我方出战角色为卡维时，装备此牌。
 * 卡维装备此牌后，立刻使用一次画则巧施。
 * 装备有此牌的卡维在场，我方触发迸发扫描的效果后：将1张所舍弃卡牌的复制加入你的手牌。如果该牌为「场地」牌，则使本回合中我方下次打出「场地」时少花费2个元素骰。（每回合1次）
 * （牌组中包含卡维，才能加入牌组）
 */
define card {
  id 217081 as TheArtOfBudgeting;
  since "v4.7.0";
  cost DiceType.Dendro, 3;
  talent Kaveh {
    on enter {
      :useSkill(ArtisticIngenuity);
    }
    on ShouldTriggerTalent {
      listenTo samePlayer;
      usage perRound, 1;
      const cardDef = :e.arg.definition;
      :createHandCard(cardDef.id as CardHandle);
      if (cardDef.tags.includes("place")) {
        :combatStatus(TheArtOfBudgetingInEffect);
      }
    }
  }
}
