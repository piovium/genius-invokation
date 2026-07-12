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

import { card, character, DamageType, DiceType, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 124031
 * @name 共鸣珊瑚珠
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 */
define summon {
  id 124031 as ResonantCoralOrb;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 124033
 * @name 原海明珠
 * @description
 * 所附属角色受到伤害时：抵消1点伤害；抵消来自召唤物的伤害时不消耗可用次数。
 * 可用次数：2
 * 此状态存在期间：所附属角色造成的伤害+1。
 */
define status {
  id 124033 as FontemerPearl01;
  tags barrier;
  reserved;
}

/**
 * @id 124032
 * @name 原海明珠
 * @description
 * 所附属角色受到伤害时：抵消1点伤害；每回合1次，抵消来自召唤物的伤害时不消耗可用次数。
 * 可用次数：2
 * 我方宣布结束时：如果所附属角色为「出战角色」，则抓1张牌。
 */
define status {
  id 124032 as FontemerPearl;
  tags barrier;
  variable decreaseDamageFromSummon, 0;
  on roundEnd {
    :setVariable("decreaseDamageFromSummon", 0);
  }
  on decreaseDamaged {
    usage 2 {
      autoDecrease false;
    };
    :e.decreaseDamage(1);
    if (:e.source.definition.type === "summon") {
      const maxTime = :self.master.hasEquipment(PearlSolidification) ? 2 : 1;
      if (:getVariable("decreaseDamageFromSummon") < maxTime) {
        :addVariable("decreaseDamageFromSummon", 1);
        return; // 不扣除使用次数
      }
    }
    :consumeUsage();
  }
  on declareEnd {
    when :( :self.master.isActive() );
    :drawCards(1);
  }
}

/**
 * @id 24031
 * @name 旋尾扇击
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 24031 as TailSweep;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 24032
 * @name 霰舞鱼群
 * @description
 * 造成3点雷元素伤害。
 * 如果本角色已附属原海明珠，则使其可用次数+1。（每回合1次）
 */
define skill {
  id 24032 as SwirlingSchoolOfFish;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
}

/**
 * @id 24033
 * @name 原海古雷
 * @description
 * 造成1点雷元素伤害，本角色附属原海明珠，召唤共鸣珊瑚珠。
 */
define skill {
  id 24033 as FontemerHoarthunder;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 1);
  :characterStatus(FontemerPearl);
  :summon(ResonantCoralOrb);
}

/**
 * @id 24034
 * @name 明珠甲胄
 * @description
 * 【被动】战斗开始时，本角色附属原海明珠。
 */
define skill {
  id 24034 as PearlArmor;
  skillType passive {
    on battleBegin {
      :characterStatus(FontemerPearl);
    }
  }
}

/**
 * @id 24037
 * @name 霰舞鱼群
 * @description
 * 
 */
define skill {
  id 24037 as SwirlingSchoolOfFishPassive;
  skillType passive {
    on useSkill {
      when :( :e.skill.definition.id === SwirlingSchoolOfFish && :self.hasStatus(FontemerPearl) );
      usage perRound, 1 {
        name "usagePerRound1";
      };
      const pearl = :self.hasStatus(FontemerPearl)!;
      pearl.addVariable("usage", 1);
    }
  }
}

/**
 * @id 2403
 * @name 千年珍珠骏麟
 * @description
 * 矗立在原海异种顶端的两位霸主之一，因身姿修长优美，被诗人与作者视为孤傲而高洁的生灵，获称「骏麟」。
 */
define character {
  id 2403 as MillennialPearlSeahorse;
  since "v4.4.0";
  tags electro, monster;
  health 8;
  energy 2;
  skills TailSweep, SwirlingSchoolOfFish, FontemerHoarthunder, PearlArmor, SwirlingSchoolOfFishPassive;
}

/**
 * @id 224031
 * @name 明珠固化
 * @description
 * 我方出战角色为千年珍珠骏麟时，才能打出：入场时，使千年珍珠骏麟附属可用次数为1的原海明珠；如果已附属原海明珠，则使其可用次数+1。
 * 装备有此牌的千年珍珠骏麟所附属的原海明珠抵消召唤物伤害时，改为每回合2次不消耗可用次数。
 * （牌组中包含千年珍珠骏麟，才能加入牌组）
 */
define card {
  id 224031 as PearlSolidification;
  since "v4.4.0";
  talent MillennialPearlSeahorse, active {
    on enter {
      const exists = :self.master.hasStatus(FontemerPearl);
      if (exists) {
        exists.addVariable("usage", 1);
      } else {
        :characterStatus(FontemerPearl, "@master", {
          overrideVariables: {
            usage: 1
          }
        });
      }
    }
  }
}
