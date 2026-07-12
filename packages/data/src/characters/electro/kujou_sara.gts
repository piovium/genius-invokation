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

import { character, skill, summon, status, card, DamageType, type SkillHandle, $, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 114063
 * @name 鸣煌护持
 * @description
 * 所附属角色元素战技和元素爆发造成的伤害+1。
 * 可用次数：2
 */
define status {
  id 114063 as CrowfeatherCover;
  on increaseSkillDamage {
    when :( :e.viaSkillType("elemental") || :e.viaSkillType("burst") );
    usage 2;
    :e.increaseDamage(1);
    if (:query($.my.typeEquipment.def(SinOfPride))) {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 114061
 * @name 天狗咒雷·伏
 * @description
 * 结束阶段：造成1点雷元素伤害，我方出战角色附属鸣煌护持。
 * 可用次数：1
 */
define summon {
  id 114061 as TenguJuuraiAmbush;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 1;
    :damage(DamageType.Electro, 1);
    :characterStatus(CrowfeatherCover, "my active");
  }
}

/**
 * @id 114062
 * @name 天狗咒雷·雷砾
 * @description
 * 结束阶段：造成2点雷元素伤害，我方出战角色附属鸣煌护持。
 * 可用次数：2
 */
define summon {
  id 114062 as TenguJuuraiStormcluster;
  hint DamageType.Electro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 2);
    :characterStatus(CrowfeatherCover, "my active");
  }
}

/**
 * @id 14061
 * @name 天狗传弓术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14061 as TenguBowmanship;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14062
 * @name 鸦羽天狗霆雷召咒
 * @description
 * 造成1点雷元素伤害，召唤天狗咒雷·伏。
 */
define skill {
  id 14062 as TenguStormcall;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 1);
  :summon(TenguJuuraiAmbush);
}

/**
 * @id 14063
 * @name 煌煌千道镇式
 * @description
 * 造成2点雷元素伤害，召唤天狗咒雷·雷砾。
 */
define skill {
  id 14063 as SubjugationKoukouSendou;
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 2);
  :summon(TenguJuuraiStormcluster);
}

/**
 * @id 1406
 * @name 九条裟罗
 * @description
 * 「此为，大义之举。」
 */
define character {
  id 1406 as KujouSara;
  since "v3.5.0";
  tags electro, bow, inazuma;
  health 10;
  energy 2;
  skills TenguBowmanship, TenguStormcall, SubjugationKoukouSendou;
}

/**
 * @id 214061
 * @name 我界
 * @description
 * 战斗行动：我方出战角色为九条裟罗时，装备此牌。
 * 九条裟罗装备此牌后，立刻使用一次鸦羽天狗霆雷召咒。
 * 装备有此牌的九条裟罗在场时，我方附属有鸣煌护持的角色，元素战技和元素爆发造成的伤害额外+1。
 * （牌组中包含九条裟罗，才能加入牌组）
 */
define card {
  id 214061 as SinOfPride;
  since "v3.5.0";
  cost DiceType.Electro, 3;
  talent KujouSara {
    on enter {
      :useSkill(TenguStormcall);
    }
  }
}
