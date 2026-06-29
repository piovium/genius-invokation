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

import { character, skill, status, combatStatus, card, DamageType, $, type SkillHandle } from "@gi-tcg/core/builder";
import { EfficientSwitch } from "../../commons.gts";

/**
 * @id 126053
 * @name 回避
 * @description
 * 本回合结束阶段不会受到来自振荡冲击的伤害。
 * 持续回合：1
 */
export const Evasion = status(126053)
  .since("v6.6.0")
  .duration(1)
  .done();

/**
 * @id 126054
 * @name 力场操控
 * @description
 * 本回合中，该角色下次「普通攻击」少花费1个无色元素。
 */
export const ForceFieldManipulation = status(126054)
  .since("v6.6.0")
  .oneDuration()
  .once("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(1)
  .done();

/**
 * @id 126051
 * @name 低重力背景
 * @description
 * 双方角色使用技能后：该角色附属回避并切换至下一名角色。
 * 持续回合：2
 */
export const LowGravityBackground = combatStatus(126051)
  .since("v6.6.0")
  .duration(2)
  .on("useSkill", (c, e) => e.skill.definition.id !== GravityApplicationFieldReduction)
  .listenToAll()
  .do((c, e) => {
    c.characterStatus(Evasion, e.skill.caller.cast<"character">());
    const target = e.who === c.self.who ? $.my.next : $.opp.next;
    c.switchActive(target);
  })
  .done();

/**
 * @id 126052
 * @name 振荡冲击
 * @description
 * 结束阶段：对所有未附属回避的角色造成1点穿透伤害。
 * 持续回合：2
 */
export const ShockBlast = combatStatus(126052)
  .since("v6.6.0")
  .duration(2)
  .on("endPhase")
  .damage(DamageType.Piercing, 1, $.character.exclude($.has.def(Evasion)))
  .done();

/**
 * @id 26051
 * @name 重力应用程式·砸击
 * @description
 * 造成2点物理伤害。
 */
export const GravityApplicationCrush = skill(26051)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 26052
 * @name 重力应用程式·点状抵消
 * @description
 * 造成2点岩元素伤害，生成2层高效切换。
 */
export const GravityApplicationPointNull = skill(26052)
  .type("elemental")
  .costGeo(3)
  .damage(DamageType.Geo, 2)
  .combatStatus(EfficientSwitch, "my", {
    overrideVariables: {
      usage: 2
    }
  })
  .done();

/**
 * @id 26053
 * @name 重力应用程式·削减场域
 * @description
 * 造成3点岩元素伤害，生成低重力背景和振荡冲击，本回合中我方所有后台角色下次「普通攻击」少花费1个无色元素。
 */
export const GravityApplicationFieldReduction: SkillHandle = skill(26053)
  .type("burst")
  .costGeo(3)
  .costEnergy(2)
  .damage(DamageType.Geo, 3)
  .combatStatus(LowGravityBackground)
  .combatStatus(ShockBlast)
  .characterStatus(ForceFieldManipulation, $.my.standby)
  .done();

/**
 * @id 2605
 * @name 实验性场力发生装置
 * @description
 * 枫丹动能工程科学研究院的作品，因为事故而失控，拥有「抵消」重力的效果。
 */
export const ExperimentalFieldGenerator = character(2605)
  .since("v6.6.0")
  .tags("geo", "monster")
  .health(11)
  .energy(2)
  .skills(GravityApplicationCrush, GravityApplicationPointNull, GravityApplicationFieldReduction)
  .done();

/**
 * @id 226051
 * @name 重力场域
 * @description
 * 快速行动：装备给我方的实验性场力发生装置。
 * 任意阵营宣布结束后：该阵营切换至下一名角色。
 * 我方角色下落攻击造成的伤害+1。（每回合2次）
 * （牌组中包含实验性场力发生装置，才能加入牌组）
 */
export const GravityField = card(226051)
  .since("v6.6.0")
  .costGeo(1)
  .talent(ExperimentalFieldGenerator, "none")
  .on("declareEnd")
  .listenToAll()
  .do((c, e) => {
    const target = e.who === c.self.who ? $.my.next : $.opp.next;
    c.switchActive(target);
  })
  .on("increaseSkillDamage", (c, e) => e.viaPlungingAttack())
  .listenToPlayer()
  .usagePerRound(2)
  .increaseDamage(1)
  .done();
