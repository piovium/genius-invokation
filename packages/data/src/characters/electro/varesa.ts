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

import { character, skill, status, card, DamageType, EquipmentHandle } from "@gi-tcg/core/builder";

/**
 * @id 114151
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 * 夜魂值为0时，退出夜魂加持。
 */
export const NightsoulsBlessing = status(114151)
  .since("v6.1.0")
  .nightsoulsBlessing(2, { autoDispose: true })
  .done();

/**
 * @id 14155
 * @name 闪烈降临·大火山崩落
 * @description
 * 造成3点雷元素伤害，此技能视为下落攻击。
 */
export const GuardianVentVolcanoKablam = skill(14155)
  .type("burst")
  .prepared()
  .forcePlunging()
  .damage(DamageType.Electro, 3)
  .done();


/**
 * @id 114153
 * @name 闪烈降临·大火山崩落
 * @description
 * 本角色将在下次行动时，直接使用技能：闪烈降临·大火山崩落。
 */
export const GuardianVentVolcanoKablamStatus = status(114153)
  .since("v6.1.0")
  .prepare(GuardianVentVolcanoKablam)
  .done();

/**
 * @id 114152
 * @name 极限驱动
 * @description
 * 瓦雷莎切换为「出战角色」后：准备技能：闪烈降临·大火山崩落。
 * 可用次数：1
 */
export const ApexDrive = status(114152)
  .since("v6.1.0")
  .on("switchActive", (c, e) => e.switchInfo.to.id === c.self.master.id)
  .usage(1)
  .characterStatus(GuardianVentVolcanoKablamStatus, "@master")
  .done();

/**
 * @id 114154
 * @name 突驰烈进
 * @description
 * 我方下次行动前，将所附属角色切换为出战角色。
 */
export const SuddenOnrush = status(114154)
  .since("v6.1.0")
  .once("beforeAction")
  .switchActive("@master")
  .done();

/**
 * @id 14151
 * @name 角力搏摔
 * @description
 * 造成1点雷元素伤害。此次技能为下落攻击时：造成的伤害+1，自身进入夜魂加持，并获得1点「夜魂值」。
 */
export const ByTheHorns = skill(14151)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .do((c) => {
    if (c.skillInfo.plunging) {
      c.damage(DamageType.Electro, 2);
      c.gainNightsoul("@self", 1);
    } else {
      c.damage(DamageType.Electro, 1);
    }
  })
  .done();

/**
 * @id 14152
 * @name 夜虹逐跃
 * @description
 * 造成2点雷元素伤害，自身附属突驰烈进，进入夜魂加持，并获得1点「夜魂值」，然后我方切换到下一个角色。
 */
export const RidingTheNightrainbow = skill(14152)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 2)
  .characterStatus(SuddenOnrush)
  .gainNightsoul("@self", 1)
  .done();

/**
 * @id 14153
 * @name 闪烈降临！
 * @description
 * 造成3点雷元素伤害，自身附属极限驱动。
 */
export const GuardianVent = skill(14153)
  .type("burst")
  .costElectro(3)
  .costEnergy(3)
  .damage(DamageType.Electro, 3)
  .characterStatus(ApexDrive)
  .done();

/**
 * @id 14154
 * @name 连势，三重腾跃！
 * @description
 * 【被动】瓦雷莎使用技能后：如果自身「夜魂值」等于2，则消耗2点「夜魂值」，自身附属极限驱动。
 */
export const TagteamTripleJump = skill(14154)
  .type("passive")
  .on("useSkill", (c) => c.self.hasNightsoulsBlessing()?.variables.nightsoul === 2)
  .consumeNightsoul("@self", 2)
  .characterStatus(ApexDrive)
  .if((c) => c.self.hasEquipment(AHeroOfJusticesTriumph))
  .gainEnergy(1, "@self")
  .done();

/**
 * @id 14156
 * @name 夜虹逐跃
 * @description
 * 造成D__KEY__DAMAGE点D__KEY__ELEMENT，自身附属突驰烈进，进入夜魂加持，并获得1点「夜魂值」，然后我方切换到下一个角色。
 */
export const RidingTheNightrainbowPassive = skill(14156)
  .type("passive")
  .on("useSkill", (c, e) => e.skill.definition.id === RidingTheNightrainbow)
  .switchActive("my next")
  .done();

/**
 * @id 1415
 * @name 瓦雷莎
 * @description
 * 谨守恬安，豪勇锐进。
 */
export const Varesa = character(1415)
  .since("v6.1.0")
  .tags("electro", "catalyst", "natlan")
  .health(10)
  .energy(3)
  .skills(ByTheHorns, RidingTheNightrainbow, GuardianVent, TagteamTripleJump, GuardianVentVolcanoKablam, RidingTheNightrainbowPassive)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 214151
 * @name 正义英雄的凯旋
 * @description
 * 快速行动：装备给我方的瓦雷莎。
 * 瓦雷莎触发连势，三重腾跃！后：获得1点充能。
 * 装备有此牌的瓦雷莎的「元素爆发」造成的伤害+1。
 * （牌组中包含瓦雷莎，才能加入牌组）
 */
export const AHeroOfJusticesTriumph: EquipmentHandle = card(214151)
  .since("v6.1.0")
  .costElectro(1)
  .talent(Varesa, "none")
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(1)
  .done();
