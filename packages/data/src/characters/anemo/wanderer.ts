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

import { character, skill, status, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 115062
 * @name 倾落
 * @description
 * 所附属角色为出战角色，我方执行「切换角色」行动时：少花费1个元素骰；此效果触发后，造成1点风元素伤害。
 * 可用次数：1
 */
export const Descent = status(115062)
  .on("deductOmniDiceSwitch", (c) => c.self.master.isActive())
  .deductOmniCost(1)
  .on("switchActive", (c, e) => c.self.master.id === e.switchInfo.from?.id)
  .usage(1)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 115061
 * @name 优风倾姿
 * @description
 * 所附属角色进行「普通攻击」时：造成的伤害+2；如果敌方存在后台角色，则此技能改为对下一个敌方后台角色造成伤害。
 * 可用次数：2
 */
export const Windfavored = status(115061)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(2)
  .increaseDamage(2)
  .done();

/**
 * @id 15061
 * @name 行幡鸣弦
 * @description
 * 造成1点风元素伤害。
 */
export const YuubanMeigen = skill(15061)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .if((c) => c.self.hasStatus(Windfavored) && c.$("opp next"))
  .damage(DamageType.Anemo, 1, "opp next")
  .else()
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 15062
 * @name 羽画·风姿华歌
 * @description
 * 造成2点风元素伤害，本角色附属优风倾姿。
 */
export const HanegaSongOfTheWind = skill(15062)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 2)
  .characterStatus(Windfavored)
  .done();

/**
 * @id 15063
 * @name 狂言·式乐五番
 * @description
 * 造成7点风元素伤害；如果角色附属有优风倾姿，则将其移除并使此伤害+1。
 */
export const KyougenFiveCeremonialPlays = skill(15063)
  .type("burst")
  .costAnemo(3)
  .costEnergy(3)
  .do((c) => {
    const windfavored = c.self.hasStatus(Windfavored);
    if (windfavored) {
      c.dispose(windfavored);
      c.damage(DamageType.Anemo, 8);
    } else {
      c.damage(DamageType.Anemo, 7);
    }
  })
  .done();

/**
 * @id 1506
 * @name 流浪者
 * @description
 * 千般劫渡，不可得知。
 */
export const Wanderer = character(1506)
  .since("v4.1.0")
  .tags("anemo", "catalyst")
  .health(10)
  .energy(3)
  .skills(YuubanMeigen, HanegaSongOfTheWind, KyougenFiveCeremonialPlays)
  .done();

/**
 * @id 215061
 * @name 梦迹一风
 * @description
 * 战斗行动：我方出战角色为REALNAME[ID(1)时，装备此牌。
 * #REALNAME[ID(1)装备此牌后，立刻使用一次羽画·风姿华歌。
 * 装备有此牌的#REALNAME[ID(1)在优风倾姿状态下进行重击后：下次从该角色执行「切换角色」行动时少花费1个元素骰，并且造成1点风元素伤害。
 * （牌组中包含#REALNAME[ID(1)，才能加入牌组）
 */
export const GalesOfReverie = card(215061)
  .since("v4.1.0")
  .costAnemo(4)
  .talent(Wanderer)
  .on("enter")
  .useSkill(HanegaSongOfTheWind)
  .on("dealDamage", (c, e) => c.self.master.hasStatus(Windfavored) && e.via.charged)
  .characterStatus(Descent, "@master")
  .done();
