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

import { $, card, character, DamageType, DiceType, Reaction, skill, status, type CharacterHandle, type SkillHandle } from "@gi-tcg/core/builder";
import { Conductive, Thundercloud } from "../../commons.gts";

/**
 * @id 114181
 * @name 幽焰显迹
 * @description
 * 本回合所附属角色造成的物理伤害变为雷元素伤害，并且「普通攻击」造成的伤害+1。
 * 持续回合：1
 */
define status {
  id 114181 as ManifestFlame;
  since "v6.6.0";
  duration 1;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  }
}

/**
 * @id 14185
 * @name 雷霆交响
 * @description
 * 造成2点雷元素伤害，如果我方场上存在雷暴云，则造成的伤害额外+2。
 */
define skill {
  id 14185 as ThunderousSymphony;
  skillType burst;
  prepared;
  if (:query($.my.summon.def(Thundercloud))) {
    :damage(DamageType.Electro, 4);
  }
  else {
    :damage(DamageType.Electro, 2);
  }
}

/**
 * @id 114182
 * @name 雷霆交响
 * @description
 * 本角色将在下次行动时，直接使用技能：雷霆交响。
 */
define status {
  id 114182 as ThunderousSymphonyStatus;
  since "v6.6.0";
  prepare ThunderousSymphony;
}

/**
 * @id 14181
 * @name 扈圣魔枪
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14181 as PocztowyDemonspear;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14182
 * @name 古律·孤灯遗秘
 * @description
 * 每回合首次使用此技能时，造成1点雷元素伤害，自身附属幽焰显迹。再次使用此技能，消耗2点充能，自身准备技能：雷霆交响。
 */
define skill {
  id 14182 as AncientRiteArcaneLight;
  skillType elemental;
  cost DiceType.Electro, 2;
  filter :( :countOfSkill() === 0 || :self.energy >= 1 );
  if (:countOfSkill() === 0) {
    :damage(DamageType.Electro, 1);
    :characterStatus(ManifestFlame, :self);
  }
}

/**
 * @id 14183
 * @name 旧仪·夜客致访
 * @description
 * 造成6点雷元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
define skill {
  id 14183 as AncientRitualComethTheNight;
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 4;
  :damage(DamageType.Piercing, 2, $.opp.standby);
  :damage(DamageType.Electro, 6);
}

/**
 * @id 14184
 * @name 月兆祝赐·旧世潜藏
 * @description
 * 【被动】本局游戏中，敌方受到感电反应时，改为月感电反应。
 * 自身在场，敌方行动牌被赋予电击时：对敌方场上生命值最高的角色造成1点穿透伤害。
 */
define skill {
  id 14184 as MoonsignBenedictionOldWorldSecrets;
  skillType passive {
    on enterRelative {
      when :( !:e.entity.isMine() && :e.entity.definition.id === Conductive );
      listenTo all;
      :damage(DamageType.Piercing, 1, $.macros.oppMaxHealth);
    }
    on useSkill {
      when :( :e.skill.definition.id === AncientRiteArcaneLight &&
          :countOfSkill(Flins, AncientRiteArcaneLight) >= 2 &&
          :self.energy >= 2 );
      asSkillType elemental;
      :self.loseEnergy(2);
      :characterStatus(ThunderousSymphonyStatus, :self);
    }
  }
}

/**
 * @id 14186
 * @name 月兆祝赐·旧世潜藏
 * @description
 * 【被动】本局游戏中，敌方受到感电反应时，改为月感电反应。
 * 自身在场，敌方行动牌被赋予电击时：对敌方场上生命值最高的角色造成1点穿透伤害。
 */
define skill {
  id 14186 as MoonsignBenedictionOldWorldSecrets01;
  skillType passive {
    reserved;
  }
}

/**
 * @id 14187
 * @name 古律·孤灯遗秘
 * @description
 * （test）
 */
define skill {
  id 14187 as AncientRiteArcaneLight01;
  skillType elemental;
  reserved;
}

/**
 * @id 1418
 * @name 菲林斯
 * @description
 * 墓园灯火，引向深邃之暗。
 */
define character {
  id 1418 as Flins;
  since "v6.6.0";
  tags electro, pole, nodkrai;
  health 10;
  energy 4;
  skills PocztowyDemonspear, AncientRiteArcaneLight, AncientRitualComethTheNight, MoonsignBenedictionOldWorldSecrets, ThunderousSymphony;
  enabledLunarReactions Reaction.LunarElectroCharged;
}

/**
 * @id 214181
 * @name 拨开雪翳之幕
 * @description
 * 快速行动：装备给我方的菲林斯。
 * 菲林斯获得1点充能。
 * 我方触发月感电反应后：菲林斯获得1点充能。（每回合1次）
 * （牌组中包含菲林斯，才能加入牌组）
 */
define card {
  id 214181 as PartTheVeilOfSnow;
  since "v6.6.0";
  cost DiceType.Electro, 1;
  talent Flins, none {
    on enter {
      :gainEnergy(1, "@master");
    }
    on dealReaction {
      when :( :e.type === Reaction.LunarElectroCharged );
      listenTo samePlayer;
      usage perRound, 1;
      :gainEnergy(1, "@master");
    }
  }
}
