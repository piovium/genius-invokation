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

import { $, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 116031
 * @name 岩脊
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 */
define summon {
  id 116031 as StoneStele;
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  }
}

/**
 * @id 116033
 * @name 石化
 * @description
 * 角色无法使用技能。（持续到回合结束）
 */
define status {
  id 116033 as Petrification;
  oneDuration;
  tags disableSkill;
}

/**
 * @id 116032
 * @name 玉璋护盾
 * @description
 * 为我方出战角色提供2点护盾。
 */
define combatStatus {
  id 116032 as JadeShield;
  shield 2;
}

/**
 * @id 16031
 * @name 岩雨
 * @description
 * 造成2点物理伤害。
 */
define skill { 
  id 16031 as RainOfStone;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16032
 * @name 地心
 * @description
 * 造成1点岩元素伤害，召唤岩脊。
 */
define skill {
  id 16032 as DominusLapidis;
  skillType elemental;
  cost DiceType.Geo, 3;
  :damage(DamageType.Geo, 1);
  :summon(StoneStele);
}

/**
 * @id 16033
 * @name 地心·磐礴
 * @description
 * 造成3点岩元素伤害，召唤岩脊，生成玉璋护盾。
 */
define skill {
  id 16033 as DominusLapidisStrikingStone;
  skillType elemental;
  cost DiceType.Geo, 5;
  :damage(DamageType.Geo, 3);
  :summon(StoneStele);
  :combatStatus(JadeShield);
}

/**
 * @id 16034
 * @name 天星
 * @description
 * 造成4点岩元素伤害，目标角色附属石化。
 */
define skill {
  id 16034 as PlanetBefall;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Geo, 4);
  :characterStatus(Petrification, $.opp.active);
}

/**
 * @id 1603
 * @name 钟离
 * @description
 * 韬玉之石，可明八荒；灿若天星，纵横无双 。
 */
define character {
  id 1603 as Zhongli;
  since "v3.7.0";
  tags geo, pole, liyue;
  health 12;
  energy 3;
  skills RainOfStone, DominusLapidis, DominusLapidisStrikingStone, PlanetBefall;
}

/**
 * @id 216031
 * @name 炊金馔玉
 * @description
 * 战斗行动：我方出战角色为钟离时，装备此牌。
 * 钟离装备此牌后，立刻使用一次地心·磐礴。
 * 装备有此牌的钟离生命值至少为7时，钟离造成的伤害和我方召唤物造成的岩元素伤害+1。（每回合3次）
 * （牌组中包含钟离，才能加入牌组）
 */
define card {
  id 216031 as DominanceOfEarth;
  since "v3.7.0";
  cost DiceType.Geo, 5;
  talent Zhongli {
    on enter {
      :useSkill(DominusLapidisStrikingStone);
    }
    on increaseDamage {
      when :{
        return :self.master.health >= 7 &&
        (:e.source.definition.id === Zhongli ||
          :e.type === DamageType.Geo &&
          :e.source.definition.type === "summon")
      };
      listenTo samePlayer;
      usage perRound, 3;
      :e.increaseDamage(1);
    }
  }
}
