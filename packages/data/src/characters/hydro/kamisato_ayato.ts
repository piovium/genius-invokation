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

import { character, skill, summon, status, card, DamageType, StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 112062
 * @name 清净之园囿
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2
 * 此召唤物在场时：我方角色「普通攻击」造成的伤害+1。
 */
export const GardenOfPurity = summon(112062)
  .endPhaseDamage(DamageType.Hydro, 2)
  .usage(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .done();

/**
 * @id 112061
 * @name 泷廻鉴花
 * @description
 * 所附属角色普通攻击造成的伤害+1，造成的物理伤害变为水元素伤害。
 * 可用次数：3
 */
export const TakimeguriKanka: StatusHandle = status(112061)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(3)
  .increaseDamage(1)
  .do((c) => {
    const talent = c.self.master.hasEquipment(KyoukaFuushi);
    if (talent) {
      talent.setVariable("skillIsUsedWithKanka", 1);
    }
  })
  .done();

/**
 * @id 12061
 * @name 神里流·转
 * @description
 * 造成2点物理伤害。
 */
export const KamisatoArtMarobashi = skill(12061)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12062
 * @name 神里流·镜花
 * @description
 * 造成2点水元素伤害，本角色附属泷廻鉴花。
 */
export const KamisatoArtKyouka = skill(12062)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 2)
  .characterStatus(TakimeguriKanka)
  .done();

/**
 * @id 12063
 * @name 神里流·水囿
 * @description
 * 造成1点水元素伤害，召唤清净之园囿。
 */
export const KamisatoArtSuiyuu = skill(12063)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 1)
  .summon(GardenOfPurity)
  .done();

/**
 * @id 1206
 * @name 神里绫人
 * @description
 * 神守之柏，已焕新材。
 */
export const KamisatoAyato = character(1206)
  .since("v3.6.0")
  .tags("hydro", "sword", "inazuma")
  .health(11)
  .energy(2)
  .skills(KamisatoArtMarobashi, KamisatoArtKyouka, KamisatoArtSuiyuu)
  .done();

/**
 * @id 212062
 * @name 镜华风姿（生效中）
 * @description
 * 本回合中，所附属角色下次「普通攻击」少花费2个无色元素。
 */
export const KyoukaFuushiInEffect = status(212062)
  .oneDuration()
  .once("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .deductVoidCost(2)
  .do((c) => {
    const talent = c.self.master.hasEquipment(KyoukaFuushi);
    if (talent) {
      talent.setVariable("deductEffectHasBeenTriggeredFromThisCard", 1);
    }
  })
  .done();

/**
 * @id 212061
 * @name 镜华风姿
 * @description
 * 战斗行动：我方出战角色为神里绫人时，装备此牌。
 * 神里绫人装备此牌后，立刻使用一次神里流·镜花。
 * 附属有泷廻鉴花的神里绫人「普通攻击」后：所附属角色本回合中下次「普通攻击」少花费2个无色元素。（该次普通攻击不会重复触发此卡牌的效果）
 * （牌组中包含神里绫人，才能加入牌组）
 */
export const KyoukaFuushi = card(212061)
  .since("v3.6.0")
  .costHydro(3)
  .talent(KamisatoAyato)
  .variable("deductEffectHasBeenTriggeredFromThisCard", 0)
  .variable("skillIsUsedWithKanka", 0)
  .on("enter")
  .useSkill(KamisatoArtKyouka)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .do((c) => {
    if (c.getVariable("skillIsUsedWithKanka") && !c.getVariable("deductEffectHasBeenTriggeredFromThisCard")) {
      c.characterStatus(KyoukaFuushiInEffect, "@master");
    }
    c.setVariable("deductEffectHasBeenTriggeredFromThisCard", 0);
    c.setVariable("skillIsUsedWithKanka", 0);
  })
  .done();
