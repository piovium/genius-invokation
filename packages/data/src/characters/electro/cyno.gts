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
 * @id 114041
 * @name 启途誓使
 * @description
 * 结束阶段：累积1级「凭依」。如果「凭依」级数至少为8，则「凭依」级数-6。
 * 根据「凭依」级数，提供效果：
 * 大于等于2级：物理伤害转化为雷元素伤害；
 * 大于等于4级：造成的伤害+2。
 */
define status {
  id 114041 as PactswornPathclearer;
  variable reliance, 0;
  on endPhase {
    const newVal = :getVariable("reliance") + 1;
    if (newVal >= 8) {
      :setVariable("reliance", newVal - 6);
    } else {
      :setVariable("reliance", newVal);
    }
  }
  on modifySkillDamageType {
    when :( :getVariable("reliance") >= 2 && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :getVariable("reliance") >= 4 );
    :e.increaseDamage(2);
  }
}

/**
 * @id 14041
 * @name 七圣枪术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14041 as InvokersSpear;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14042
 * @name 秘仪·律渊渡魂
 * @description
 * 造成3点雷元素伤害，
 * 启途誓使的「凭依」级数+1。
 */
define skill {
  id 14042 as SecretRiteChasmicSoulfarer;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
  const status = :self.hasStatus(PactswornPathclearer)!;
  status.addVariable("reliance", 1);
}

/**
 * @id 14043
 * @name 圣仪·煟煌随狼行
 * @description
 * 造成4点雷元素伤害，
 * 启途誓使的「凭依」级数+2。
 */
define skill {
  id 14043 as SacredRiteWolfsSwiftness;
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 4);
  const status = :self.hasStatus(PactswornPathclearer)!;
  status.addVariable("reliance", 2);
}

/**
 * @id 14044
 * @name 行度誓惩
 * @description
 * 【被动】战斗开始时，初始附属启途誓使。
 */
define skill {
  id 14044 as LawfulEnforcer;
  skillType passive {
    on battleBegin {
      :characterStatus(PactswornPathclearer);
    }
    on revive {
      :characterStatus(PactswornPathclearer);
    }
  }
}

/**
 * @id 1404
 * @name 赛诺
 * @description
 * 卡牌中蕴藏的，是大风纪官如沙漠烈日般炙热的喜爱之情。
 */
define character {
  id 1404 as Cyno;
  since "v3.3.0";
  tags electro, pole, sumeru;
  health 10;
  energy 2;
  skills InvokersSpear, SecretRiteChasmicSoulfarer, SacredRiteWolfsSwiftness, LawfulEnforcer;
}

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数至少为2时，使用秘仪·律渊渡魂造成的伤害+1。（每回合至多2次）
 * （牌组中包含赛诺，才能加入牌组）
 */
define card {
  id 214041 as FeatherfallJudgment;
  since "v3.3.0";
  cost DiceType.Electro, 3;
  talent Cyno {
    on enter {
      :useSkill(SecretRiteChasmicSoulfarer);
    }
    on increaseSkillDamage {
      when :{
        const status = :self.master.hasStatus(PactswornPathclearer)!;
        return :getVariable("reliance", status) >=2 && :e.via.definition.id === SecretRiteChasmicSoulfarer;
      };
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}
