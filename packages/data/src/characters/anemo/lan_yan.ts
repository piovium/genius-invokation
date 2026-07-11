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

import { character, skill, combatStatus, card, DamageType, Aura } from "@gi-tcg/core/builder";
import { EfficientSwitch } from "../../commons.gts";

/**
 * @id 115121
 * @name 凤缕护盾
 * @description
 * 为我方出战角色提供1点护盾。（可叠加，没有上限）
 */
export const SwallowwispShield = combatStatus(115121)
  .since("v5.8.0")
  .shield(1, Infinity)
  .done();

/**
 * @id 15121
 * @name 玄鸾画水
 * @description
 * 造成1点风元素伤害。
 */
export const BlackPheasantStridesOnWater = skill(15121)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 15122
 * @name 凤缕随翦舞
 * @description
 * 生成2层凤缕护盾，获得1层高效切换，并造成1点风元素伤害，如果此技能引发了扩散，则额外生成1层凤缕护盾。
 */
export const SwallowwispPinionDance = skill(15122)
  .type("elemental")
  .costAnemo(3)
  .do((c) => {
    const aura = c.$("opp active")?.aura;
    c.combatStatus(SwallowwispShield, "my", {
      overrideVariables: { shield: 2 }
    });
    c.combatStatus(EfficientSwitch);
    c.damage(DamageType.Anemo, 1);
    switch (aura) {
      case Aura.Cryo:
      case Aura.CryoDendro:
      case Aura.Hydro:
      case Aura.Pyro:
      case Aura.Electro:
        c.combatStatus(SwallowwispShield);
        break;
    }
  })
  .done();

/**
 * @id 15123
 * @name 鹍弦踏月出
 * @description
 * 造成3点风元素伤害，生成2层凤缕护盾。
 */
export const LustrousMoonrise = skill(15123)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 3)
  .combatStatus(SwallowwispShield, "my", {
    overrideVariables: { shield: 2 }
  })
  .done();

/**
 * @id 1512
 * @name 蓝砚
 * @description
 * 巧燕衔枝，欣悦盈门。
 */
export const LanYan = character(1512)
  .since("v5.8.0")
  .tags("anemo", "catalyst", "liyue")
  .health(10)
  .energy(2)
  .skills(BlackPheasantStridesOnWater, SwallowwispPinionDance, LustrousMoonrise)
  .done();

/**
 * @id 215121
 * @name 舞袂翩兮扬玉霓
 * @description
 * 战斗行动：我方出战角色为蓝砚时，装备此牌。
 * 蓝砚装备此牌后，立刻使用一次凤缕随翦舞。
 * 装备有此牌的蓝砚在场，我方角色进行普通攻击时：获得1层凤缕护盾。（每回合1次）
 * （牌组中包含蓝砚，才能加入牌组）
 */
export const DanceVestmentsBillowLikeRainbowJade = card(215121)
  .since("v5.8.0")
  .costAnemo(3)
  .talent(LanYan)
  .on("enter")
  .useSkill(SwallowwispPinionDance)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .listenToPlayer()
  .usagePerRound(1)
  .combatStatus(SwallowwispShield)
  .done();
