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

import { character, skill, summon, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111073
 * @name 箓灵
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 * 此召唤物在场时：敌方角色受到的冰元素伤害和物理伤害+1。
 */
export const TalismanSpirit = summon(111073)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .on("increaseDamaged", (c, e) => !e.target.isMine() && ([DamageType.Cryo, DamageType.Physical] as DamageType[]).includes(e.type))
  .listenToAll()
  .increaseDamage(1)
  .done();

/**
 * @id 111072
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：2
 * 我方角色通过「普通攻击」触发此效果时，不消耗可用次数。（每回合1次）
 */
export const IcyQuill01 = combatStatus(111072)
  .conflictWith(111071)
  .variable("noUsageEffect", 1, { visible: false }) // 每回合一次不消耗可用次数
  .on("roundEnd")
  .setVariable("noUsageEffect", 1)
  .on("increaseDamage", (c, e) => e.via.caller.definition.type === "character" && e.type === DamageType.Cryo)
  .usage(2, { autoDecrease: false })
  .increaseDamage(1)
  .do((c, e) => {
    if (e.viaSkillType("normal") && c.getVariable("noUsageEffect")) {
      c.setVariable("noUsageEffect", 0);
    } else {
      c.consumeUsage()
    }
  })
  .done();

/**
 * @id 111071
 * @name 冰翎
 * @description
 * 我方角色造成的冰元素伤害+1。（包括角色引发的冰元素扩散的伤害）
 * 可用次数：2
 */
export const IcyQuill = combatStatus(111071)
  .conflictWith(111072)
  .on("increaseDamage", (c, e) => e.via.caller.definition.type === "character" && e.type === DamageType.Cryo)
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 11071
 * @name 踏辰摄斗
 * @description
 * 造成2点物理伤害。
 */
export const DawnstarPiercer = skill(11071)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11072
 * @name 仰灵威召将役咒
 * @description
 * 造成2点冰元素伤害，生成冰翎。
 */
export const SpringSpiritSummoning: SkillHandle = skill(11072)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .if((c) => c.self.hasEquipment(MysticalAbandon))
  .combatStatus(IcyQuill01)
  .else()
  .combatStatus(IcyQuill)
  .done();

/**
 * @id 11073
 * @name 神女遣灵真诀
 * @description
 * 造成1点冰元素伤害，召唤箓灵。
 */
export const DivineMaidensDeliverance = skill(11073)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 1)
  .summon(TalismanSpirit)
  .done();

/**
 * @id 1107
 * @name 申鹤
 * @description
 * 红尘渺渺，因果烟消。
 */
export const Shenhe = character(1107)
  .since("v3.7.0")
  .tags("cryo", "pole", "liyue")
  .health(10)
  .energy(2)
  .skills(DawnstarPiercer, SpringSpiritSummoning, DivineMaidensDeliverance)
  .done();

/**
 * @id 211071
 * @name 忘玄
 * @description
 * 战斗行动：我方出战角色为申鹤时，装备此牌。
 * 申鹤装备此牌后，立刻使用一次仰灵威召将役咒。
 * 装备有此牌的申鹤生成的冰翎被我方角色的「普通攻击」触发时：不消耗可用次数。（每回合1次）
 * （牌组中包含申鹤，才能加入牌组）
 */
export const MysticalAbandon = card(211071)
  .since("v3.7.0")
  .costCryo(3)
  .talent(Shenhe)
  .on("enter")
  .useSkill(SpringSpiritSummoning)
  .done();
