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

import { character, skill, summon, combatStatus, card, DamageType, SkillHandle, extension, $ } from "@gi-tcg/core/builder";

/**
 * @id 111081
 * @name 寒病鬼差
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：3
 * 此召唤物在场时，七七使用「普通攻击」后：治疗受伤最多的我方角色1点；每回合1次：再治疗我方出战角色1点。
 */
export const HeraldOfFrost = summon(111081)
  .endPhaseDamage(DamageType.Cryo, 1)
  .usage(3)
  .on("useSkill", (c, e) => e.skill.caller.definition.id === Qiqi && e.isSkillType("normal"))
  .heal(1, "my characters order by health - maxHealth limit 1")
  .on("useSkill", (c, e) => e.skill.caller.definition.id === Qiqi && e.isSkillType("normal"))
  .usagePerRound(1)
  .heal(1, "my active")
  .done();

/**
 * @id 111082
 * @name 度厄真符
 * @description
 * 我方角色使用技能后：如果该角色生命值未满，则治疗该角色2点。
 * 可用次数：3
 */
export const FortunepreservingTalisman = combatStatus(111082)
  .on("useSkill", (c, e) => {
    if (e.skill.definition.id === AdeptusArtPreserverOfFortune) {
      return false;
    }
    return c.$(`@event.skillCaller and character with health < maxHealth`)
  })
  .usage(3)
  .heal(2, "@event.skillCaller")
  .done();

/**
 * @id 11081
 * @name 云来古剑法
 * @description
 * 造成2点物理伤害。
 */
export const AncientSwordArt = skill(11081)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 11082
 * @name 仙法·寒病鬼差
 * @description
 * 召唤寒病鬼差。
 */
export const AdeptusArtHeraldOfFrost: SkillHandle = skill(11082)
  .type("elemental")
  .costCryo(3)
  .summon(HeraldOfFrost)
  .done();

const RiteOfResurrectionUsedExtension = extension(211081, { count: "pair<number>" })
  .initialState({ count: [0, 0] })
  .description("本场对局中某方触发起死回骸的次数")
  .mutateWhen("onDamageOrHeal", (st, e) => {
    // 七七倒下时重置
    if (e.target.definition.id === Qiqi && e.damageInfo.causeDefeated) {
      st.count[e.targetWho] = 0;
    }
  })
  .done();

/**
 * @id 11083
 * @name 仙法·救苦度厄
 * @description
 * 造成3点冰元素伤害，生成度厄真符。
 */
export const AdeptusArtPreserverOfFortune: SkillHandle = skill(11083)
  .type("burst")
  .costCryo(3)
  .costEnergy(3)
  .associateExtension(RiteOfResurrectionUsedExtension)
  .do((c) => {
    c.damage(DamageType.Cryo, 3);
    c.combatStatus(FortunepreservingTalisman);
    if (c.self.hasEquipment(RiteOfResurrection) && 
      c.getExtensionState().count[c.self.who] < 2) {
      c.setExtensionState((st) => st.count[c.self.who]++);
      const defeated = c.queryAll($.my.character.onlyDefeated);
      for (const ch of defeated) {
        ch.heal(2, { kind: "revive" });
      }
    }
  })
  .done();

/**
 * @id 1108
 * @name 七七
 * @description
 * 流转不息，生生不绝。
 */
export const Qiqi = character(1108)
  .since("v4.0.0")
  .tags("cryo", "sword", "liyue")
  .health(10)
  .energy(3)
  .skills(AncientSwordArt, AdeptusArtHeraldOfFrost, AdeptusArtPreserverOfFortune)
  .done();

/**
 * @id 211081
 * @name 起死回骸
 * @description
 * 战斗行动：我方出战角色为七七时，装备此牌。
 * 七七装备此牌后，立刻使用一次仙法·救苦度厄。
 * 装备有此牌的七七使用仙法·救苦度厄时：复苏我方所有倒下的角色，并治疗其2点。（整场牌局限制2次）
 * （牌组中包含七七，才能加入牌组）
 */
export const RiteOfResurrection = card(211081)
  .since("v4.0.0")
  .costCryo(4)
  .costEnergy(3)
  .talent(Qiqi)
  .on("enter")
  .useSkill(AdeptusArtPreserverOfFortune)
  .done();
