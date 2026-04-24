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

import { character, skill, summon, status, card, DamageType, DiceType, SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 116054
 * @name 乱神之怪力
 * @description
 * 所附属角色进行重击时：造成的伤害+1。如果可用次数至少为2，则少花费1个无色元素。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
export const SuperlativeSuperstrength = status(116054)
  .on("increaseSkillDamage", (c, e) => e.viaChargedAttack())
  .usageCanAppend(1, 3)
  .increaseDamage(1)
  .on("deductVoidDiceSkill", (c, e) =>
    e.isChargedAttack() && 
    c.getVariable("usage") >= 2)
  .deductVoidCost(1)
  .done();

/**
 * @id 116051
 * @name 阿丑
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 此召唤物在场期间可触发1次：我方角色受到伤害后，为荒泷一斗附属乱神之怪力。
 * 结束阶段：弃置此牌，造成1点岩元素伤害，并为荒泷一斗附属乱神之怪力。
 */
export const Ushi: SummonHandle = summon(116051)
  .tags("barrier")
  .endPhaseDamage(DamageType.Geo, 1)
  .dispose()
  .characterStatus(SuperlativeSuperstrength, $ => $.my.character.def(AratakiItto))
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .on("damaged")
  .usage(1, { name: "addStatusUsage" })
  .characterStatus(SuperlativeSuperstrength, $ => $.my.character.def(AratakiItto))
  .done();

/**
 * @id 116053
 * @name 怒目鬼王
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为岩元素伤害。
 * 持续回合：2
 * 所附属角色普通攻击后：为其附属乱神之怪力。（每回合1次）
 */
export const RagingOniKing = status(116053)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Geo)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usagePerRound(1)
  .characterStatus(SuperlativeSuperstrength, "@master")
  .done();

/**
 * @id 16051
 * @name 喧哗屋传说
 * @description
 * 造成2点物理伤害。
 */
export const FightClubLegend = skill(16051)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .do((c) => {
    if (
        c.self.hasEquipment(AratakiIchiban) &&  // 带有装备
        c.countOfSkill() > 0 &&                 // 本回合使用过
        c.skillInfo.charged                     // 触发乱神之怪力（重击）
      ) {
      c.damage(DamageType.Physical, 3);
    } else {
      c.damage(DamageType.Physical, 2);
    }
  })
  .done();

/**
 * @id 16052
 * @name 魔杀绝技·赤牛发破！
 * @description
 * 造成1点岩元素伤害，召唤阿丑，本角色附属乱神之怪力。
 */
export const MasatsuZetsugiAkaushiBurst = skill(16052)
  .type("elemental")
  .costGeo(3)
  .damage(DamageType.Geo, 1)
  .summon(Ushi)
  .characterStatus(SuperlativeSuperstrength)
  .done();

/**
 * @id 16053
 * @name 最恶鬼王·一斗轰临！！
 * @description
 * 造成4点岩元素伤害，本角色附属怒目鬼王。
 */
export const RoyalDescentBeholdIttoTheEvil = skill(16053)
  .type("burst")
  .costGeo(3)
  .costEnergy(3)
  .damage(DamageType.Geo, 4)
  .characterStatus(RagingOniKing)
  .done();

/**
 * @id 1605
 * @name 荒泷一斗
 * @description
 * 「荒泷卡牌游戏王中王一斗」
 */
export const AratakiItto = character(1605)
  .since("v3.6.0")
  .tags("geo", "claymore", "inazuma")
  .health(10)
  .energy(3)
  .skills(FightClubLegend, MasatsuZetsugiAkaushiBurst, RoyalDescentBeholdIttoTheEvil)
  .done();

/**
 * @id 216051
 * @name 荒泷第一
 * @description
 * 战斗行动：我方出战角色为荒泷一斗时，装备此牌。
 * 荒泷一斗装备此牌后，立刻使用一次喧哗屋传说。
 * 装备有此牌的荒泷一斗每回合第2次及以后使用喧哗屋传说时：如果触发乱神之怪力，伤害额外+1。
 * （牌组中包含荒泷一斗，才能加入牌组）
 */
export const AratakiIchiban = card(216051)
  .since("v3.6.0")
  .costGeo(1)
  .costVoid(2)
  .talent(AratakiItto)
  .on("enter")
  .useSkill(FightClubLegend)
  .done();
