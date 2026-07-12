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
import { ResistantForm } from "../../commons.gts";
/**
 * @id 115142
 * @name 梦见风名物点心
 * @description
 * 此卡牌进入手牌时：如果我方出战角色生命值大于5，则造成1点风元素伤害；否则治疗我方出战角色2点。效果结算后抓1张牌，随后弃置此卡牌。
 */
export const YumemiStyleSpecialSnacks = card(115142)
  .tags("food")
  .undiscoverable()
  .descriptionOnHCI()
  .do((c) => {
    if (c.$("my active character with health > 5")){
      c.damage(DamageType.Anemo, 1, "opp characters with health > 0 limit 1");
    } else {
      c.heal(2, "my active");
    }
    c.drawCards(1);
  })
  .done();

/**
 * @id 115143
 * @name 小貘
 * @description
 * 结束阶段：生成1张梦见风名物点心，将其置于我方牌组顶部。
 * 可用次数：3
 */
define summon {
  id 115143 as MiniBaku;
  since "v6.0.0";
  hint ResistantForm, ((c, self) => self.variables.usage!);
  on endPhase {
    usage 3;
    :createPileCards(YumemiStyleSpecialSnacks, 1, "top");
  }
}

/**
 * @id 115141
 * @name 梦浮
 * @description
 * 我方宣布结束时：将所附属角色切换为出战角色，并造成1点风元素伤害。
 * 可用次数：1
 */
define status {
  id 115141 as Dreamdrifter;
  since "v6.0.0";
  on declareEnd {
    usage 1;
    :switchActive("@master");
    :damage(DamageType.Anemo, 1);
  }
}

/**
 * @id 15141
 * @name 梦我梦心
 * @description
 * 造成1点风元素伤害。
 */
define skill {
  id 15141 as PureHeartPureDreams;
  skillType normal;
  cost DiceType.Anemo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Anemo, 1);
}

/**
 * @id 15142
 * @name 秋沙歌枕巡礼
 * @description
 * 造成2点风元素伤害，自身附属梦浮。
 */
define skill {
  id 15142 as AisaUtamakuraPilgrimage;
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 2);
  :characterStatus(Dreamdrifter, "@self");
}

/**
 * @id 15143
 * @name 安乐秘汤疗法
 * @description
 * 造成3点风元素伤害，生成1张梦见风名物点心，将其置于我方牌组顶部，并召唤小貘。
 */
define skill {
  id 15143 as AnrakuSecretSpringTherapy;
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 3);
  :createPileCards(YumemiStyleSpecialSnacks, 1, "top");
  :summon(MiniBaku);
}

/**
 * @id 1514
 * @name 梦见月瑞希
 * @description
 * 愁云拂散，梦间月明。
 */
define character {
  id 1514 as YumemizukiMizuki;
  since "v6.0.0";
  tags anemo, catalyst, inazuma;
  health 10;
  energy 2;
  skills PureHeartPureDreams, AisaUtamakuraPilgrimage, AnrakuSecretSpringTherapy;
}

/**
 * @id 215141
 * @name 缠忆君影梦相见
 * @description
 * 战斗行动：我方出战角色为梦见月瑞希时，装备此牌。
 * 梦见月瑞希装备此牌后，立刻使用一次秋沙歌枕巡礼。
 * 如果梦见月瑞希是出战角色，则我方造成的冰元素伤害水元素伤害火元素伤害雷元素伤害+1。（包括我方引发的任意元素扩散的伤害，每回合2次）
 * （牌组中包含梦见月瑞希，才能加入牌组）
 */
define card {
  id 215141 as YourEchoIMeetInDreams;
  since "v6.0.0";
  cost DiceType.Anemo, 3;
  talent YumemizukiMizuki {
    on enter {
      :useSkill(AisaUtamakuraPilgrimage);
    }
    on increaseDamage {
      when :( :self.master.isActive() &&
          ([DamageType.Cryo, DamageType.Hydro, DamageType.Pyro, DamageType.Electro] as DamageType[]).includes(:e.type) );
      listenTo samePlayer;
      usage perRound, 2;
      :e.increaseDamage(1);
    }
  }
}
