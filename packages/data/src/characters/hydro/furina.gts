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
 * @id 112113
 * @name 圣俗杂座
 * @description
 * 在「始基力：荒性」和「始基力：芒性」之中，切换芙宁娜的形态。
 * 如果我方场上存在沙龙成员或众水的歌者，也切换其形态。
 */
define card {
  id 112113 as SeatsSacredAndSecular;
  since "v4.7.0";
  undiscoverable;
  filter :( :query($.union($.my.character.def(FurinaPneuma), $.my.character.def(FurinaOusia))) );
  const furina = :query($.union($.my.character.def(FurinaPneuma), $.my.character.def(FurinaOusia)))
  if (!furina) {
    return;
  }
  if (furina.definition.id === FurinaPneuma) {
    :transformDefinition(furina, FurinaOusia);
    const summon = :query($.my.summon.def(SalonMembers));
    if (summon) {
      :transformDefinition(summon, SingerOfManyWaters);
      summon.setVariable("hintIcon", DamageType.Heal);
    }
  } else {
    :transformDefinition(furina, FurinaPneuma);
    const summon = :query($.my.summon.def(SingerOfManyWaters));
    if (summon) {
      :transformDefinition(summon, SalonMembers)
      summon.setVariable("hintIcon", DamageType.Hydro);
    }
  }
}

/**
 * @id 112111
 * @name 沙龙成员
 * @description
 * 结束阶段：造成1点水元素伤害。如果我方存在生命值至少为6的角色，则对一位受伤最少的我方角色造成1点穿透伤害，然后再造成1点水元素伤害。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
define summon {
  id 112111 as SalonMembers
  hint DamageType.Hydro, 1;
  on endPhase {
    :damage(DamageType.Hydro, 1);
  }
  // 将两段伤害拆成两个技能，从而中间可以插入第一段伤害引发的事件（如缤纷马卡龙）
  on endPhase {
    usage 2 { append 4 };
    if (:query($.my.character.var("health", ">=", 6))) {
      :damage(DamageType.Piercing, 1, $.macros.myLeastInjured);
      :damage(DamageType.Hydro, 1);
    }
  }
};

/**
 * @id 112112
 * @name 众水的歌者
 * @description
 * 结束阶段：治疗所有我方角色1点。如果我方存在生命值不多于5的角色，则再治疗一位受伤最多的角色1点。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
define summon {
  id 112112 as SingerOfManyWaters;
  hint DamageType.Heal, 1;
  on endPhase {
    usage 2 { append 4 };
    :heal(1, $.my.character);
    if (:query($.my.character.var("health", "<=", 5))) {
      :heal(1, $.macros.myMostInjured);
    }
  }
}

/**
 * @id 112116
 * @name 万众瞩目
 * @description
 * 角色进行普通攻击时：使角色造成的物理伤害变为水元素伤害。如果角色处于「荒」形态，则治疗我方所有后台角色1点；如果角色处于「芒」形态，则此伤害+2，但是对一位受伤最少的我方角色造成1点穿透伤害。
 * 可用次数：1
 */
define status {
  id 112116 as CenterOfAttention;
  on modifySkillDamageType {
    when :( :e.viaSkillType("normal") && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 1;
    if (:self.master.definition.id === FurinaPneuma) {
      :heal(1, $.my.standby);
    } else {
      :e.increaseDamage(2);
      :damage(DamageType.Piercing, 1, $.macros.myLeastInjured);
    }
  }
}

/**
 * @id 112115
 * @name 狂欢值
 * @description
 * 我方造成的伤害+1。（包括角色引发的扩散伤害）
 * 可用次数：1（可叠加，没有上限）
 */
define combatStatus {
  id 112115 as Revelry;
  on increaseDamage {
    usage 1 { append };
    :e.increaseDamage(1);
  }
}

/**
 * @id 112114
 * @name 普世欢腾
 * @description
 * 我方出战角色受到伤害或治疗后：叠加1点狂欢值。
 * 持续回合：2
 */
define combatStatus {
  id 112114 as UniversalRevelry;
  duration 2;
  on damagedOrHealed {
    when :( :e.target.isActive() );
    :combatStatus(Revelry);
  }
}

/**
 * @id 12111
 * @name 独舞之邀
 * @description
 * 造成2点物理伤害。
 * 每回合1次：如果手牌中没有圣俗杂座，则生成手牌圣俗杂座。
 */
define skill {
  id 12111 as SoloistsSolicitation;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 12112
 * @name 孤心沙龙
 * @description
 * 芙宁娜当前处于「始基力：荒性」形态：召唤沙龙成员。
 * （芙宁娜处于「始基力：芒性」形态时，会改为召唤众水的歌者）
 */
define skill {
  id 12112 as SalonSolitairePneuma;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :summon(SalonMembers);
}

/**
 * @id 12113
 * @name 万众狂欢
 * @description
 * 造成2点水元素伤害，生成普世欢腾。
 */
define skill {
  id 12113 as LetThePeopleRejoice;
  skillType burst;
  cost DiceType.Hydro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2)
  :combatStatus(UniversalRevelry)
}

/**
 * @id 12114
 * @name
 * @description
 *
 */
define skill {
  id 12114 as Skill12114;
  skillType passive {
    on useSkill {
      when :( 
        :e.isSkillType("normal") &&
        !:player.hands.find((card) => card.definition.id === SeatsSacredAndSecular)
      );
      usage perRound, 1 { name usagePerRound1 };
      :createHandCard(SeatsSacredAndSecular);
    }
  }
}

/**
 * @id 12115
 * @name 始基力：圣俗杂座
 * @description
 * 【被动】战斗开始时，生成手牌圣俗杂座。
 */
define skill {
  id 12115 as ArkheSeatsSacredAndSecular;
  skillType passive {
    on battleBegin {
      :createHandCard(SeatsSacredAndSecular)
    }
  }
}

/**
 * @id 1211
 * @name 芙宁娜
 * @description
 * 永世领唱，无尽圆舞。
 */
define character {
  id 1211 as FurinaPneuma;
  since "v4.7.0";
  tags hydro, sword, fontaine, pneuma;
  health 12;
  energy 2;
  skills SoloistsSolicitation, SalonSolitairePneuma, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular;
}


/**
 * @id 12121
 * @name 独舞之邀
 * @description
 * 造成2点物理伤害。
 * 每回合1次：生成手牌圣俗杂座。
 */
define skill {
  id 12121 as SoloistsSolicitationOusia;
  skillType normal;
  cost DiceType.Hydro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}
/**
 * @id 12122
 * @name 孤心沙龙
 * @description
 * 芙宁娜当前处于「始基力：芒性」形态：召唤众水的歌者。
 * （芙宁娜处于「始基力：荒性」形态时，会改为召唤沙龙成员）
 */
define skill {
  id 12122 as SalonSolitaireOusia;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :summon(SingerOfManyWaters);
}

/**
 * @id 1212
 * @name 芙宁娜
 * @description
 *
 */
define character {
  id 1212 as FurinaOusia;
  since "v4.7.0";
  tags hydro, sword, fontaine, ousia;
  health 12;
  energy 2;
  skills SoloistsSolicitationOusia, SalonSolitaireOusia, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular;
}

/**
 * @id 212111
 * @name 「诸君听我颂，共举爱之杯！」
 * @description
 * 战斗行动：我方出战角色为芙宁娜时，装备此牌。
 * 芙宁娜装备此牌后，立刻使用一次孤心沙龙。
 * 装备有此牌的芙宁娜使用孤心沙龙时，会对自身附属万众瞩目。（角色普通攻击时根据形态触发不同效果）
 * （牌组中包含芙宁娜，才能加入牌组）
 */
define card {
  id 212111 as HearMeLetUsRaiseTheChaliceOfLove;
  since "v4.7.0";
  cost DiceType.Hydro, 3;
  talent [FurinaPneuma, FurinaOusia] {
    on enter {
      if (:self.master.definition.id === FurinaPneuma) {
        :useSkill(SalonSolitairePneuma);
      } else {
        :useSkill(SalonSolitaireOusia);
      }
    }
    on useSkill {
      when :( :e.isSkillType("elemental") )
      :characterStatus(CenterOfAttention, "@master")
    }
  }
}
