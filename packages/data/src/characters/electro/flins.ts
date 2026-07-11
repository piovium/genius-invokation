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

import { character, skill, status, card, DamageType, $, type SkillHandle, type CharacterHandle, Reaction } from "@gi-tcg/core/builder";
import { Conductive, Thundercloud } from "../../commons.gts";

/**
 * @id 114181
 * @name 幽焰显迹
 * @description
 * 本回合所附属角色造成的物理伤害变为雷元素伤害，并且「普通攻击」造成的伤害+1。
 * 持续回合：1
 */
export const ManifestFlame = status(114181)
  .since("v6.6.0")
  .duration(1)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();

/**
 * @id 14185
 * @name 雷霆交响
 * @description
 * 造成2点雷元素伤害，如果我方场上存在雷暴云，则造成的伤害额外+2。
 */
export const ThunderousSymphony = skill(14185)
  .type("burst")
  .prepared()
  .if((c) => c.query($.my.summon.def(Thundercloud)))
  .damage(DamageType.Electro, 4)
  .else()
  .damage(DamageType.Electro, 2)
  .done();

/**
 * @id 114182
 * @name 雷霆交响
 * @description
 * 本角色将在下次行动时，直接使用技能：雷霆交响。
 */
export const ThunderousSymphonyStatus = status(114182)
  .since("v6.6.0")
  .prepare(ThunderousSymphony)
  .done();

/**
 * @id 14181
 * @name 扈圣魔枪
 * @description
 * 造成2点物理伤害。
 */
export const PocztowyDemonspear = skill(14181)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14182
 * @name 古律·孤灯遗秘
 * @description
 * 每回合首次使用此技能时，造成1点雷元素伤害，自身附属幽焰显迹。再次使用此技能，消耗2点充能，自身准备技能：雷霆交响。
 */
export const AncientRiteArcaneLight: SkillHandle = skill(14182)
  .type("elemental")
  .costElectro(2)
  .filter((c) => c.countOfSkill() === 0 || c.self.energy >= 1)
  .do((c) => {
    if (c.countOfSkill() === 0) {
      c.damage(DamageType.Electro, 1);
      c.characterStatus(ManifestFlame, c.self);
    }
  })
  .done();

/**
 * @id 14183
 * @name 旧仪·夜客致访
 * @description
 * 造成6点雷元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
export const AncientRitualComethTheNight = skill(14183)
  .type("burst")
  .costElectro(4)
  .costEnergy(4)
  .damage(DamageType.Piercing, 2, $.opp.standby)
  .damage(DamageType.Electro, 6)
  .done();

/**
 * @id 14184
 * @name 月兆祝赐·旧世潜藏
 * @description
 * 【被动】本局游戏中，敌方受到感电反应时，改为月感电反应。
 * 自身在场，敌方行动牌被赋予电击时：对敌方场上生命值最高的角色造成1点穿透伤害。
 */
export const MoonsignBenedictionOldWorldSecrets = skill(14184)
  .type("passive")
  .on("enterRelative", (c, e) => !e.entity.isMine() && e.entity.definition.id === Conductive)
  .listenToAll()
  .damage(DamageType.Piercing, 1, $.macros.oppMaxHealth)
  .on("useSkill", (c, e) =>
    e.skill.definition.id === AncientRiteArcaneLight &&
    c.countOfSkill(Flins, AncientRiteArcaneLight) >= 2 &&
    c.self.energy >= 2)
  .asSkillType("elemental")
  .do((c) => {
    c.self.loseEnergy(2);
    c.characterStatus(ThunderousSymphonyStatus, c.self);
  })
  .done();

/**
 * @id 14186
 * @name 月兆祝赐·旧世潜藏
 * @description
 * 【被动】本局游戏中，敌方受到感电反应时，改为月感电反应。
 * 自身在场，敌方行动牌被赋予电击时：对敌方场上生命值最高的角色造成1点穿透伤害。
 */
export const MoonsignBenedictionOldWorldSecrets01 = skill(14186)
  .type("passive")
  .reserve();

/**
 * @id 14187
 * @name 古律·孤灯遗秘
 * @description
 * （test）
 */
export const AncientRiteArcaneLight01 = skill(14187)
  .type("elemental")
  .reserve();

/**
 * @id 1418
 * @name 菲林斯
 * @description
 * 墓园灯火，引向深邃之暗。
 */
export const Flins: CharacterHandle = character(1418)
  .since("v6.6.0")
  .tags("electro", "pole", "nodkrai")
  .health(10)
  .energy(4)
  .skills(PocztowyDemonspear, AncientRiteArcaneLight, AncientRitualComethTheNight, MoonsignBenedictionOldWorldSecrets, ThunderousSymphony)
  .enableLunarReactions(Reaction.LunarElectroCharged)
  .done();

/**
 * @id 214181
 * @name 拨开雪翳之幕
 * @description
 * 快速行动：装备给我方的菲林斯。
 * 菲林斯获得1点充能。
 * 我方触发月感电反应后：菲林斯获得1点充能。（每回合1次）
 * （牌组中包含菲林斯，才能加入牌组）
 */
export const PartTheVeilOfSnow = card(214181)
  .since("v6.6.0")
  .costElectro(1)
  .talent(Flins, "none")
  .on("enter")
  .gainEnergy(1, "@master")
  .on("dealReaction", (c, e) => e.type === Reaction.LunarElectroCharged)
  .listenToPlayer()
  .usagePerRound(1)
  .gainEnergy(1, "@master")
  .done();
