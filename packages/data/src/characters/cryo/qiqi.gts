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

import { $, card, character, combatStatus, DamageType, DiceType, extension, skill, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111081
 * @name 寒病鬼差
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：3
 * 此召唤物在场时，七七使用「普通攻击」后：治疗受伤最多的我方角色1点；每回合1次：再治疗我方出战角色1点。
 */
define summon {
  id 111081 as HeraldOfFrost;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Cryo, 1);
  }
  on useSkill {
    when :( :e.skill.caller.definition.id === Qiqi && :e.isSkillType("normal") );
    :heal(1, "my characters order by health - maxHealth limit 1");
  }
  on useSkill {
    when :( :e.skill.caller.definition.id === Qiqi && :e.isSkillType("normal") );
    usage perRound, 1;
    :heal(1, "my active");
  }
}

/**
 * @id 111082
 * @name 度厄真符
 * @description
 * 我方角色使用技能后：如果该角色生命值未满，则治疗该角色2点。
 * 可用次数：3
 */
define combatStatus {
  id 111082 as FortunepreservingTalisman;
  on useSkill {
    when :{
      if (:e.skill.definition.id === AdeptusArtPreserverOfFortune) {
        return false;
      }
      return :$(`@event.skillCaller and character with health < maxHealth`)
    };
    usage 3;
    :heal(2, "@event.skillCaller");
  }
}

/**
 * @id 11081
 * @name 云来古剑法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11081 as AncientSwordArt;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11082
 * @name 仙法·寒病鬼差
 * @description
 * 召唤寒病鬼差。
 */
define skill {
  id 11082 as AdeptusArtHeraldOfFrost;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :summon(HeraldOfFrost);
}

const RiteOfResurrectionUsedExtension = extension(211081, { count: "pair<number>" })
  .initialState({ count: [0, 0] })
  .description("本场对局中某方触发起死回骸的次数")
  .mutateWhen("onDamageOrHeal", (st, e) => {
    // 七七倒下时重置
    if (e.target.definition.id === Qiqi && e.damageInfo.causeDefeated) {
      st.count[e.targetWho] = 0;
    }
  })
  .done();

/**
 * @id 11083
 * @name 仙法·救苦度厄
 * @description
 * 造成3点冰元素伤害，生成度厄真符。
 */
define skill {
  id 11083 as AdeptusArtPreserverOfFortune;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  associateExtension RiteOfResurrectionUsedExtension;
  :damage(DamageType.Cryo, 3);
  :combatStatus(FortunepreservingTalisman);
  if (:self.hasEquipment(RiteOfResurrection) && 
    :getExtensionState().count[:self.who] < 2) {
    :setExtensionState((st) => st.count[:self.who]++);
    const defeated = :queryAll($.my.character.onlyDefeated);
    for (const ch of defeated) {
      ch.heal(2, { kind: "revive" });
    }
  }
}

/**
 * @id 1108
 * @name 七七
 * @description
 * 流转不息，生生不绝。
 */
define character {
  id 1108 as Qiqi;
  since "v4.0.0";
  tags cryo, sword, liyue;
  health 10;
  energy 3;
  skills AncientSwordArt, AdeptusArtHeraldOfFrost, AdeptusArtPreserverOfFortune;
}

/**
 * @id 211081
 * @name 起死回骸
 * @description
 * 战斗行动：我方出战角色为七七时，装备此牌。
 * 七七装备此牌后，立刻使用一次仙法·救苦度厄。
 * 装备有此牌的七七使用仙法·救苦度厄时：复苏我方所有倒下的角色，并治疗其2点。（整场牌局限制2次）
 * （牌组中包含七七，才能加入牌组）
 */
define card {
  id 211081 as RiteOfResurrection;
  since "v4.0.0";
  cost DiceType.Cryo, 4;
  cost DiceType.Energy, 3;
  talent Qiqi {
    on enter {
      :useSkill(AdeptusArtPreserverOfFortune);
    }
  }
}
