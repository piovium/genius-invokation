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

import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 127011
 * @name 活化激能
 * @description
 * 本角色造成或受到元素伤害后：累积1层「活化激能」。（最多累积3层）
 * 结束阶段：如果「活化激能」层数已达到上限，就将其清空。同时，角色失去所有充能。
 */
export const RadicalVitalityStatus = status(127011)
  .variable("vitality", 0)
  .defineSnippet("addVitality", (c) => {
    const max = c.self.master.hasEquipment(ProliferatingSpores) ? 4 : 3;
    c.addVariableWithMax("vitality", 1, max);
  })
  .on("dealDamage")
  .callSnippet("addVitality")
  .on("damaged")
  .callSnippet("addVitality")
  .on("endPhase", (c) => c.getVariable("vitality") >= 3)
  .do((c) => {
    c.setVariable("vitality", 0);
    const ch = c.self.master;
    ch.loseEnergy(ch.energy);
  })
  .done();

/**
 * @id 27011
 * @name 菌王舞步
 * @description
 * 造成2点物理伤害。
 */
export const MajesticDance = skill(27011)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 27012
 * @name 不稳定孢子云
 * @description
 * 造成3点草元素伤害。
 */
export const VolatileSporeCloud = skill(27012)
  .type("elemental")
  .costDendro(3)
  .damage(DamageType.Dendro, 3)
  .done();

/**
 * @id 27013
 * @name 尾羽豪放
 * @description
 * 造成4点草元素伤害，消耗所有活化激能层数，每层使此伤害+1。
 */
export const FeatherSpreading = skill(27013)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .do((c) => {
    const val = c.$(`status with definition id ${RadicalVitalityStatus} at @self`)?.getVariable("vitality") ?? 0;
    c.damage(DamageType.Dendro, 4 + val);
  })
  .done();

/**
 * @id 27014
 * @name 活化激能
 * @description
 * 【被动】战斗开始时，初始附属活化激能。
 */
export const RadicalVitality = skill(27014)
  .type("passive")
  .on("battleBegin")
  .characterStatus(RadicalVitalityStatus)
  .on("revive")
  .characterStatus(RadicalVitalityStatus)
  .done();

/**
 * @id 2701
 * @name 翠翎恐蕈
 * @description
 * 悄声静听，可以听到幽林之中，蕈类王者巡视领土的脚步…
 */
export const JadeplumeTerrorshroom = character(2701)
  .since("v3.3.0")
  .tags("dendro", "monster")
  .health(12)
  .energy(2)
  .skills(MajesticDance, VolatileSporeCloud, FeatherSpreading, RadicalVitality)
  .done();

/**
 * @id 227011
 * @name 孢子增殖
 * @description
 * 战斗行动：我方出战角色为翠翎恐蕈时，装备此牌。
 * 翠翎恐蕈装备此牌后，立刻使用一次不稳定孢子云。
 * 装备有此牌的翠翎恐蕈，可累积的「活化激能」层数+1。
 * （牌组中包含翠翎恐蕈，才能加入牌组）
 */
export const ProliferatingSpores = card(227011)
  .since("v3.3.0")
  .costDendro(3)
  .talent(JadeplumeTerrorshroom)
  .on("enter")
  .useSkill(VolatileSporeCloud)
  .done();
