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

import { $, card, character, DamageType, DiceType, Reaction, skill, summon } from "@gi-tcg/core/builder";
import { AgileSwitch, Empowerment } from "../../commons.gts";

/**
 * @id 112161
 * @name 冷静一下鸭
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2
 */
define summon {
  id 112161 as CoolYourJetsDucky;
  since "v6.5.0";
  hint DamageType.Hydro, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 2);
  }
}

/**
 * @id 12161
 * @name 敲打修理法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 12161 as BishbashboshRepair;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12162
 * @name 妙思捕手
 * @description
 * 造成2点水元素伤害，生成1层敏捷切换。如果手牌中有卡牌具有赋能，则改为造成3点水元素伤害.
 */
define skill {
  id 12162 as Musecatcher;
  skillType elemental;
  cost DiceType.Hydro, 3;
  if (:query($.my.hand.with($.def(Empowerment)))) {
    :damage(DamageType.Hydro, 3);
  }
  else {
    :damage(DamageType.Hydro, 2);
  }
  :combatStatus(AgileSwitch);
}

/**
 * @id 12163
 * @name 精密水冷仪
 * @description
 * 造成2点水元素伤害，召唤冷静一下鸭。
 */
define skill {
  id 12163 as PrecisionHydronicCooler;
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :summon(CoolYourJetsDucky);
}

/**
 * @id 12164
 * @name 模块式高效运作
 * @description
 * 我方卡牌被赋予赋能时：如果我方场上存在冷静一下鸭，则使其可用次数+1，否则自身获得1点充能。（每回合1次）
 */
define skill {
  id 12164 as ModularEfficiencyProtocol;
  skillType passive {
    on enterRelative {
      when :( :e.entity.definition.id === Empowerment );
      listenTo samePlayer;
      usage perRound, 1 {
        name "usagePerRound1";
      };
      const ducky = :query($.my.summon.def(CoolYourJetsDucky));
      if (ducky) {
        ducky.addVariable("usage", 1);
      } else {
        :gainEnergy(1, :self);
      }
    }
  }
}

/**
 * @id 1216
 * @name 爱诺
 * @description
 * 叮铃哐啷，奇思成真。
 */
define character {
  id 1216 as Aino;
  since "v6.5.0";
  tags hydro, claymore, nodkrai;
  health 10;
  energy 2;
  skills BishbashboshRepair, Musecatcher, PrecisionHydronicCooler, ModularEfficiencyProtocol;
}

/**
 * @id 212161
 * @name 天才之为构造之责任
 * @description
 * 战斗行动：我方出战角色为爱诺时，装备此牌。
 * 爱诺装备此牌后，立刻使用一次精密水冷仪。
 * 装备有此卡牌的爱诺在场时，我方触发感电、月感电、绽放及月绽放反应时：该次伤害+2，并且赋予我方当前元素骰费用最高的1张手牌赋能。（每回合1次）
 * （牌组中包含爱诺，才能加入牌组）
 */
define card {
  id 212161 as TheBurdenOfCreativeGenius;
  since "v6.5.0";
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  talent Aino {
    on enter {
      :useSkill(PrecisionHydronicCooler);
    }
    on increaseDamage {
      when :( ([
            Reaction.ElectroCharged,
            Reaction.LunarElectroCharged,
            Reaction.Bloom,
            Reaction.LunarBloom
          ] as (Reaction | null)[]).includes(:e.getReaction()) );
      listenTo samePlayer;
      usage perRound, 1;
      :e.increaseDamage(2);
      const [hand] = :maxCostHands(1);
      if (hand) {
        :attach(Empowerment, hand);
      }
    }
  }
}
