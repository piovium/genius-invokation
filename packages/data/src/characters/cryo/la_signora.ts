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

import { character, skill, status, combatStatus, card, DamageType, type CharacterHandle } from "@gi-tcg/core/builder";
import { BlazingHeat, CrimsonWitchOfEmbers } from "../pyro/crimson_witch_of_embers.ts";

/**
 * @id 121023
 * @name 冰封的炽炎魔女
 * @description
 * 行动阶段开始时：如果所附属角色生命值不多于15，则移除此效果。
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 * 此效果被移除时：所附属角色转换为「焚尽的炽炎魔女」形态。
 */
const IcesealedCrimsonWitchOfEmbers02 = status(121023)
  .reserve();

/**
 * @id 121024
 * @name 冰封的炽炎魔女
 * @description
 * 行动阶段开始时：如果所附属角色生命值不多于25，则移除此效果。
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 * 此效果被移除时：所附属角色转换为「焚尽的炽炎魔女」形态。
 */
const IcesealedCrimsonWitchOfEmbers01 = status(121024)
  .reserve();

/**
 * @id 121021
 * @name 冰封的炽炎魔女
 * @description
 * 行动阶段开始时：如果所附属角色生命值不多于4，则移除此效果。
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到1点生命值。
 * 此效果被移除时：所附属角色转换为「焚尽的炽炎魔女」形态。
 */
export const IcesealedCrimsonWitchOfEmbers = status(121021)
  .on("actionPhase", (c) => c.self.master.health <= 4)
  .dispose()
  .on("beforeDefeated")
  .immune(1)
  .dispose()
  .done();

/**
 * @id 121022
 * @name 严寒
 * @description
 * 结束阶段：对附属角色造成1点冰元素伤害。
 * 可用次数：1
 * 所附属角色被附属炽热时，移除此效果。
 */
export const SheerCold = status(121022)
  .conflictWith(163011)
  .on("endPhase")
  .usage(1)
  .damage(DamageType.Cryo, 1, "@master")
  .done();

/**
 * @id 121025
 * @name 寒炽弥漫
 * @description
 * 结束阶段：如果对方场上的「女士」已转换为「焚尽的炽炎魔女」，则对我方出战角色附属炽热。如果未转换，则对我方出战角色附属严寒，并使对方场上的「女士」失去1点充能。
 */
export const IncandescentFrostPermeating = combatStatus(121025)
  .on("endPhase")
  .do((c) => {
    if (c.$(`opp characters with definition id ${CrimsonWitchOfEmbers}`)) {
      c.characterStatus(BlazingHeat, "my active");
    }
    const laSignora = c.$(`opp characters with definition id ${LaSignora}`);
    if (laSignora) {
      c.characterStatus(SheerCold, "my active");
      laSignora.loseEnergy(1);
    }
  })
  .done();

/**
 * @id 21021
 * @name 霜锋霰舞
 * @description
 * 造成1点冰元素伤害。
 */
export const FrostbladeHailstorm = skill(21021)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .damage(DamageType.Cryo, 1)
  .done();

/**
 * @id 21022
 * @name 凛冽之刺
 * @description
 * 造成2点冰元素伤害，目标角色附属严寒。
 */
export const BitingShards = skill(21022)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 2)
  .characterStatus(SheerCold, "opp active")
  .done();

/**
 * @id 21023
 * @name 红莲冰茧
 * @description
 * 造成4点冰元素伤害，治疗本角色2点。移除冰封的炽炎魔女，本角色永久转换为「焚尽的炽炎魔女」形态。
 */
export const CarmineChrysalis = skill(21023)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 4)
  .heal(2, "@self")
  .dispose(`status with definition id ${IcesealedCrimsonWitchOfEmbers} at @self`)
  .done();

/**
 * @id 21024
 * @name 邪眼之威
 * @description
 * 【被动】战斗开始时，初始附属冰封的炽炎魔女。
 */
export const MightOfDelusion = skill(21024)
  .type("passive")
  .on("battleBegin")
  .characterStatus(IcesealedCrimsonWitchOfEmbers)
  .on("revive") // 女士在转变形态前被击倒，复活后会重新附着复活甲
  .characterStatus(IcesealedCrimsonWitchOfEmbers)
  .done();

/**
 * @id 21025
 * @name 炽炎醒燃
 * @description
 * 
 */
export const InfernosAwakening = skill(21025) // 定义为：当移除冰封的炽炎魔女时，转换角色形态
  .type("passive")
  .on("dispose", (c, e) => e.entity.definition.id === IcesealedCrimsonWitchOfEmbers)
  .transformDefinition("@master", CrimsonWitchOfEmbers)
  .done();

/**
 * @id 2102
 * @name 「女士」
 * @description
 * 瞳仁中倒映着破晓的赤红，她最后展开烈焰之翼向黎明飞去。
 * 「但那并不是曙光，亲爱的罗莎琳。那是焚尽一切的火海。」
 * 但这也没什么所谓。因为她心中明白，自己早已被烈火吞没。
 */
export const LaSignora = character(2102)
  .since("v4.3.0")
  .tags("cryo", "fatui")
  .health(10)
  .energy(2)
  .skills(FrostbladeHailstorm, BitingShards, CarmineChrysalis, MightOfDelusion, InfernosAwakening)
  .done();

/**
 * @id 221021
 * @name 苦痛奉还
 * @description
 * 我方出战角色为「女士」时，才能打出：入场时，生成3个「女士」当前元素类型的元素骰。
 * 角色受到至少为3点的伤害时：抵消1点伤害，然后根据「女士」的形态对敌方出战角色附属严寒或炽热。（每回合1次）
 * （牌组中包含「女士」，才能加入牌组）
 */
export const PainForPain = card(221021)
  .since("v4.3.0")
  .costSame(3)
  .talent([LaSignora, CrimsonWitchOfEmbers], "active")
  .tags("barrier")
  .variable("barrierUsage", 0) // no io hint for now
  .on("enter")
  .do((c) => {
    c.generateDice(c.self.master.element(), 3);
  })
  .on("decreaseDamaged", (c, e) => e.value >= 3)
  .usagePerRound(1)
  .decreaseDamage(1)
  .do((c) => {
    if (c.self.master.definition.id === LaSignora) {
      c.characterStatus(SheerCold, "opp active");
    } else {
      c.characterStatus(BlazingHeat, "opp active");
    }
  })
  .done();
