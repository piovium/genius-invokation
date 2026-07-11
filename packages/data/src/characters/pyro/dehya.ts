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

import { character, skill, summon, status, combatStatus, card, DamageType, type SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 113094
 * @name 净焰剑狱之护
 * @description
 * 当净焰剑狱领域在场且迪希雅在我方后台，我方出战角色受到伤害时：抵消1点伤害；然后，如果迪希雅生命值至少为7，则其受到1点穿透伤害。（每回合1次）
 */
export const FierySanctumsProtection = combatStatus(113094)
  .tags("barrier")
  .on("decreaseDamaged", (c, e) =>
    e.target.isActive() &&
    c.$(`my standby characters with definition id ${Dehya}`))
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .done();

/**
 * @id 113093
 * @name 净焰剑狱领域
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：3
 * 当此召唤物在场且迪希雅在我方后台，我方出战角色受到伤害时：抵消1点伤害；然后，如果迪希雅生命值至少为7，则对其造成1点穿透伤害。（每回合1次）
 */
export const FierySanctumField = summon(113093)
  .endPhaseDamage(DamageType.Pyro, 1)
  .usage(3)
  .on("enter")
  .combatStatus(FierySanctumsProtection)
  .on("actionPhase")
  .combatStatus(FierySanctumsProtection)
  .on("selfDispose")
  .do((c) => {
    c.$(`my combat status with definition id ${FierySanctumsProtection}`)?.dispose();
  })
  .done();

/**
 * @id 113091
 * @name 炽炎狮子·炽鬃拳
 * @description
 * 本角色将在下次行动时，直接使用技能：炽鬃拳。
 */
export const BlazingLionessFlamemanesFist = status(113091)
  .reserve();

/**
 * @id 13095
 * @name 焚落踢
 * @description
 * 造成3点火元素伤害。
 */
export const IncinerationDrive = skill(13095)
  .type("burst")
  .prepared()
  .damage(DamageType.Pyro, 3)
  .done();

/**
 * @id 113092
 * @name 炽炎狮子·焚落踢
 * @description
 * 本角色将在下次行动时，直接使用技能：焚落踢。
 */
export const BlazingLionessIncinerationDrive = status(113092)
  .prepare(IncinerationDrive)
  .done();

/**
 * @id 13091
 * @name 拂金剑斗术
 * @description
 * 造成2点物理伤害。
 */
export const SandstormAssault = skill(13091)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 13092
 * @name 熔铁流狱
 * @description
 * 召唤净焰剑狱领域；如果已存在净焰剑狱领域，就先造成1点火元素伤害。
 */
export const MoltenInferno: SkillHandle = skill(13092)
  .type("elemental")
  .costPyro(3)
  .if((c) => c.$(`my summon with definition id ${FierySanctumField}`))
  .damage(DamageType.Pyro, 1)
  .summon(FierySanctumField)
  .done();

/**
 * @id 13093
 * @name 炎啸狮子咬
 * @description
 * 造成3点火元素伤害，然后准备技能：焚落踢。
 */
export const LeonineBite = skill(13093)
  .type("burst")
  .costPyro(4)
  .costEnergy(2)
  .damage(DamageType.Pyro, 3)
  .characterStatus(BlazingLionessIncinerationDrive)
  .done();

/**
 * @id 13096
 * @name 净焰剑狱·赤鬃之血
 * @description
 * 
 */
export const FierySanctumRedmanesBlood = skill(13096)
  .type("passive")
  .on("damaged", (c, e) => e.target.id !== c.self.id)
  .listenToPlayer()
  .do((c) => {
    const protection = c.$(`my combat status with definition id ${FierySanctumsProtection}`);
    if (protection?.getVariable("usage") === 0) {
      protection.dispose();
      if (c.self.health >= 7) {
        c.damage(DamageType.Piercing, 1, "@self");
      }
    }
  })
  .done();

/**
 * @id 1309
 * @name 迪希雅
 * @description
 * 鹫鸟的眼睛，狮子的灵魂，沙漠自由的女儿。
 */
export const Dehya = character(1309)
  .since("v4.1.0")
  .tags("pyro", "claymore", "sumeru", "eremite")
  .health(10)
  .energy(2)
  .skills(SandstormAssault, MoltenInferno, LeonineBite, IncinerationDrive, FierySanctumRedmanesBlood)
  .done();

/**
 * @id 213091
 * @name 崇诚之真
 * @description
 * 战斗行动：我方出战角色为迪希雅时，装备此牌。
 * 迪希雅装备此牌后，立刻使用一次熔铁流狱。
 * 结束阶段：如果装备有此牌的迪希雅生命值不多于6，则治疗该角色2点。
 * （牌组中包含迪希雅，才能加入牌组）
 */
export const StalwartAndTrue = card(213091)
  .since("v4.1.0")
  .costPyro(4)
  .talent(Dehya)
  .on("enter")
  .useSkill(MoltenInferno)
  .on("endPhase", (c) => c.self.master.health <= 6)
  .heal(2, "@master")
  .done();
