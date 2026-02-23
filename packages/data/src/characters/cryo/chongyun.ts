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

import { character, skill, combatStatus, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111042
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害，普通攻击造成的伤害+1。
 * 持续回合：2
 */
export const ChonghuaFrostField01 = combatStatus(111042)
  .conflictWith(111041)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => {
    if (e.type !== DamageType.Physical) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .changeDamageType(DamageType.Cryo)
  .on("increaseSkillDamage", (c, e) => {
    if (!e.viaSkillType("normal")) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .increaseDamage(1)
  .done();

/**
 * @id 111041
 * @name 重华叠霜领域
 * @description
 * 我方单手剑、双手剑或长柄武器角色造成的物理伤害变为冰元素伤害。
 * 持续回合：2
 */
export const ChonghuaFrostField = combatStatus(111041)
  .conflictWith(111042)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => {
    if (e.type !== DamageType.Physical) return false;
    const { tags } = e.source.cast<"character">().definition;
    return tags.includes("sword") || tags.includes("claymore") || tags.includes("pole");
  })
  .changeDamageType(DamageType.Cryo)
  .done();

/**
 * @id 11041
 * @name 灭邪四式
 * @description
 * 造成2点物理伤害。
 */
export const Demonbane = skill(11041)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11042
 * @name 重华叠霜
 * @description
 * 造成3点冰元素伤害，生成重华叠霜领域。
 */
export const ChonghuasLayeredFrost: SkillHandle = skill(11042)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 3)
  .if((c) => c.self.hasEquipment(SteadyBreathing))
  .combatStatus(ChonghuaFrostField01)
  .else()
  .combatStatus(ChonghuaFrostField)
  .done();

/**
 * @id 11043
 * @name 云开星落
 * @description
 * 造成7点冰元素伤害。
 */
export const CloudpartingStar = skill(11043)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .damage(DamageType.Cryo, 7)
  .done();

/**
 * @id 1104
 * @name 重云
 * @description
 * 「夏天啊，你还是悄悄过去吧…」
 */
export const Chongyun = character(1104)
  .since("v3.3.0")
  .tags("cryo", "claymore", "liyue")
  .health(10)
  .energy(3)
  .skills(Demonbane, ChonghuasLayeredFrost, CloudpartingStar)
  .done();

/**
 * @id 211041
 * @name 吐纳真定
 * @description
 * 战斗行动：我方出战角色为重云时，装备此牌。
 * 重云装备此牌后，立刻使用一次重华叠霜。
 * 装备有此牌的重云生成的重华叠霜领域获得以下效果：
 * 使我方单手剑、双手剑或长柄武器角色的普通攻击伤害+1。
 * （牌组中包含重云，才能加入牌组）
 */
export const SteadyBreathing = card(211041)
  .since("v3.3.0")
  .costCryo(3)
  .talent(Chongyun)
  .on("enter")
  .useSkill(ChonghuasLayeredFrost)
  .done();
