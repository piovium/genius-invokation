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

import { character, skill, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";
import { BondOfLife } from "../../commons";

/**
 * @id 114121
 * @name 夜巡
 * @description
 * 角色受到狩夜之巡以外的治疗时，改为附属等量的生命之契。
 * 所附属角色使用普通攻击时：造成的物理伤害变为雷元素伤害，并使自身附属2层生命之契。
 * 持续回合：1
 */
export const NightVigil = status(114121)
  .since("v5.3.0")
  .duration(1)
  .on("cancelHealed", (c, e) => e.via.definition.id !== HuntersVigil)
  .do((c, e) => {
    const value = e.expectedValue;
    e.cancel();
    if (value > 0) {
      c.characterStatus(BondOfLife, "@master", {
        overrideVariables: {
          usage: value
        }
      });
    }
  })
  .on("modifySkillDamageType", (c, e) => e.viaSkillType("normal"))
  .if((c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Electro)
  .characterStatus(BondOfLife, "@master", {
    overrideVariables: {
      usage: 2
    }
  })
  .on("deductVoidDiceSkill", (c, e) => e.action.skill.definition.id === OathOfHuntingShadows)
  .deductVoidCost(1)
  .done();

/**
 * @id 114122
 * @name 破夜的明焰（生效中）
 * @description
 * 本回合克洛琳德下次造成的伤害+1。
 * 可用次数：1(可叠加，最多叠加到+3)
 */
export const DarkshatteringFlameInEffect = status(114122)
  .since("v5.3.0")
  .on("increaseSkillDamage")
  .usageCanAppend(1, 3)
  .increaseDamage(1)
  .done();

/**
 * @id 14121
 * @name 逐影之誓
 * @description
 * 造成1点物理伤害。如果本角色附属夜巡，则此技能少花费1个无色元素。
 */
export const OathOfHuntingShadows = skill(14121)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 1)
  .done();

/**
 * @id 14122
 * @name 狩夜之巡
 * @description
 * 自身附属夜巡，移除自身所有生命之契。然后根据所移除的层数，造成雷元素伤害，并治疗自身。（伤害和治疗最多4点）
 */
export const HuntersVigil: SkillHandle = skill(14122)
  .type("elemental")
  .costElectro(2)
  .characterStatus(NightVigil, "@self")
  .do((c) => {
    const st = c.self.hasStatus(BondOfLife);
    let value = 0;
    if (st) {
      value = Math.min(st.variables.usage!, 4);
      c.dispose(st);
    }
    if (value > 0) {
      c.damage(DamageType.Electro, value);
    }
    c.heal(value, "@self");
  })
  .done();

/**
 * @id 14123
 * @name 残光将终
 * @description
 * 造成3点雷元素伤害，自身附属4层生命之契。
 */
export const LastLightfall = skill(14123)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 3)
  .characterStatus(BondOfLife, "@self", {
    overrideVariables: {
      usage: 4
    }
  })
  .done();

/**
 * @id 1412
 * @name 克洛琳德
 * @description
 * 洞灭魔影，持护长夜。
 */
export const Clorinde = character(1412)
  .since("v5.3.0")
  .tags("electro", "sword", "fontaine", "pneuma")
  .health(10)
  .energy(2)
  .skills(OathOfHuntingShadows, HuntersVigil, LastLightfall)
  .done();

/**
 * @id 214121
 * @name 破夜的明焰
 * @description
 * 战斗行动：我方出战角色为克洛琳德时，装备此牌。
 * 克洛琳德装备此牌后，立刻使用一次狩夜之巡。
 * 我方角色引发雷元素相关反应后:本回合克洛琳德下次造成的伤害+1。(可叠加，最多叠加到+3)
 * （牌组中包含克洛琳德，才能加入牌组）
 */
export const DarkshatteringFlame = card(214121)
  .since("v5.3.0")
  .costElectro(2)
  .talent(Clorinde)
  .on("enter")
  .useSkill(HuntersVigil)
  .endOn()
  .on("useSkill", (c) => c.hasPhaseReaction("my", (e) => e.relatedTo(DamageType.Electro)))
  .listenToPlayer()
  .characterStatus(DarkshatteringFlameInEffect, "@master")
  .done();
