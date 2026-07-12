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

import { card, character, DamageType, DiceType, Reaction, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 116081
 * @name 裂晶弹片
 * @description
 * 对敌方「出战角色」造成1点物理伤害，抓1张牌。
 */
define card {
  id 116081 as CrystalShrapnel;
  since "v4.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  :damage(DamageType.Physical, 1, "opp active");
  :drawCards(1);
}

/**
 * @id 116082
 * @name 金花礼炮
 * @description
 * 结束阶段：造成1点岩元素伤害，抓1张裂晶弹片。
 * 可用次数：2
 */
define summon {
  id 116082 as RosulaDorataSalute;
  since "v4.8.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
    :drawCards(1, { withDefinition: CrystalShrapnel });
  }
}

/**
 * @id 116084
 * @name 岩元素附魔
 * @description
 * 所附属角色造成的物理伤害，变为岩元素伤害。
 * 持续回合：2
 */
define status {
  id 116084 as GeoInfusion;
  since "v4.8.0";
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Geo);
  }
}

/**
 * @id 16081
 * @name 直率的辞绝
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 16081 as BluntRefusal;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 16082
 * @name 典仪式晶火
 * @description
 * 造成3点岩元素伤害，本角色附属岩元素附魔；从手牌中舍弃至多5张裂晶弹片，每舍弃1张都使此伤害+1并抓1张牌。
 */
define skill {
  id 16082 as CeremonialCrystalshot;
  skillType elemental;
  cost DiceType.Geo, 3;
  :characterStatus(GeoInfusion);
  const shrapnels = :player.hands.filter((card) => card.definition.id === CrystalShrapnel).slice(0, 5);
  :damage(DamageType.Geo, 3 + shrapnels.length);
  :disposeCard(...shrapnels);
  :drawCards(shrapnels.length);
}

/**
 * @id 16083
 * @name 如霰澄天的鸣礼
 * @description
 * 造成1点岩元素伤害，对所有敌方后台角色造成1点穿透伤害。召唤金花礼炮，生成1张裂晶弹片加入手牌。
 */
define skill {
  id 16083 as AsTheSunlitSkysSingingSalute;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Geo, 1);
  :summon(RosulaDorataSalute);
  :createHandCard(CrystalShrapnel);
}

/**
 * @id 16084
 * @name 互助关系网
 * @description
 * 【被动】敌方角色受到结晶反应伤害后：生成3张裂晶弹片，随机置入我方牌库中。
 */
define skill {
  id 16084 as MutualAssistanceNetwork;
  skillType passive {
    on damaged {
      when :( ([
            Reaction.CrystallizeCryo, 
            Reaction.CrystallizeElectro, 
            Reaction.CrystallizeHydro, 
            Reaction.CrystallizePyro
          ] as Reaction[]).includes(:e.getReaction()!) && 
          !:e.target.isMine() );
      listenTo all;
      :createPileCards(CrystalShrapnel, 3, "random");
    }
  }
}

/**
 * @id 1608
 * @name 娜维娅
 * @description
 * 《飞翔的黄玫瑰》。
 */
define character {
  id 1608 as Navia;
  since "v4.8.0";
  tags geo, claymore, fontaine, pneuma;
  health 10;
  energy 2;
  skills BluntRefusal, CeremonialCrystalshot, AsTheSunlitSkysSingingSalute, MutualAssistanceNetwork;
}

/**
 * @id 216081
 * @name 不明流通渠道
 * @description
 * 战斗行动：我方出战角色为娜维娅时，装备此牌。
 * 娜维娅装备此牌后，立刻使用一次典仪式晶火。
 * 装备有此牌的娜维娅使用技能后：抓2张裂晶弹片。（每回合1次）
 * （牌组中包含娜维娅，才能加入牌组）
 */
define card {
  id 216081 as UndisclosedDistributionChannels;
  since "v4.8.0";
  cost DiceType.Geo, 3;
  talent Navia {
    on enter {
      :useSkill(CeremonialCrystalshot);
    }
    on useSkill {
      usage perRound, 1;
      :drawCards(2, { withDefinition: CrystalShrapnel });
    }
  }
}
