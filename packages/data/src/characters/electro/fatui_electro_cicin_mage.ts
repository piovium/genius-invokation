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
 * @id 124044
 * @name 雷压
 * @description
 * 每当我方累计打出3张行动牌，就会触发敌方场上雷萤的效果。（使雷萤的可用次数+1）
 */
export const CrushingThunder = combatStatus(124044)
  .variable("playedCard", 0)
  .on("playCard")
  .addVariable("playedCard", 1)
  .on("playCard", (c) => c.getVariable("playedCard") === 3)
  .do((c) => {
    const cicin = c.$(`opp summon with definition id ${ElectroCicin}`);
    if (cicin) {
      cicin.addVariableWithMax("usage", 1, 3);
    }
    c.setVariable("playedCard", 0);
  })
  .done();

/**
 * @id 124041
 * @name 雷萤
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：3
 * 敌方累计打出3张行动牌后：此牌可用次数+1。（最多叠加到3）
 * 愚人众·雷萤术士受到元素反应伤害后：此牌可用次数-1。
 */
export const ElectroCicin = summon(124041)
  .endPhaseDamage(DamageType.Electro, 1)
  .usage(3)
  .on("damaged", (c, e) => e.target.definition.id === FatuiElectroCicinMage && e.getReaction() !== null)
  .consumeUsage()
  .on("enter")
  .combatStatus(CrushingThunder, "opp")
  .on("selfDispose")
  .do((c) => {
    c.$(`opp combat status with definition id ${CrushingThunder}`)?.dispose();
  })
  .on("beforeAction", (c) => c.$(`my equipment with definition id ${ElectroCicinsGleam}`) && c.getVariable("usage") >= 3)
  .damage(DamageType.Electro, 1)
  .consumeUsage()
  .done();

/**
 * @id 24044
 * @name 霆电迸发
 * @description
 * （需准备1个行动轮）
 * 造成2点雷元素伤害。
 */
export const SurgingThunder = skill(24044)
  .type("burst")
  .prepared()
  .damage(DamageType.Electro, 2)
  .done();

/**
 * @id 124043
 * @name 霆电迸发
 * @description
 * 本角色将在下次行动时，直接使用技能：霆电迸发。
 */
export const SurgingThunderStatus = status(124043)
  .prepare(SurgingThunder)
  .done();

/**
 * @id 124042
 * @name 雷萤护罩
 * @description
 * 为我方出战角色提供1点护盾。
 * 创建时：如果我方场上存在雷萤，则额外提供其可用次数的护盾。（最多额外提供3点护盾）
 */
export const ElectroCicinShield = combatStatus(124042)
  .shield(1)
  .on("enter")
  .do((c) => {
    const cicin = c.$(`my summon with definition id ${ElectroCicin}`);
    if (cicin) {
      const usage = cicin.getVariable("usage");
      c.addVariable("shield", Math.min(usage, 3));
    }
  })
  .done();

/**
 * @id 24041
 * @name 轰闪落雷
 * @description
 * 造成1点雷元素伤害。
 */
export const HurtlingBolts = skill(24041)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Electro, 1)
  .done();

/**
 * @id 24042
 * @name 雾虚之召
 * @description
 * 召唤雷萤。
 */
export const MistyCall: SkillHandle = skill(24042)
  .type("elemental")
  .costElectro(3)
  .summon(ElectroCicin)
  .done();

/**
 * @id 24043
 * @name 霆雷之护
 * @description
 * 造成1点雷元素伤害，本角色附着雷元素，生成雷萤护罩并准备技能霆电迸发。
 */
export const ThunderingShield = skill(24043)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .damage(DamageType.Electro, 1)
  .apply(DamageType.Electro, "@self")
  .combatStatus(ElectroCicinShield)
  .characterStatus(SurgingThunderStatus)
  .done();

/**
 * @id 2404
 * @name 愚人众·雷萤术士
 * @description
 * …正如雾虚草的气味会令雷萤迷醉，嗜虐的术士也贪恋着戏弄对手的快感…
 */
export const FatuiElectroCicinMage = character(2404)
  .since("v4.5.0")
  .tags("electro", "fatui")
  .health(10)
  .energy(2)
  .skills(HurtlingBolts, MistyCall, ThunderingShield, SurgingThunder)
  .done();

/**
 * @id 224041
 * @name 雷萤浮闪
 * @description
 * 战斗行动：我方出战角色为愚人众·雷萤术士时，装备此牌。
 * 愚人众·雷萤术士装备此牌后，立刻使用一次雾虚之召。
 * 装备有此牌的愚人众·雷萤术士在场时，我方选择行动前：如果雷萤的可用次数至少为3，则雷萤立刻造成1点雷元素伤害。（需消耗可用次数，每回合1次）
 * （牌组中包含愚人众·雷萤术士，才能加入牌组）
 */
export const ElectroCicinsGleam = card(224041)
  .since("v4.5.0")
  .costElectro(3)
  .talent(FatuiElectroCicinMage)
  .on("enter")
  .useSkill(MistyCall)
  .done();
