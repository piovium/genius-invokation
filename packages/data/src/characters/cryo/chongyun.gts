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

import { card, character, combatStatus, DamageType, DiceType, skill, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111042
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害，普通攻击造成的伤害+1。
 * 持续回合：2
 */
define combatStatus {
  id 111042 as ChonghuaFrostField01;
  conflictWith 111041;
  duration 2;
  on modifySkillDamageType {
    when :{
      if (:e.type !== DamageType.Physical) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.changeDamageType(DamageType.Cryo);
  }
  on increaseSkillDamage {
    when :{
      if (!:e.viaSkillType("normal")) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 111041
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害。
 * 持续回合：2
 */
define combatStatus {
  id 111041 as ChonghuaFrostField;
  conflictWith 111042;
  duration 2;
  on modifySkillDamageType {
    when :{
      if (:e.type !== DamageType.Physical) return false;
      const { tags } = :e.source.cast<"character">().definition;
      return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
    };
    :e.changeDamageType(DamageType.Cryo);
  }
}

/**
 * @id 11041
 * @name 灭邪四式
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11041 as Demonbane;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11042
 * @name 重华叠霜
 * @description
 * 造成3点冰元素伤害，生成重华叠霜领域。
 */
define skill {
  id 11042 as ChonghuasLayeredFrost;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
  if (:self.hasEquipment(SteadyBreathing)) {
    :combatStatus(ChonghuaFrostField01);
  }
  else {
    :combatStatus(ChonghuaFrostField);
  }
}

/**
 * @id 11043
 * @name 云开星落
 * @description
 * 造成7点冰元素伤害。
 */
define skill {
  id 11043 as CloudpartingStar;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Cryo, 7);
}

/**
 * @id 1104
 * @name 重云
 * @description
 * 「夏天啊，你还是悄悄过去吧…」
 */
define character {
  id 1104 as Chongyun;
  since "v3.3.0";
  tags cryo, claymore, liyue;
  health 10;
  energy 3;
  skills Demonbane, ChonghuasLayeredFrost, CloudpartingStar;
}

/**
 * @id 211041
 * @name 吐纳真定
 * @description
 * 战斗行动：我方出战角色为重云时，装备此牌。
 * 重云装备此牌后，立刻使用一次重华叠霜。
 * 装备有此牌的重云生成的重华叠霜领域获得以下效果：
 * 使我方单手剑、双手剑或长柄武器角色的普通攻击伤害+1。
 * （牌组中包含重云，才能加入牌组）
 */
define card {
  id 211041 as SteadyBreathing;
  since "v3.3.0";
  cost DiceType.Cryo, 3;
  talent Chongyun {
    on enter {
      :useSkill(ChonghuasLayeredFrost);
    }
  }
}
