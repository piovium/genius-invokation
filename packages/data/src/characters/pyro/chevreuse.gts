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

import { character, skill, status, combatStatus, card, DamageType, Reaction, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 113131
 * @name 超量装药弹头
 * @description
 * 战斗行动：对敌方「出战角色」造成1点火元素伤害。
 * 此牌被舍弃时：对敌方「出战角色」造成1点火元素伤害。
 */
export const OverchargedBall = card(113131)
  .since("v4.8.0")
  .undiscoverable()
  .costPyro(2)
  .tags("action")
  .damage(DamageType.Pyro, 1, "opp active")
  .doSameWhenDisposed()
  .done();

/**
 * @id 113135
 * @name 纵阵武力统筹
 * @description
 * 敌方角色受到超载反应伤害后：生成手牌超量装药弹头（每回合1次）
 */
define status {
  id 113135 as VerticalForceCoordination;
  since "v4.8.0";
  on damaged {
    when :( :e.getReaction() === Reaction.Overloaded && !:e.target.isMine() );
    listenTo all;
    usage perRound, 1;
    :createHandCard(OverchargedBall);
  }
}

/**
 * @id 113132
 * @name 二重毁伤弹
 * @description
 * 所在阵营切换角色后：对切换到的角色造成1点火元素伤害。
 * 可用次数：2
 */
define combatStatus {
  id 113132 as SecondaryExplosiveShells;
  since "v4.8.0";
  on switchActive {
    usage 2;
    :damage(DamageType.Pyro, 1, "@event.switchTo");
  }
}

/**
 * @id 113134
 * @name 尖兵协同战法（生效中）
 * @description
 * 我方造成的火元素伤害或雷元素伤害+1。（包括扩散反应造成的火元素伤害或雷元素伤害）
 * 可用次数：2
 */
define combatStatus {
  id 113134 as VanguardsCoordinatedTacticsInEffect;
  since "v4.8.0";
  on increaseDamage {
    when :( :e.type === DamageType.Pyro || :e.type === DamageType.Electro );
    usage 2;
    :e.increaseDamage(1);
  }
}

/**
 * @id 13131
 * @name 线列枪刺·改
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 13131 as LineBayonetThrustEx;
  skillType normal;
  cost DiceType.Pyro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 13132
 * @name 近迫式急促拦射
 * @description
 * 造成2点火元素伤害。
 * 此技能结算后：如果我方手牌中含有超量装药弹头，则舍弃1张并治疗我方受伤最多的角色1点。
 */
define skill {
  id 13132 as ShortrangeRapidInterdictionFire;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 2);
}

/**
 * @id 13133
 * @name 圆阵掷弹爆轰术
 * @description
 * 造成2点火元素伤害，在敌方场上生成二重毁伤弹。
 */
define skill {
  id 13133 as RingOfBurstingGrenades;
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :combatStatus(SecondaryExplosiveShells, "opp");
  :damage(DamageType.Pyro, 2);
}

/**
 * @id 13134
 * @name 纵阵武力统筹
 * @description
 * 【被动】敌方角色受到超载反应伤害后：生成手牌超量装药弹头（每回合1次）
 */
define skill {
  id 13134 as VerticalForceCoordinationPassive;
  skillType passive {
    on damaged {
      when :( :e.getReaction() === Reaction.Overloaded && !:e.target.isMine() );
      listenTo all;
      usage perRound, 1 {
        name "usagePerRound1";
      };
      :createHandCard(OverchargedBall);
    }
  }
}

/**
 * @id 13135
 * @name 近迫式急促拦射
 * @description
 * 造成3点火元素伤害。
 * 此技能结算后：如果我方手牌中含有超量装药弹头，则舍弃1张并治疗我方受伤最多的角色1点。
 */
define skill {
  id 13135 as ShortrangeRapidInterdictionFirePassive;
  skillType passive {
    on useSkill {
      when :( :e.skill.definition.id === ShortrangeRapidInterdictionFire );
      const ball = :player.hands.find((card) => card.definition.id === OverchargedBall);
      if (ball) {
        :disposeCard(ball);
        :heal(1, "my characters order by health - maxHealth limit 1");
      }
    }
  }
}

/**
 * @id 1313
 * @name 夏沃蕾
 * @description
 * 知刑执法，公义责罪。
 */
define character {
  id 1313 as Chevreuse;
  since "v4.8.0";
  tags pyro, pole, fontaine, pneuma;
  health 10;
  energy 2;
  skills LineBayonetThrustEx, ShortrangeRapidInterdictionFire, RingOfBurstingGrenades, VerticalForceCoordinationPassive, ShortrangeRapidInterdictionFirePassive;
}

/**
 * @id 213131
 * @name 尖兵协同战法
 * @description
 * 队伍中包含火元素角色和雷元素角色且不包含其他元素的角色，才能打出：将此牌装备给夏沃蕾。
 * 装备有此牌的夏沃蕾在场，敌方角色受到超载反应伤害后：我方接下来造成的2次火元素伤害或雷元素伤害+1。（包括扩散反应造成的火元素伤害或雷元素伤害）
 * （牌组中包含夏沃蕾，才能加入牌组）
 */
define card {
  id 213131 as VanguardsCoordinatedTactics;
  cost DiceType.Pyro, 2;
  filter :{
    const elements = new Set(:$$(`all my characters include defeated`).map((ch) => ch.element()));
    return elements.size === 2 && elements.has(DiceType.Pyro) && elements.has(DiceType.Electro);
  };
  talent Chevreuse, none {
    since "v4.8.0";
    on damaged {
      when :( :e.getReaction() === Reaction.Overloaded && !:e.target.isMine() );
      listenTo all;
      :combatStatus(VanguardsCoordinatedTacticsInEffect);
    }
  }
}
