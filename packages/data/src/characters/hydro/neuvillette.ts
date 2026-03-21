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

import { character, skill, status, combatStatus, card, DamageType, SkillHandle, CharacterHandle } from "@gi-tcg/core/builder";

/**
 * @id 12104
 * @name 衡平推裁
 * @description
 * （需准备1个行动轮）
 * 造成2点水元素伤害，如果本角色生命值至少为6，则此伤害+1并对自身造成1点穿透伤害。
 */
export const EquitableJudgment = skill(12104)
  .type("normal")
  .prepared()
  .do((c) => {
    if (c.self.health >= 6) {
      c.damage(DamageType.Hydro, 3);
      c.damage(DamageType.Piercing, 1, "@self");
    } else {
      c.damage(DamageType.Hydro, 2);
    }
  })
  .done();

/**
 * @id 112102
 * @name 衡平推裁
 * @description
 * 本角色将在下次行动时，直接使用技能：衡平推裁。
 */
export const EquitableJudgmentStatus = status(112102)
  .prepare(EquitableJudgment)
  .done();

/**
 * @id 112103
 * @name 遗龙之荣
 * @description
 * 角色造成的伤害+1。
 * 可用次数：2
 */
export const PastDraconicGlories = status(112103)
  .on("increaseSkillDamage")
  .usage(2)
  .increaseDamage(1)
  .done();

/**
 * @id 112101
 * @name 源水之滴
 * @description
 * 那维莱特进行普通攻击后：治疗那维莱特2点。如果那维莱特是我方「出战角色」，则准备技能：衡平推裁。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
export const SourcewaterDroplet = combatStatus(112101)
  .usage(1, { append: { limit: 3 } })
  .done();

/**
 * @id 12101
 * @name 如水从平
 * @description
 * 造成1点水元素伤害。
 */
export const AsWaterSeeksEquilibrium = skill(12101)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12102
 * @name 泪水啊，我必偿还
 * @description
 * 造成2点水元素伤害，生成源水之滴。
 */
export const OTearsIShallRepay: SkillHandle = skill(12102)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .combatStatus(SourcewaterDroplet)
  .done();

/**
 * @id 12103
 * @name 潮水啊，我已归来
 * @description
 * 造成2点水元素伤害，对所有后台敌人造成1点穿透伤害，生成可用次数为2的源水之滴。
 */
export const OTidesIHaveReturned: SkillHandle = skill(12103)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Hydro, 2)
  .combatStatus(SourcewaterDroplet, "my", {
    overrideVariables: {
      usage: 2
    }
  })
  .done();

/**
 * @id 12105
 * @name 源水之滴
 * @description
 * 
 */
export const SourcewaterDropletSkill = skill(12105)
  .type("passive")
  .on("useSkill", (c, e) => 
    e.isSkillType("normal") &&
    c.$(`my combat status with definition id ${SourcewaterDroplet}`)
  )
  .do((c) => {
    const droplet = c.$(`my combat status with definition id ${SourcewaterDroplet}`);
    droplet?.consumeUsage();
    c.heal(2, "@self");
    if (c.self.isActive()) {
      c.characterStatus(EquitableJudgmentStatus, "@self");
    }
  })
  .done();

/**
 * @id 1210
 * @name 那维莱特
 * @description
 * 凡高大者，无不蔑视。
 */
export const Neuvillette = character(1210)
  .since("v4.5.0")
  .tags("hydro", "catalyst", "fontaine", "ousia")
  .health(11)
  .energy(2)
  .skills(AsWaterSeeksEquilibrium, OTearsIShallRepay, OTidesIHaveReturned, EquitableJudgment, SourcewaterDropletSkill)
  .done();

/**
 * @id 212101
 * @name 古海孑遗的权柄
 * @description
 * 战斗行动：我方出战角色为那维莱特时，装备此牌。
 * 那维莱特装备此牌后，立刻使用一次如水从平。
 * 我方角色引发水元素相关反应后：装备有此牌的那维莱特接下来2次造成的伤害+1。
 * （牌组中包含那维莱特，才能加入牌组）
 */
export const HeirToTheAncientSeasAuthority = card(212101)
  .since("v4.5.0")
  .costHydro(1)
  .costVoid(2)
  .talent(Neuvillette)
  .on("enter")
  .useSkill(AsWaterSeeksEquilibrium)
  .endOn()
  .on("useSkill", (c) => c.hasPhaseReaction("my", (e) => e.relatedTo(DamageType.Hydro)))
  .listenToPlayer()
  .characterStatus(PastDraconicGlories, "@master")
  .done();
