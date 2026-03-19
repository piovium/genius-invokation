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

import { character, skill, summon, status, combatStatus, card, DamageType, DiceType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 115093
 * @name 赫耀多方面体
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：3
 * 此召唤物在场时：敌方角色受到的风元素伤害+1。
 */
export const DazzlingPolyhedron = summon(115093)
  .conflictWith(115096)
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(3)
  .on("increaseDamaged", (c, e) => !e.target.isMine() && e.type === DamageType.Anemo)
  .listenToAll()
  .increaseDamage(1)
  .done();

/**
 * @id 115095
 * @name 妙道合真（生效中）
 * @description
 * 行动阶段开始时：移除此效果，生成1个风元素。
 */
export const TheWondrousPathOfTruthActive = combatStatus(115095)
  .reserve();

/**
 * @id 115096
 * @name 赫耀多方面体
 * @description
 * 结束阶段：造成1点风元素伤害。
 * 可用次数：3
 * 此召唤物在场时：敌方角色受到的风元素伤害+1。
 * 入场时和行动阶段开始时：生成1个风元素。
 */
export const DazzlingPolyhedron01 = summon(115096)
  .conflictWith(115093)
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(3)
  .on("increaseDamaged", (c, e) => !e.target.isMine() && e.type === DamageType.Anemo)
  .listenToAll()
  .increaseDamage(1)
  .on("actionPhase")
  .generateDice(DiceType.Anemo, 1)
  .done();

/**
 * @id 115091
 * @name 疾风示现
 * @description
 * 所附属角色进行重击时：少花费1个无色元素，造成的物理伤害变为风元素伤害，并且使目标角色附属风压坍陷。
 * 可用次数：1
 */
export const ManifestGale = status(115091)
  .on("deductVoidDiceSkill", (c, e) => e.isChargedAttack())
  .deductVoidCost(1)
  .on("modifySkillDamageType", (c, e) => e.viaChargedAttack())
  .usage(1)
  .do((c, e) => {
    if (e.type === DamageType.Physical){
      e.changeDamageType(DamageType.Anemo);
    }
    c.characterStatus(PressurizedCollapse, e.target);
  })
  .done();

/**
 * @id 115092
 * @name 风压坍陷
 * @description
 * 结束阶段：将所附属角色切换为「出战角色」。
 * 可用次数：1
 * （同一方场上最多存在一个此状态）
 */
export const PressurizedCollapse = status(115092)
  .unique()
  .on("endPhase")
  .usage(1)
  .switchActive("@master")
  .done();

/**
 * @id 15091
 * @name 迴身箭术
 * @description
 * 造成2点物理伤害。
 */
export const ParthianShot = skill(15091)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15092
 * @name 非想风天
 * @description
 * 造成3点风元素伤害，本角色附属疾风示现。
 */
export const WindRealmOfNasamjnin = skill(15092)
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 3)
  .characterStatus(ManifestGale, "@self")
  .done();

/**
 * @id 15093
 * @name 抟风秘道
 * @description
 * 造成1点风元素伤害，召唤赫耀多方面体。
 */
export const TheWindsSecretWays: SkillHandle = skill(15093)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 1)
  .do((c) => {
    if (c.self.hasEquipment(TheWondrousPathOfTruth)) {
      c.summon(DazzlingPolyhedron01);
      c.generateDice(DiceType.Anemo, 1);
    } else {
      c.summon(DazzlingPolyhedron);
    }
  })
  .done();

/**
 * @id 1509
 * @name 珐露珊
 * @description
 * 机巧易解，世殊难算。
 */
export const Faruzan = character(1509)
  .since("v4.6.0")
  .tags("anemo", "bow", "sumeru")
  .health(10)
  .energy(2)
  .skills(ParthianShot, WindRealmOfNasamjnin, TheWindsSecretWays)
  .done();

/**
 * @id 215091
 * @name 妙道合真
 * @description
 * 战斗行动：我方出战角色为珐露珊时，装备此牌。
 * 珐露珊装备此牌后，立刻使用一次抟风秘道。
 * 装备有此牌的珐露珊所生成的赫耀多方面体，会在其入场时和行动阶段开始时生成1个风元素。
 * （牌组中包含珐露珊，才能加入牌组）
 */
export const TheWondrousPathOfTruth = card(215091)
  .since("v4.6.0")
  .costAnemo(3)
  .costEnergy(2)
  .talent(Faruzan)
  .on("enter")
  .useSkill(TheWindsSecretWays)
  .done();
