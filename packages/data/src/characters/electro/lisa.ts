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

import { character, skill, summon, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 114092
 * @name 蔷薇雷光
 * @description
 * 结束阶段：造成2点雷元素伤害。
 * 可用次数：2
 */
export const LightningRoseSummon = summon(114092)
  .endPhaseDamage(DamageType.Electro, 2)
  .usage(2)
  .done();

/**
 * @id 114091
 * @name 引雷
 * @description
 * 此状态初始具有2层「引雷」；重复附属时，叠加1层「引雷」。「引雷」最多可以叠加到4层。
 * 结束阶段：叠加1层「引雷」。
 * 所附属角色受到苍雷或蔷薇雷光的伤害时：移除此状态，每层「引雷」使此伤害+1。
 */
export const ConductiveLisa = status(114091)
  .variableCanAppend("conductive", 2, 4, 1)
  .on("endPhase")
  .addVariableWithMax("conductive", 1, 4)
  .on("increaseDamaged", (c, e) =>
    e.via.definition.id === VioletArc || 
    e.source.definition.id === LightningRoseSummon)
  .do((c, e) => {
    e.increaseDamage(c.getVariable("conductive"));
    c.dispose();
  })
  .done();

/**
 * @id 14091
 * @name 指尖雷暴
 * @description
 * 造成1点雷元素伤害，并使敌方出战角色附属引雷。
 */
export const LightningTouch = skill(14091)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Electro, 1)
  .characterStatus(ConductiveLisa, "opp active")
  .done();

/**
 * @id 14092
 * @name 苍雷
 * @description
 * 造成2点雷元素伤害；如果敌方出战角色未附属引雷，则使其附属引雷。
 */
export const VioletArc: SkillHandle = skill(14092)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 2)
  .if((c) => !c.$(`status with definition id ${ConductiveLisa} at opp active`))
  .characterStatus(ConductiveLisa, "opp active")
  .done();

/**
 * @id 14093
 * @name 蔷薇的雷光
 * @description
 * 造成2点雷元素伤害，召唤蔷薇雷光，使敌方出战角色附属引雷。
 */
export const LightningRose = skill(14093)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 2)
  .summon(LightningRoseSummon)
  .characterStatus(ConductiveLisa, "opp active")
  .done();

/**
 * @id 1409
 * @name 丽莎
 * @description
 * 追寻魔导的奥秘，静待真相的机缘。
 */
export const Lisa = character(1409)
  .since("v4.0.0")
  .tags("electro", "catalyst", "mondstadt")
  .health(10)
  .energy(2)
  .skills(LightningTouch, VioletArc, LightningRose)
  .done();

/**
 * @id 214091
 * @name 脉冲的魔女
 * @description
 * 切换到装备有此牌的丽莎后：使敌方出战角色附属引雷。（每回合1次）
 * （牌组中包含丽莎，才能加入牌组）
 */
export const PulsatingWitch = card(214091)
  .since("v4.0.0")
  .costElectro(1)
  .talent(Lisa, "none")
  .on("switchActive", (c, e) => e.switchInfo.to.id === c.self.master.id)
  .usagePerRound(1)
  .characterStatus(ConductiveLisa, "opp active")
  .done();
