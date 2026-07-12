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
 * @id 114034
 * @name 雷元素附魔
 * @description
 * 所附属角色造成的物理伤害变为雷元素伤害，且角色造成的雷元素伤害+1。
 * 持续回合：3
 */
define status {
  id 114034 as ElectroElementalInfusion01;
  conflictWith 114032;
  duration 3;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :e.type === DamageType.Electro );
    :e.increaseDamage(1);
  }
}

/**
 * @id 114032
 * @name 雷元素附魔
 * @description
 * 所附属角色造成的物理伤害变为雷元素伤害。
 * 持续回合：2
 */
define status {
  id 114032 as ElectroElementalInfusion;
  conflictWith 114034;
  duration 2;
  on modifySkillDamageType {
    when :( :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
}

/**
 * @id 14031
 * @name 云来剑法
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 14031 as YunlaiSwordsmanship;
  skillType normal;
  cost DiceType.Electro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 14032
 * @name 星斗归位
 * @description
 * 造成3点雷元素伤害，生成手牌雷楔。
 */
define skill {
  id 14032 as StellarRestoration;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
  const requestByCard = :skillInfo.requestBy?.caller?.definition.id === LightningStiletto;
  const lightningStilettoCard = :player.hands.find((card) => card.definition.id === LightningStiletto);
  if (requestByCard || lightningStilettoCard) {
    if (:self.hasEquipment(ThunderingPenance)) {
      :characterStatus(ElectroElementalInfusion01);
    } else {
      :characterStatus(ElectroElementalInfusion);
    }
    if (lightningStilettoCard) {
      :disposeCard(lightningStilettoCard);
    }
  } else {
    :createHandCard(LightningStiletto);
  }
}

/**
 * @id 14033
 * @name 天街巡游
 * @description
 * 造成4点雷元素伤害，对所有敌方后台角色造成3点穿透伤害。
 */
define skill {
  id 14033 as StarwardSword;
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 3;
  :damage(DamageType.Piercing, 3, "opp standby");
  :damage(DamageType.Electro, 4);
}

/**
 * @id 1403
 * @name 刻晴
 * @description
 * 她能构筑出许多从未设想过的牌组，拿下许多难以想象的胜利。
 */
define character {
  id 1403 as Keqing;
  since "v3.3.0";
  tags electro, sword, liyue;
  health 10;
  energy 3;
  skills YunlaiSwordsmanship, StellarRestoration, StarwardSword;
}

/**
 * @id 114031
 * @name 雷楔
 * @description
 * 战斗行动：将刻晴切换到场上，立刻使用星斗归位。本次星斗归位会为刻晴附属雷元素附魔，但是不会再生成雷楔。
 * （刻晴使用星斗归位时，如果此牌在手中：不会再生成雷楔，而是改为舍弃此牌，并为刻晴附属雷元素附魔）
 */
export const LightningStiletto = card(114031)
  .since("v3.3.0")
  .undiscoverable()
  .costElectro(3)
  .tags("action", "talent")
  .addTarget(`my character with definition id ${Keqing} and not has status with tag (disableSkill)`)
  .switchActive(`@targets.0`)
  .useSkill(StellarRestoration)
  .done();

/**
 * @id 214031
 * @name 抵天雷罚
 * @description
 * 战斗行动：我方出战角色为刻晴时，装备此牌。
 * 刻晴装备此牌后，立刻使用一次星斗归位。
 * 装备有此牌的刻晴生成的雷元素附魔获得以下效果：
 * 初始持续回合+1，并且会使所附属角色造成的雷元素伤害+1。
 * （牌组中包含刻晴，才能加入牌组）
 */
define card {
  id 214031 as ThunderingPenance;
  since "v3.3.0";
  cost DiceType.Electro, 3;
  talent Keqing {
    on enter {
      :useSkill(StellarRestoration);
    }
  }
}
