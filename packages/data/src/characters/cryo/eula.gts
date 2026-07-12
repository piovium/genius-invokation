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
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此卡牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成4点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
define summon {
  id 111062 as LightfallSword;
  hint DamageType.Physical, "4+";
  usage 0 {
    autoDispose false;
  };
  on useSkill {
    when :( :e.skill.definition.id === FavoniusBladeworkEdel ||
        :e.skill.definition.id === IcetideVortex );
    if (:e.skill.definition.id === IcetideVortex &&
      :e.skillCaller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      :self.addVariable("usage", 3);
    } else {
      :self.addVariable("usage", 2);
    }
  }
  on endPhase {
    :damage(DamageType.Physical, 4 + :getVariable("usage"));
    :dispose();
  }
}

/**
 * @id 111061
 * @name 冷酷之心
 * @description
 * 所附属角色使用冰潮的涡旋时：移除此状态，使本次伤害+3。
 */
define status {
  id 111061 as Grimheart;
  on increaseSkillDamage {
    when :( :e.damageInfo.via.definition.id === IcetideVortex );
    :e.increaseDamage(3);
    :dispose();
  }
}

/**
 * @id 11061
 * @name 西风剑术·宗室
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11061 as FavoniusBladeworkEdel;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  noEnergy;
  :damage(DamageType.Physical, 2);
  if (!:$(`my summons with definition id ${LightfallSword}`)) {
    :gainEnergy(1, "@self");
  }
}

/**
 * @id 11062
 * @name 冰潮的涡旋
 * @description
 * 造成2点冰元素伤害，如果本角色未附属冷酷之心，则使其附属冷酷之心。
 */
define skill {
  id 11062 as IcetideVortex;
  skillType elemental;
  cost DiceType.Cryo, 3;
  noEnergy;
  const hasHeart = :self.hasStatus(Grimheart);
  :damage(DamageType.Cryo, 2);
  if (!hasHeart) {
    :characterStatus(Grimheart, "@self");
  }
  if (!:$(`my summons with definition id ${LightfallSword}`)) {
    :gainEnergy(1, "@self");
  }
}

/**
 * @id 11063
 * @name 凝浪之光剑
 * @description
 * 造成2点冰元素伤害，召唤光降之剑。
 */
define skill {
  id 11063 as GlacialIllumination;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Cryo, 2);
  :summon(LightfallSword);
}

/**
 * @id 1106
 * @name 优菈
 * @description
 * 这只是一场游戏，无论是取胜或落败，你都不会因此被添上罪状。
 */
define character {
  id 1106 as Eula;
  since "v3.5.0";
  tags cryo, claymore, mondstadt;
  health 10;
  energy 2;
  skills FavoniusBladeworkEdel, IcetideVortex, GlacialIllumination;
}

/**
 * @id 211061
 * @name 战欲涌现
 * @description
 * 战斗行动：我方出战角色为优菈时，装备此牌。
 * 优菈装备此牌后，立刻使用一次凝浪之光剑。
 * 装备有此牌的优菈使用冰潮的涡旋时：额外为光降之剑累积1点「能量层数」。
 * （牌组中包含优菈，才能加入牌组）
 */
define card {
  id 211061 as WellspringOfWarlust;
  since "v3.5.0";
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  talent Eula {
    on enter {
      :useSkill(GlacialIllumination);
    }
  }
}
