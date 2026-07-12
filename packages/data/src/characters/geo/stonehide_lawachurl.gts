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
 * @id 126012
 * @name 坚岩之力
 * @description
 * 角色造成的物理伤害变为岩元素伤害。
 * 每回合1次：角色造成的伤害+1。
 * 角色所附属的「岩盔」被移除后：也移除此状态。
 */
define status {
  id 126012 as StoneForce;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Geo);
  }
  on increaseSkillDamage {
    usage perRound, 1;
    :e.increaseDamage(1);
  }
  on dispose {
    when :( :e.entity.definition.id === Stonehide );
    :dispose();
  }
}

/**
 * @id 126011
 * @name 岩盔
 * @description
 * 所附属角色受到伤害时：抵消1点伤害。抵消岩元素伤害时，需额外消耗1次可用次数。
 * 可用次数：3
 */
define status {
  id 126011 as Stonehide;
  tags barrier;
  on decreaseDamaged {
    usage 3;
    :e.decreaseDamage(1);
    if (:e.type === DamageType.Geo) {
      :addVariable("usage", -1);
    }
  }
}

/**
 * @id 26011
 * @name Plama Lawa
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 26011 as PlamaLawa;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 26012
 * @name Movo Lawa
 * @description
 * 造成3点物理伤害。
 */
define skill {
  id 26012 as MovoLawa;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Physical, 3);
}

/**
 * @id 26013
 * @name Upa Shato
 * @description
 * 造成5点物理伤害。
 */
define skill {
  id 26013 as UpaShato;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Physical, 5);
}

/**
 * @id 26014
 * @name 魔化：岩盔
 * @description
 * 【被动】战斗开始时，初始附属岩盔和坚岩之力。
 */
define skill {
  id 26014 as InfusedStonehide;
  skillType passive {
    on battleBegin {
      :characterStatus(Stonehide);
      :characterStatus(StoneForce);
    }
  }
}

/**
 * @id 2601
 * @name 丘丘岩盔王
 * @description
 * 绕道而行吧，因为前方是属于「王」的领域。
 */
define character {
  id 2601 as StonehideLawachurl;
  since "v3.3.0";
  tags geo, monster, hilichurl;
  health 10;
  energy 2;
  skills PlamaLawa, MovoLawa, UpaShato, InfusedStonehide;
}

/**
 * @id 226011
 * @name 重铸：岩盔
 * @description
 * 战斗行动：我方出战角色为丘丘岩盔王时，装备此牌。
 * 丘丘岩盔王装备此牌后，立刻使用一次Upa Shato。
 * 装备有此牌的丘丘岩盔王击倒敌方角色后：丘丘岩盔王重新附属岩盔和坚岩之力。
 * （牌组中包含丘丘岩盔王，才能加入牌组）
 */
define card {
  id 226011 as StonehideReforged;
  since "v3.3.0";
  cost DiceType.Geo, 4;
  cost DiceType.Energy, 2;
  talent StonehideLawachurl {
    on enter {
      :useSkill(UpaShato);
    }
    on defeated {
      when :( :e.source.id === :self.master.id );
      listenTo all;
      :characterStatus(Stonehide, "@master");
      :characterStatus(StoneForce, "@master");
    }
  }
}
