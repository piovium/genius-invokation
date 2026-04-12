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

import { character, skill, status, card, DamageType, Aura, combatStatus, $ } from "@gi-tcg/core/builder";

/**
 * @id 124063
 * @name 轰霆护罩
 * @description
 * 所附属角色免疫所有伤害。
 * 此状态提供2次雷元素附着（可被元素反应消耗）：耗尽后移除此效果，并使所附属角色无法使用技能且在结束阶段受到6点穿透伤害。
 */
export const ThunderousWard = status(124063)
  .reserve();

/**
 * @id 124064
 * @name 深渊滚雷
 * @description
 * 所附属角色无法使用技能。
 * 结束阶段：对所附属角色造成6点穿透伤害，然后移除此效果。
 */
export const RollingAbyssalThunder = status(124064)
  .reserve();

/**
 * @id 124062
 * @name 雷之新生·锐势
 * @description
 * 角色造成的雷元素伤害+1。
 */
export const ElectricRebirthHoned = status(124062)
  .since("v5.1.0")
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Electro)
  .increaseDamage(1)
  .done();

/**
 * @id 124061
 * @name 雷之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到4点生命值。此效果触发后，角色造成的雷元素伤害+1。
 */
export const ElectricRebirth = status(124061)
  .since("v5.1.0")
  .on("beforeDefeated")
  .immune(4)
  .do((c) => {
    const talent = c.self.master.hasEquipment(ChainLightningCascade);
    if (talent) {
      c.dispose(talent);
      c.$("opp active")?.loseEnergy(1);
    }
  })
  .characterStatus(ElectricRebirthHoned, "@master")
  .dispose()
  .done();

/**
 * @id 24061
 * @name 渊薮落雷
 * @description
 * 造成1点雷元素伤害。
 */
export const DenOfThunder = skill(24061)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Electro, 1)
  .done();

/**
 * @id 24062
 * @name 秘渊虚霆
 * @description
 * 造成3点雷元素伤害。
 * 如果目标已附着雷元素，则夺取对方1点充能。（如果夺取时此角色充能已满，则改为由下一个充能未满的角色获得充能）
 */
export const ShockOfTheEnigmaticAbyss = skill(24062)
  .type("elemental")
  .costElectro(3)
  .do((c) => {
    const target = c.$("opp active");
    if (target?.aura === Aura.Electro) {
      const energy = target.loseEnergy(1);
      if (energy > 0) {
        c.$("my characters with energy < maxEnergy")?.gainEnergy(1);
      }
    }
  })
  .damage(DamageType.Electro, 3)
  .done();

/**
 * @id 24063
 * @name 狂迸骇雷
 * @description
 * 造成3点雷元素伤害。
 * 如果目标充能不多于1，造成的伤害+2。
 */
export const WildThunderburst = skill(24063)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .if((c) => c.$("opp active")!.energy <= 1)
  .damage(DamageType.Electro, 5)
  .else()
  .damage(DamageType.Electro, 3)
  .done();

/**
 * @id 24064
 * @name 雷之新生
 * @description
 * 【被动】战斗开始时，初始附属雷之新生。
 */
export const ElectricRebirthPassive = skill(24064)
  .type("passive")
  .on("battleBegin")
  .characterStatus(ElectricRebirth)
  .done();

/**
 * @id 24065
 * @name 雷之新生
 * @description
 * 战斗开始时，初始附属雷之新生。
 */
export const ElectricRebirthPassive01 = skill(24065)
  .reserve();

/**
 * @id 2406
 * @name 深渊咏者·紫电
 * @description
 * 高颂渊薮，侵蚀之智。
 */
export const AbyssLectorVioletLightning = character(2406)
  .since("v5.1.0")
  .tags("electro", "monster")
  .health(6)
  .energy(2)
  .skills(DenOfThunder, ShockOfTheEnigmaticAbyss, WildThunderburst, ElectricRebirthPassive)
  .done();

// 侵雷重闪入场时创建此出战状态，检测咏者击倒后夺取1点充能
export const ChainLightningCascadeCombatStatus = combatStatus(124065)
  .on("defeated", (c, e) => e.target.definition.id === AbyssLectorVioletLightning)
  .do((c) => {
    c.query($.opp.active)?.loseEnergy(1);
    c.dispose();
  })
  .done();

/**
 * @id 224061
 * @name 侵雷重闪
 * @description
 * 入场时：如果装备有此牌的深渊咏者·紫电已触发过雷之新生，则使敌方出战角色失去1点充能。
 * 装备有此牌的深渊咏者·紫电被击倒或触发雷之新生时：弃置此牌，使敌方出战角色失去1点充能。
 * （牌组中包含深渊咏者·紫电，才能加入牌组）
 */
export const ChainLightningCascade = card(224061)
  .since("v5.1.0")
  .costElectro(1)
  .talent(AbyssLectorVioletLightning, "none")
  .on("enter")
  .do((c) => {
    c.combatStatus(ChainLightningCascadeCombatStatus);
    if (!c.self.master.hasStatus(ElectricRebirth)) {
      c.query($.opp.active)?.loseEnergy(1);
    }
  })
  .done();
