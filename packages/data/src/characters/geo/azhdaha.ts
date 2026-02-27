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

import { character, skill, status, card, DamageType, DiceType, CharacterHandle, Aura, extension, pair } from "@gi-tcg/core/builder";

const AbsorbedCountExtension = extension(2602, { absorbed: pair(new Set<DiceType>() )})
  .description("记录某方若陀龙王已汲取过的元素类型")
  .done();

/**
 * @id 126021
 * @name 磐岩百相·元素汲取
 * @description
 * 角色可以汲取冰/水/火/雷元素的力量，然后根据所汲取的元素类型，获得技能霜刺破袭/洪流重斥/炽焰重斥/霆雷破袭。（角色同时只能汲取一种元素，此状态会记录角色已汲取过的元素类型数量）
 * 角色汲取了一种和当前不同的元素后：生成1个所汲取元素类型的元素骰。
 */
export const StoneFacetsElementalAbsorption = status(126021)
  .associateExtension(AbsorbedCountExtension)
  .on("transformDefinition", (c, e) => e.oldDefinition.id !== e.newDefinition.id)
  .do((c) => {
    let diceType: DiceType = DiceType.Geo;
    switch (c.self.master.definition.id) {
      case AzhdahaCryo: diceType = DiceType.Cryo; break;
      case AzhdahaHydro: diceType = DiceType.Hydro; break;
      case AzhdahaPyro: diceType = DiceType.Pyro; break;
      case AzhdahaElectro: diceType = DiceType.Electro; break;
    };
    c.setExtensionState((st) => st.absorbed[c.self.who].add(diceType));
    c.generateDice(diceType, 1);
  })
  .done();

/**
 * @id 126022
 * @name 磐岩百相·元素凝晶
 * @description
 * 角色受到冰/水/火/雷元素伤害后：如果角色当前未汲取该元素的力量，则移除此状态，然后角色汲取对应元素的力量。
 */
export const StoneFacetsElementalCrystallization = status(126022)
  .on("damaged")
  .do((c, e) => {
    let targetDef: CharacterHandle;
    switch (e.type) {
      case DamageType.Cryo: targetDef = AzhdahaCryo; break;
      case DamageType.Hydro: targetDef = AzhdahaHydro; break;
      case DamageType.Pyro: targetDef = AzhdahaPyro; break;
      case DamageType.Electro: targetDef = AzhdahaElectro; break;
      default: return;
    }
    if (c.self.master.definition.id !== targetDef) {
      c.transformDefinition("@master", targetDef);
      c.dispose();
    }
  })
  .done();

/**
 * @id 126023
 * @name 磐岩百相·元素征召
 * @description
 * 结束阶段：角色根据当前已汲取的元素类型，汲取一种不同元素的力量。
 * 如果角色未汲取元素或当前已汲取雷元素，则汲取水元素的力量。
 * 如果角色当前已汲取水元素，则汲取冰元素的力量。
 * 如果角色当前已汲取冰元素，则汲取火元素的力量。
 * 如果角色当前已汲取火元素，则汲取雷元素的力量。
 */
export const StoneFacetsElementalSummoning = status(126023)
  .on("endPhase")
  .do((c) => {
    switch (c.self.master.definition.id) {
      default: c.transformDefinition("@master", AzhdahaHydro); break;
      case AzhdahaHydro: c.transformDefinition("@master", AzhdahaCryo); break;
      case AzhdahaCryo: c.transformDefinition("@master", AzhdahaPyro); break;
      case AzhdahaPyro: c.transformDefinition("@master", AzhdahaElectro); break;
    }
  })
  .done();

/**
 * @id 26021
 * @name 碎岩冲撞
 * @description
 * 造成2点物理伤害。
 */
export const SunderingCharge = skill(26021)
  .type("normal")
  .costGeo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 26022
 * @name 磅礴之气
 * @description
 * 造成3点岩元素伤害，如果发生了结晶反应，则角色汲取对应元素的力量。
 * 如果本技能中角色未汲取元素的力量，则附属磐岩百相·元素凝晶。
 */
export const AuraOfMajesty = skill(26022)
  .type("elemental")
  .costGeo(3)
  .do((c) => {
    const targetAura = c.$("opp active")?.aura;
    c.damage(DamageType.Geo, 3);
    switch (targetAura) {
      case Aura.Cryo: c.transformDefinition("@master", AzhdahaCryo); break;
      case Aura.Hydro: c.transformDefinition("@master", AzhdahaHydro); break;
      case Aura.Pyro: c.transformDefinition("@master", AzhdahaPyro); break;
      case Aura.Electro: c.transformDefinition("@master", AzhdahaElectro); break;
      default: c.characterStatus(StoneFacetsElementalCrystallization); break;
    }
  })
  .done();

/**
 * @id 26024
 * @name 山崩毁阵
 * @description
 * 造成4点岩元素伤害，每汲取过一种元素此伤害+1。
 */
export const DecimatingRockfall = skill(26024)
  .type("burst")
  .costGeo(3)
  .costEnergy(2)
  .associateExtension(AbsorbedCountExtension)
  .do((c) => {
    const bonus = c.getExtensionState().absorbed[c.self.who].size;
    c.damage(DamageType.Geo, 4 + bonus);
  })
  .done();

/**
 * @id 26025
 * @name 磐岩百相
 * @description
 * 【被动】战斗开始时，初始附属磐岩百相·元素汲取。
 */
export const StoneFacets = skill(26025)
  .type("passive")
  .on("battleBegin")
  .characterStatus(StoneFacetsElementalAbsorption)
  .on("revive")
  .characterStatus(StoneFacetsElementalAbsorption)
  .done();

/**
 * @id 2602
 * @name 若陀龙王
 * @description
 * 枷锁的隐隐震响与龙祖低沉的怒吼，同记忆一般在山峦间回荡。
 */
export const Azhdaha = character(2602)
  .since("v4.3.0")
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66013
 * @name 霜刺破袭
 * @description
 * 造成3点冰元素伤害，此角色附属磐岩百相·元素凝晶。
 */
export const FrostspikeWave = skill(66013)
  .type("elemental")
  .costCryo(3)
  .damage(DamageType.Cryo, 3)
  .characterStatus(StoneFacetsElementalCrystallization)
  .done();

/**
 * @id 6601
 * @name 若陀龙王
 * @description
 * 
 */
export const AzhdahaCryo = character(6601)
  .since("v4.3.0")
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, FrostspikeWave, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66023
 * @name 洪流重斥
 * @description
 * 造成3点水元素伤害，此角色附属磐岩百相·元素凝晶。
 */
export const TorrentialRebuke = skill(66023)
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 3)
  .characterStatus(StoneFacetsElementalCrystallization)
  .done();

/**
 * @id 6602
 * @name 若陀龙王
 * @description
 * 
 */
export const AzhdahaHydro = character(6602)
  .since("v4.3.0")
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, TorrentialRebuke, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66033
 * @name 炽焰重斥
 * @description
 * 造成3点火元素伤害，此角色附属磐岩百相·元素凝晶。
 */
export const BlazingRebuke = skill(66033)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 3)
  .characterStatus(StoneFacetsElementalCrystallization)
  .done();

/**
 * @id 6603
 * @name 若陀龙王
 * @description
 * 
 */
export const AzhdahaPyro = character(6603)
  .since("v4.3.0")
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, BlazingRebuke, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 66043
 * @name 霆雷破袭
 * @description
 * 造成3点雷元素伤害，此角色附属磐岩百相·元素凝晶。
 */
export const ThunderstormWave = skill(66043)
  .type("elemental")
  .costElectro(3)
  .damage(DamageType.Electro, 3)
  .characterStatus(StoneFacetsElementalCrystallization)
  .done();

/**
 * @id 6604
 * @name 若陀龙王
 * @description
 * 
 */
export const AzhdahaElectro = character(6604)
  .since("v4.3.0")
  .tags("geo", "monster")
  .health(10)
  .energy(2)
  .skills(SunderingCharge, AuraOfMajesty, ThunderstormWave, DecimatingRockfall, StoneFacets)
  .done();

/**
 * @id 226022
 * @name 晦朔千引
 * @description
 * 战斗行动：我方出战角色为若陀龙王时，对该角色打出。使若陀龙王附属磐岩百相·元素凝晶，然后生成每种我方角色所具有的元素类型的元素骰各1个。
 * （牌组中包含若陀龙王，才能加入牌组）
 */
export const LunarCyclesUnending = card(226022)
  .since("v4.3.0")
  .costSame(2)
  .eventTalent([Azhdaha, AzhdahaCryo, AzhdahaHydro, AzhdahaPyro, AzhdahaElectro])
  .characterStatus(StoneFacetsElementalCrystallization, "@targets.0")
  .do((c) => {
    const elements = new Set(c.$$(`my characters include defeated`).map((ch) => ch.element()))
    for (const element of elements) {
      c.generateDice(element, 1);
    }
  })
  .done();
