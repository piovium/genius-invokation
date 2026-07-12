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

import { card, character, combatStatus, DamageType, DiceType, skill, status, type CombatStatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 111174
 * @name 侦明
 * @description
 * 本回合所附属角色下次「普通攻击」少花费2个无色元素。
 */
define status {
  id 111174 as NAttackCostReduction;
  since "v6.4.0";
  oneDuration;
  once deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(2);
  }
}

/**
 * @id 111175
 * @name 爆裂信标
 * @description
 * 本回合所附属角色下次「普通攻击」造成的物理伤害+2。
 */
define status {
  id 111175 as PhysicalDmgIncrease01;
  since "v6.4.0";
  oneDuration;
  once increaseSkillDamage {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.increaseDamage(2);
  }
}

/**
 * @id 111171
 * @name 灵风
 * @description
 * 我方角色「普通攻击」后：该角色本回合下次「普通攻击」少花费2个无色元素。
 * 可用次数：1
 */
define combatStatus {
  id 111171 as WindOfBlessing;
  since "v6.4.0";
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 1;
    :characterStatus(NAttackCostReduction, "@event.skillCaller");
    if (:$(`my equipment with definition id ${CompanionsCounsel}`)) {
      :characterStatus(PhysicalDmgIncrease01, "@event.skillCaller");
    }
  }
}

/**
 * @id 111172
 * @name 鹰翎心得
 * @description
 * 我方角色「普通攻击」少花费1个元素骰。
 * 可用次数：2
 */
define combatStatus {
  id 111172 as Eagleplume;
  since "v6.4.0";
  on deductOmniDiceSkill {
    when :( :e.isSkillType("normal") );
    usage 2;
    :e.deductOmniCost(1);
  }
}

/**
 * @id 111173
 * @name 速射牵制（生效中）
 * @description
 * 我方造成的物理伤害+1。
 * 可用次数：1
 */
define combatStatus {
  id 111173 as PhysicalDmgIncrease;
  since "v6.4.0";
  on increaseDamage {
    when :( :e.type === DamageType.Physical );
    usage 1;
    :e.increaseDamage(1);
  }
}

/**
 * @id 111176
 * @name 鹰翎祝念
 * @description
 * 我方角色「普通攻击」后治疗自身1点。
 * 可用次数：2
 */
define combatStatus {
  id 111176 as EagleplumeBlessing;
  since "v6.4.0";
  on useSkill {
    when :( :e.isSkillType("normal") );
    usage 2;
    :heal(1, "@event.skillCaller");
  }
}

/**
 * @id 11171
 * @name 西风枪术·镝传
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 11171 as SpearOfFavoniusArrowsPassage;
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 11172
 * @name 星霜的流旋
 * @description
 * 造成2点冰元素伤害，生成灵风。
 */
define skill {
  id 11172 as StarfrostSwirl;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 2);
  :combatStatus(WindOfBlessing);
}

/**
 * @id 11173
 * @name 苍翎的颂愿
 * @description
 * 治疗我方全体角色1点，生成鹰翎心得和鹰翎祝念。
 */
define skill {
  id 11173 as SkyfeatherSong;
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :heal(1, "all my characters");
  :combatStatus(Eagleplume);
  :combatStatus(EagleplumeBlessing);
}

/**
 * @id 11174
 * @name 速射牵制
 * @description
 * 【被动】自身使用技能后：下次我方造成的物理伤害+1。（每回合2次）
 */
define skill {
  id 11174 as ReconnaissanceExperience;
  skillType passive {
    on useSkill {
      usage perRound, 2 {
        name "usagePerRound1";
      };
      :combatStatus(PhysicalDmgIncrease);
    }
  }
}

/**
 * @id 1117
 * @name 米卡
 * @description
 * 翎羽如穗，绘摹殊境。
 */
define character {
  id 1117 as Mika;
  since "v6.4.0";
  tags cryo, pole, mondstadt;
  health 10;
  energy 2;
  skills SpearOfFavoniusArrowsPassage, StarfrostSwirl, SkyfeatherSong, ReconnaissanceExperience;
}

/**
 * @id 211171
 * @name 依随的策援
 * @description
 * 战斗行动：我方出战角色为米卡时，装备此牌。
 * 米卡装备此牌后，立刻使用一次星霜的流旋。
 * 装备有此卡牌的米卡在场时，灵风触发后会额外使该角色本回合下次「普通攻击」造成的物理伤害+2。
 * （牌组中包含米卡，才能加入牌组）
 */
define card {
  id 211171 as CompanionsCounsel;
  since "v6.4.0";
  cost DiceType.Cryo, 3;
  talent Mika {
    on enter {
      :useSkill(StarfrostSwirl);
    }
  }
}
