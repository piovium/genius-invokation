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

import { character, skill, summon, combatStatus, card, DamageType, extension } from "@gi-tcg/core/builder";

/**
 * @id 111011
 * @name 冰灵珠
 * @description
 * 结束阶段：造成1点冰元素伤害，对所有敌方后台角色造成1点穿透伤害。
 * 可用次数：2
 */
export const SacredCryoPearl = summon(111011)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .done();

/**
 * @id 111012
 * @name 冰莲
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：2
 */
export const IceLotus = combatStatus(111012)
  .tags("barrier")
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(2)
  .decreaseDamage(1)
  .done();

/**
 * @id 11011
 * @name 流天射术
 * @description
 * 造成2点物理伤害。
 */
export const LiutianArchery = skill(11011)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11012
 * @name 山泽麟迹
 * @description
 * 造成1点冰元素伤害，生成冰莲。
 */
export const TrailOfTheQilin = skill(11012)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 1)
  .combatStatus(IceLotus)
  .done();

const FrostflakeArrowUsedExtension = extension(11013, { used: "pair<boolean>" })
  .initialState({ used: [false, false] })
  .description("本场对局中某方曾经使用过霜华矢")
  .done();

/**
 * @id 11013
 * @name 霜华矢
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
export const FrostflakeArrow = skill(11013)
  .type("normal")
  .costCryo(5)
  .associateExtension(FrostflakeArrowUsedExtension)
  .do((c) => {
    if (c.self.hasEquipment(UndividedHeart) && c.getExtensionState().used[c.self.who]) {
      c.damage(DamageType.Piercing, 3, "opp standby");
    } else {
      c.damage(DamageType.Piercing, 2, "opp standby");
    }
    c.damage(DamageType.Cryo, 2);
    c.setExtensionState((st) => st.used[c.self.who] = true);
  })
  .done();

/**
 * @id 11014
 * @name 降众天华
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤冰灵珠。
 */
export const CelestialShower = skill(11014)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Cryo, 2)
  .summon(SacredCryoPearl)
  .done();

/**
 * @id 1101
 * @name 甘雨
 * @description
 * 「既然是明早前要，那这份通稿，只要熬夜写完就好。」
 */
export const Ganyu = character(1101)
  .since("v3.3.0")
  .tags("cryo", "bow", "liyue")
  .health(12)
  .energy(3)
  .skills(LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower)
  .done();

/**
 * @id 211011
 * @name 唯此一心
 * @description
 * 战斗行动：我方出战角色为甘雨时，装备此牌。
 * 甘雨装备此牌后，立刻使用一次霜华矢。
 * 装备有此牌的甘雨使用霜华矢时：如果此技能在本场对局中曾经被使用过，则其对敌方后台角色造成的穿透伤害改为3点。
 * （牌组中包含甘雨，才能加入牌组）
 */
export const UndividedHeart = card(211011)
  .since("v3.3.0")
  .costCryo(5)
  .talent(Ganyu)
  .on("enter")
  .useSkill(FrostflakeArrow)
  .done();
