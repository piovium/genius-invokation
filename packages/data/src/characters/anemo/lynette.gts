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

import { card, character, combatStatus, DamageType, DiceType, skill, status, summon, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115083
 * @name 惊奇猫猫盒的嘲讽
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。（每回合1次）
 */
define combatStatus {
  id 115083 as BogglecatBoxsTaunt;
  tags barrier;
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 1;
    :e.decreaseDamage(1);
  }
}

/**
 * @id 115082
 * @name 惊奇猫猫盒
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：2
 * 我方出战角色受到伤害时：抵消1点伤害。（每回合1次）
 * 我方角色受到冰/水/火/雷伤害时：转换此牌的元素类型，改为造成所受到的元素类型的伤害。（离场前仅限一次）
 */
define summon {
  id 115082 as BogglecatBox;
  hint swirled, 1;
  on endPhase {
    usage 2;
    :damage(:self.variables.hintIcon, 1);
  }
  on enter {
    :combatStatus(BogglecatBoxsTaunt);
  }
  on actionPhase {
    :combatStatus(BogglecatBoxsTaunt);
  }
  on selfDispose {
    :$(`my combat status with definition id ${BogglecatBoxsTaunt}`)?.dispose();
  }
}

/**
 * @id 115081
 * @name 攻袭余威
 * @description
 * 结束阶段：如果角色生命值至少为6，则受到2点穿透伤害。
 * 持续回合：1
 */
define status {
  id 115081 as OverawingAssault;
  duration 1;
  on endPhase {
    when :( :self.master.health >= 6 );
    :damage(DamageType.Piercing, 2, "@master");
  }
}

/**
 * @id 15081
 * @name 迅捷礼刺剑
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 15081 as RapidRitesword;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 15082
 * @name 谜影障身法
 * @description
 * 造成3点风元素伤害，本回合第一次使用此技能、且自身生命值不多于8时治疗自身2点，但是附属攻袭余威。
 */
define skill {
  id 15082 as EnigmaticFeint;
  skillType elemental;
  cost DiceType.Anemo, 3;
  const count = :countOfSkill();
  if (count === 0 && :self.health <= 8) {
    :heal(2, "@self");
    :characterStatus(OverawingAssault, "@self");
  }
  if (count === 1 && :self.hasEquipment(AColdBladeLikeAShadow)) {
    :damage(DamageType.Anemo, 5);
    :switchActive("opp prev");
  } else {
    :damage(DamageType.Anemo, 3);
  }
}

/**
 * @id 15083
 * @name 魔术·运变惊奇
 * @description
 * 造成2点风元素伤害，召唤惊奇猫猫盒。
 */
define skill {
  id 15083 as MagicTrickAstonishingShift;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 2);
  :summon(BogglecatBox);
}

/**
 * @id 1508
 * @name 琳妮特
 * @description
 * 水中窥月，洞见夜明。
 */
define character {
  id 1508 as Lynette;
  since "v4.3.0";
  tags anemo, sword, fontaine, fatui, pneuma;
  health 10;
  energy 2;
  skills RapidRitesword, EnigmaticFeint, MagicTrickAstonishingShift;
}

/**
 * @id 215081
 * @name 如影流露的冷刃
 * @description
 * 战斗行动：我方出战角色为琳妮特时，装备此牌。
 * 琳妮特装备此牌后，立刻使用一次谜影障身法。
 * 装备有此牌的琳妮特每回合第二次使用谜影障身法时：伤害+2，并强制敌方切换到前一个角色。
 * （牌组中包含琳妮特，才能加入牌组）
 */
define card {
  id 215081 as AColdBladeLikeAShadow;
  since "v4.3.0";
  cost DiceType.Anemo, 3;
  talent Lynette {
    on enter {
      :useSkill(EnigmaticFeint);
    }
  }
}
