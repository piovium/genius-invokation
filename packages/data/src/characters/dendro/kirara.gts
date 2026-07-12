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

import { character, skill, combatStatus, card, DamageType, DiceType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 117073
 * @name 猫草豆蔻
 * @description
 * 所在阵营打出2张行动牌后：对所在阵营的出战角色造成1点草元素伤害。
 * 可用次数：2
 * 【此卡含描述变量】
 */
define combatStatus {
  id 117073 as CatGrassCardamom;
  variable playedCard, 0 {
    visible false;
  };
  replaceDescription "[GCG_TOKEN_COUNTER]", ((st, self) => self.variables.playedCard);
  on playCard {
    :addVariable("playedCard", 1);
  }
  on playCard {
    when :( :getVariable("playedCard") === 2 );
    usage 2;
    :damage(DamageType.Dendro, 1, "my active");
    :setVariable("playedCard", 0);
  }
}

/**
 * @id 117072
 * @name 安全运输护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，没有上限）
 */
define combatStatus {
  id 117072 as ShieldOfSafeTransport;
  shield 1, Infinity;
}

/**
 * @id 117071
 * @name 猫箱急件
 * @description
 * 绮良良为出战角色时，我方切换角色后：造成2点草元素伤害，抓1张牌。
 * 可用次数：1（可叠加，最多叠加到2次）
 */
define combatStatus {
  id 117071 as UrgentNekoParcel;
  on switchActive {
    when :( :e.switchInfo.from?.definition.id === Kirara );
    usage 1 {
      append 2;
    };
    :damage(DamageType.Dendro, 2);
    :drawCards(1);
  }
}

/**
 * @id 17071
 * @name 箱纸切削术
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17071 as Boxcutter;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17072
 * @name 呜喵町飞足
 * @description
 * 生成猫箱急件和2层安全运输护盾。
 */
define skill {
  id 17072 as MeowteorKick;
  skillType elemental;
  cost DiceType.Dendro, 3;
  :combatStatus(UrgentNekoParcel);
  :combatStatus(ShieldOfSafeTransport, "my", {
      overrideVariables: { shield: 2 }
    });
}

/**
 * @id 17073
 * @name 秘法·惊喜特派
 * @description
 * 造成4点草元素伤害，在敌方场上生成猫草豆蔻。
 */
define skill {
  id 17073 as SecretArtSurpriseDispatch;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 4);
  :combatStatus(CatGrassCardamom, "opp");
}

/**
 * @id 1707
 * @name 绮良良
 * @description
 * 歧尾骏足，通达万户。
 */
define character {
  id 1707 as Kirara;
  since "v4.5.0";
  tags dendro, sword, inazuma;
  health 10;
  energy 2;
  skills Boxcutter, MeowteorKick, SecretArtSurpriseDispatch;
}

/**
 * @id 217071
 * @name 沿途百景会心
 * @description
 * 战斗行动：我方出战角色为绮良良时，装备此牌。
 * 绮良良装备此牌后，立刻使用一次呜喵町飞足。
 * 装备有此牌的绮良良为出战角色，我方进行「切换角色」行动时：少花费1个元素骰。（每回合1次）
 * （牌组中包含绮良良，才能加入牌组）
 */
define card {
  id 217071 as CountlessSightsToSee;
  since "v4.5.0";
  cost DiceType.Dendro, 3;
  talent Kirara {
    on enter {
      :useSkill(MeowteorKick);
    }
    on deductOmniDiceSwitch {
      when :( :self.master.isActive() );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}
