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

import { character, skill, summon, status, card, DamageType, Aura } from "@gi-tcg/core/builder";

/**
 * @id 111102
 * @name 临事场域
 * @description
 * 结束阶段：造成1点冰元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
export const NewsflashField = summon(111102)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(2)
  .heal(1, "my active")
  .done();

/**
 * @id 111101
 * @name 瞬时剪影
 * @description
 * 结束阶段：对所附属角色造成1点冰元素伤害；如果可用次数仅剩余1且所附属角色具有冰元素附着，则此伤害+1。
 * 可用次数：2
 */
export const SnappySilhouette = status(111101)
  .on("endPhase")
  .usage(2)
  .do((c) => {
    if (([Aura.Cryo, Aura.CryoDendro] as Aura[]).includes(c.self.master.aura) && c.getVariable("usage") === 1) {
      c.damage(DamageType.Cryo, 2, "@master");
    } else {
      c.damage(DamageType.Cryo, 1, "@master");
    }
  })
  .done();

/**
 * @id 11101
 * @name 冷色摄影律
 * @description
 * 造成1点冰元素伤害。
 */
export const CoolcolorCapture = skill(11101)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 11102
 * @name 取景·冰点构图法
 * @description
 * 造成1点冰元素伤害，目标附属瞬时剪影。
 */
export const FramingFreezingPointComposition = skill(11102)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 1)
  .characterStatus(SnappySilhouette, "opp active")
  .done();

/**
 * @id 11103
 * @name 定格·全方位确证
 * @description
 * 造成1点冰元素伤害，治疗我方所有角色1点，召唤临事场域。
 */
export const StillPhotoComprehensiveConfirmation = skill(11103)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 1)
  .heal(1, "all my characters")
  .summon(NewsflashField)
  .done();

/**
 * @id 1110
 * @name 夏洛蒂
 * @description
 * 「真实至上，故事超群！」
 */
export const Charlotte = character(1110)
  .since("v4.5.0")
  .tags("cryo", "catalyst", "fontaine", "ousia")
  .health(11)
  .energy(2)
  .skills(CoolcolorCapture, FramingFreezingPointComposition, StillPhotoComprehensiveConfirmation)
  .done();

/**
 * @id 211101
 * @name 以有趣相关为要义
 * @description
 * 战斗行动：我方出战角色为夏洛蒂时，装备此牌。
 * 夏洛蒂装备此牌后，立刻使用一次取景·冰点构图法。
 * 装备有此牌的夏洛蒂在场时，我方角色进行普通攻击后：如果对方场上有角色附属有瞬时剪影，则治疗我方出战角色2点。（每回合1次）
 * （牌组中包含夏洛蒂，才能加入牌组）
 */
export const ASummationOfInterest = card(211101)
  .since("v4.5.0")
  .costCryo(3)
  .talent(Charlotte)
  .on("enter")
  .useSkill(FramingFreezingPointComposition)
  .on("useSkill", (c, e) => e.isSkillType("normal") && c.$(`opp status with definition id ${SnappySilhouette}`))
  .listenToPlayer()
  .usagePerRound(1)
  .heal(2, "my active")
  .done();
