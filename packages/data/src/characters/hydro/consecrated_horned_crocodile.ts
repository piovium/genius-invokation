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

import { character, skill, card, DamageType } from "@gi-tcg/core/builder";
import { BonecrunchersEnergyBlock } from "../../cards/event/other";

/**
 * @id 22071
 * @name 尖牙噬咬
 * @description
 * 造成2点物理伤害。
 */
export const FangBite = skill(22071)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 22072
 * @name 鳄齿锐波
 * @description
 * 造成3点水元素伤害，将至多1张原本元素骰费用最高的手牌置入牌组底，生成手牌噬骸能量块。
 */
export const SawtoothedSurge = skill(22072)
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    c.damage(DamageType.Hydro, 3)
    const undrawn = c.maxCostHands(1);
    c.undrawCards(undrawn, "bottom");
    c.createHandCard(BonecrunchersEnergyBlock);
  })
  .done();

/**
 * @id 22073
 * @name 凶鳄狂浪
 * @description
 * 造成4点水元素伤害，舍弃至多3张噬骸能量块，每舍弃1张，治疗我方受伤最多的角色1点，并使其获得1点最大生命值。
 */
export const ReptilianRage = skill(22073)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .do((c) => {
    c.damage(DamageType.Hydro, 4);
    const blocks = c.player.hands.filter((card) => card.definition.id === BonecrunchersEnergyBlock).slice(0, 3);
    c.disposeCard(...blocks);
    const target = c.$(`my characters order by health - maxHealth limit 1`);
    if (target) {
      c.heal(blocks.length, target);
      c.increaseMaxHealth(blocks.length, target);
    }
  })
  .done();

/**
 * @id 22074
 * @name 圣骸感应
 * @description
 * 【被动】我方打出或弃置噬骸能量块后，治疗我方受伤最多的角色1点。
 */
export const ConsecratedSenses = skill(22074)
  .type("passive")
  .on("playCard", (c, e) => e.card.definition.id === BonecrunchersEnergyBlock)
  .heal(1, `my characters order by health - maxHealth limit 1`)
  .on("disposeCard", (c, e) => e.entity.definition.id === BonecrunchersEnergyBlock)
  .heal(1, `my characters order by health - maxHealth limit 1`)
  .done();

/**
 * @id 2207
 * @name 圣骸角鳄
 * @description
 * 因为啃噬伟大的生命体，而扭曲异变的爬行动物，驾驭着多变的水流。
 */
export const ConsecratedHornedCrocodile = character(2207)
  .since("v6.3.0")
  .tags("hydro", "monster", "sacread")
  .health(11)
  .energy(2)
  .skills(FangBite, SawtoothedSurge, ReptilianRage, ConsecratedSenses)
  .done();

/**
 * @id 222071
 * @name 亡水溢流
 * @description
 * 快速行动：装备给我方的圣骸角鳄。
 * 入场时：生成手牌噬骸能量块。
 * 装备有此牌的圣骸角鳄在场时，我方使用噬骸能量块后，治疗我方受伤最多的角色1点。
 * （牌组中包含圣骸角鳄，才能加入牌组）
 */
export const DeathlyOverflow = card(222071)
  .since("v6.3.0")
  .costHydro(1)
  .talent(ConsecratedHornedCrocodile, "none")
  .on("enter")
  .createHandCard(BonecrunchersEnergyBlock)
  .on("playCard", (c, e) => e.card.definition.id === BonecrunchersEnergyBlock)
  .heal(1, `my characters order by health - maxHealth limit 1`)
  .done();
