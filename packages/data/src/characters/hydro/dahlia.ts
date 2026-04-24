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

import { character, skill, combatStatus, card, DamageType, $ } from "@gi-tcg/core/builder";
import { Shield } from "../../commons";

/**
 * @id 112151
 * @name 西风之眷
 * @description
 * 我方角色受到伤害后：生成1层护盾。
 * 可用次数：2
 */
export const FavonianFavor = combatStatus(112151)
  .since("v6.5.0")
  .on("damaged")
  .usage(2)
  .combatStatus(Shield)
  .done();

/**
 * @id 112152
 * @name 雾雨秘迹
 * @description
 * 敌方切换角色后：对敌方出战角色造成1点水元素伤害。
 * 我方切换角色后：生成1个随机基础元素骰。
 * 可用次数：1
 */
export const SacramentalShower = combatStatus(112152)
  .since("v6.5.0")
  .on("switchActive")
  .usage(1)
  .listenToAll()
  .do((c, e) => {
    if (e.switchInfo.to.isMine()) {
      c.generateDice("randomElement", 1);
    } else {
      c.damage(DamageType.Hydro, 1);
    }
  })
  .done();

/**
 * @id 12151
 * @name 西风剑术·祭仪
 * @description
 * 造成2点物理伤害。
 */
export const FavoniusBladeworkRitual = skill(12151)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12152
 * @name 圣浸的礼典
 * @description
 * 造成2点水元素伤害，生成雾雨秘迹。
 */
export const ImmersiveOrdinance = skill(12152)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .combatStatus(SacramentalShower)
  .done();

/**
 * @id 12153
 * @name 纯耀的祷咏
 * @description
 * 造成2点水元素伤害，生成2层护盾和2层西风之眷。
 */
export const RadiantPsalter = skill(12153)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .combatStatus(Shield, "my", {
    overrideVariables: {
      shield: 2
    }
  })
  .combatStatus(FavonianFavor)
  .done();

/**
 * @id 1215
 * @name 塔利雅
 * @description
 * 悠悠圣歌，酿风成诗。
 */
export const Dahlia = character(1215)
  .since("v6.5.0")
  .tags("hydro", "sword", "mondstadt")
  .health(10)
  .energy(2)
  .skills(FavoniusBladeworkRitual, ImmersiveOrdinance, RadiantPsalter)
  .done();

/**
 * @id 212151
 * @name 愿一切欢睦陪伴你
 * @description
 * 战斗行动：我方出战角色为塔利雅时，装备此牌。
 * 塔利雅装备此牌后，立刻使用一次纯耀的祷咏。
 * 装备有此卡牌的塔利雅在场时，我方角色被击倒时：如果我方场上存在西风之眷，则消耗所有西风之眷，使该角色免于被击倒，并治疗该角色到2点生命值。
 * （牌组中包含塔利雅，才能加入牌组）
 */
export const YouShallGoOutWithJoy = card(212151)
  .since("v6.5.0")
  .costHydro(3)
  .costEnergy(2)
  .talent(Dahlia)
  .on("enter")
  .useSkill(RadiantPsalter)
  .on("beforeDefeated", (c) => c.query($.my.combatStatus.def(FavonianFavor)))
  .listenToPlayer()
  .do((c, e) => {
    const favor = c.query($.my.combatStatus.def(FavonianFavor));
    if (favor) {
      c.dispose(favor);
    }
  })
  .immune(2)
  .done();
