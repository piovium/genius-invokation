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

import { card, character, DamageType, DiceType, skill, status, summon, type StatusHandle } from "@gi-tcg/core/builder";
import { SheerCold } from "./la_signora.gts";

/**
 * @id 121033
 * @name 刺击冰棱
 * @description
 * 结束阶段：对敌方距离我方出战角色最近的角色造成1点冰元素伤害。
 * 可用次数：2
 */
define summon {
  id 121033 as PiercingIceridge;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1, "recent opp from my active");
  }
}

/**
 * @id 121034
 * @name 冰晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 */
define status {
  id 121034 as CryoCrystalCore;
  on beforeDefeated {
    :immune(1);
    if (:self.master.hasEquipment(SternfrostPrism)) {
      :characterStatus(SheerCold, "opp active");
    }
    :dispose();
  }
}

/**
 * @id 121031
 * @name 四迸冰锥
 * @description
 * 角色进行普通攻击时：对所有敌方后台角色造成1点穿透伤害。
 * 可用次数：1
 */
define status {
  id 121031 as OverwhelmingIce;
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 1;
    :damage(DamageType.Piercing, 1, "opp standby");
  }
}

/**
 * @id 21031
 * @name 冰锥迸射
 * @description
 * 造成1点冰元素伤害。
 */
define skill {
  id 21031 as IcespikeShot;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Cryo, 1);
}

/**
 * @id 21032
 * @name 圆舞冰环
 * @description
 * 造成3点冰元素伤害，本角色附属四迸冰锥。
 */
define skill {
  id 21032 as IceRingWaltz;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
  :characterStatus(OverwhelmingIce);
}

/**
 * @id 21033
 * @name 冰棱轰坠
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤刺击冰棱。
 */
define skill {
  id 21033 as PlungingIceShards;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Cryo, 2);
  :summon(PiercingIceridge);
}

/**
 * @id 21034
 * @name 冰晶核心
 * @description
 * 【被动】战斗开始时，初始附属冰晶核心。
 */
define skill {
  id 21034 as CryoCrystalCoreSkill;
  skillType passive {
    on battleBegin {
      :characterStatus(CryoCrystalCore);
    }
  }
}

/**
 * @id 121035
 * @name 冰晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到6点生命值。
 */
define status {
  id 121035 as CryoCrystalCore01;
  reserved;
}

/**
 * @id 121036
 * @name 冰晶核心
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到10点生命值。
 */
define status {
  id 121036 as CryoCrystalCore02;
  reserved;
}

/**
 * @id 2103
 * @name 无相之冰
 * @description
 * 代号为「塔勒特」的高级冰元素生命。
 * 似乎很不擅长球类运动…
 */
define character {
  id 2103 as CryoHypostasis;
  since "v4.4.0";
  tags cryo, monster;
  health 8;
  energy 2;
  skills IcespikeShot, IceRingWaltz, PlungingIceShards, CryoCrystalCoreSkill;
}

/**
 * @id 221031
 * @name 严霜棱晶
 * @description
 * 我方出战角色为无相之冰时，才能打出：使其附属冰晶核心。
 * 装备有此牌的无相之冰触发冰晶核心后：对敌方出战角色附属严寒。
 * （牌组中包含无相之冰，才能加入牌组）
 */
define card {
  id 221031 as SternfrostPrism;
  since "v4.4.0";
  cost DiceType.Cryo, 1;
  talent CryoHypostasis, active {
    on enter {
      :characterStatus(CryoCrystalCore, "@master");
    }
  }
}
