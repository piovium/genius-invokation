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

import { character, skill, summon, status, card, DamageType, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 112051
 * @name 化海月
 * @description
 * 结束阶段：造成1点水元素伤害，治疗我方出战角色1点。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
export const BakeKurage: SummonHandle = summon(112051)
  .hint(DamageType.Hydro, "1")
  .on("endPhase")
  .usageCanAppend(2, 4)
  .if((c) => c.$(`my equipment with definition id ${TamakushiCasket}`) && c.$(`my status with definition id ${CeremonialGarment}`))
  .damage(DamageType.Hydro, 2)
  .else()
  .damage(DamageType.Hydro, 1)
  .heal(1, "my active")
  .done();

/**
 * @id 112052
 * @name 仪来羽衣
 * @description
 * 所附属角色普通攻击造成的伤害+1。
 * 所附属角色普通攻击后：治疗所有我方角色1点。
 * 持续回合：2
 */
export const CeremonialGarment = status(112052)
  .duration(2)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .heal(1, "all my characters")
  .done();

/**
 * @id 12051
 * @name 水有常形
 * @description
 * 造成1点水元素伤害。
 */
export const TheShapeOfWater = skill(12051)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

/**
 * @id 12052
 * @name 海月之誓
 * @description
 * 本角色附着水元素，召唤化海月。
 */
export const KuragesOath = skill(12052)
  .type("elemental")
  .costHydro(3)
  .apply(DamageType.Hydro, "@self")
  .summon(BakeKurage)
  .done();

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成2点水元素伤害，治疗所有我方角色1点，本角色附属仪来羽衣。
 */
export const NereidsAscension = skill(12053)
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .do((c) => {
    c.damage(DamageType.Hydro, 2);
    c.heal(1, "all my characters");
    c.characterStatus(CeremonialGarment);
    if (c.self.hasEquipment(TamakushiCasket)) {
      let summon = c.$(`my summon with definition id ${BakeKurage}`);
      if (summon) {
        summon.addVariable("usage", 1);
      } else {
        summon = c.createEntity("summon", BakeKurage)!;
        summon.setVariable("usage", 1);
      }
    }
  })
  .done();

/**
 * @id 1205
 * @name 珊瑚宫心海
 * @description
 * 未雨绸缪，临危莫乱。
 */
export const SangonomiyaKokomi = character(1205)
  .since("v3.5.0")
  .tags("hydro", "catalyst", "inazuma")
  .health(12)
  .energy(2)
  .skills(TheShapeOfWater, KuragesOath, NereidsAscension)
  .done();

/**
 * @id 212051
 * @name 匣中玉栉
 * @description
 * 战斗行动：我方出战角色为珊瑚宫心海时，装备此牌。
 * 珊瑚宫心海装备此牌后，立刻使用一次海人化羽。
 * 装备有此牌的珊瑚宫心海使用海人化羽时：召唤一个可用次数为1的化海月；如果化海月已在场，则改为使其可用次数+1。
 * 仪来羽衣存在期间，化海月造成的伤害+1。
 * （牌组中包含珊瑚宫心海，才能加入牌组）
 */
export const TamakushiCasket = card(212051)
  .since("v3.5.0")
  .costHydro(3)
  .costEnergy(2)
  .talent(SangonomiyaKokomi)
  .on("enter")
  .useSkill(NereidsAscension)
  .done();
