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

import { character, skill, status, card, DamageType, DiceType, type CharacterHandle, Aura, extension, type, type Pair } from "@gi-tcg/core/builder";

const AbsorbedCountExtension = extension(2602, {
    absorbed: type.declare<Pair<DiceType[]>>().type("pair<number[]>")
  })
  .initialState({
    absorbed: [[], []],
  })
  .description("记录某方若陀龙王已汲取过的元素类型")
  .done();

/**
 * @id 126021
 * @name 磐岩百相·元素汲取
 * @description
 * 角色可以汲取冰/水/火/雷元素的力量，然后根据所汲取的元素类型，获得技能霜刺破袭/洪流重斥/炽焰重斥/霆雷破袭。（角色同时只能汲取一种元素，此状态会记录角色已汲取过的元素类型数量）
 * 角色汲取了一种和当前不同的元素后：生成1个所汲取元素类型的元素骰。
 */
define status {
  id 126021 as StoneFacetsElementalAbsorption;
  associateExtension AbsorbedCountExtension;
  on transformDefinition {
    when :( :e.oldDefinition.id !== :e.newDefinition.id );
    let diceType: DiceType = DiceType.Geo;
    switch (:self.master.definition.id) {
      case AzhdahaCryo: diceType = DiceType.Cryo; break;
      case AzhdahaHydro: diceType = DiceType.Hydro; break;
      case AzhdahaPyro: diceType = DiceType.Pyro; break;
      case AzhdahaElectro: diceType = DiceType.Electro; break;
    };
    :setExtensionState((st) => {
      if (!st.absorbed[:self.who].includes(diceType)) {
        st.absorbed[:self.who].push(diceType);
      }
    });
    :generateDice(diceType, 1);
  }
}

/**
 * @id 126022
 * @name 磐岩百相·元素凝晶
 * @description
 * 角色受到冰/水/火/雷元素伤害后：如果角色当前未汲取该元素的力量，则移除此状态，然后角色汲取对应元素的力量。
 */
define status {
  id 126022 as StoneFacetsElementalCrystallization;
  on damaged {
    let targetDef: CharacterHandle;
    switch (:e.type) {
      case DamageType.Cryo: targetDef = AzhdahaCryo; break;
      case DamageType.Hydro: targetDef = AzhdahaHydro; break;
      case DamageType.Pyro: targetDef = AzhdahaPyro; break;
      case DamageType.Electro: targetDef = AzhdahaElectro; break;
      default: return;
    }
    if (:self.master.definition.id !== targetDef) {
      :transformDefinition("@master", targetDef);
      :dispose();
    }
  }
}

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
define status {
  id 126023 as StoneFacetsElementalSummoning;
  on endPhase {
    switch (:self.master.definition.id) {
      default: :transformDefinition("@master", AzhdahaHydro); break;
      case AzhdahaHydro: :transformDefinition("@master", AzhdahaCryo); break;
      case AzhdahaCryo: :transformDefinition("@master", AzhdahaPyro); break;
      case AzhdahaPyro: :transformDefinition("@master", AzhdahaElectro); break;
    }
  }
}

/**
 * @id 26021
 * @name 碎岩冲撞
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 26021 as SunderingCharge;
  skillType normal;
  cost DiceType.Geo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 26022
 * @name 磅礴之气
 * @description
 * 造成3点岩元素伤害，如果发生了结晶反应，则角色汲取对应元素的力量。
 * 如果本技能中角色未汲取元素的力量，则附属磐岩百相·元素凝晶。
 */
define skill {
  id 26022 as AuraOfMajesty;
  skillType elemental;
  cost DiceType.Geo, 3;
  const targetAura = :$("opp active")?.aura;
  :damage(DamageType.Geo, 3);
  switch (targetAura) {
    case Aura.Cryo: :transformDefinition("@master", AzhdahaCryo); break;
    case Aura.Hydro: :transformDefinition("@master", AzhdahaHydro); break;
    case Aura.Pyro: :transformDefinition("@master", AzhdahaPyro); break;
    case Aura.Electro: :transformDefinition("@master", AzhdahaElectro); break;
    default: :characterStatus(StoneFacetsElementalCrystallization); break;
  }
}

/**
 * @id 26024
 * @name 山崩毁阵
 * @description
 * 造成4点岩元素伤害，每汲取过一种元素此伤害+1。
 */
define skill {
  id 26024 as DecimatingRockfall;
  skillType burst;
  cost DiceType.Geo, 3;
  cost DiceType.Energy, 2;
  associateExtension AbsorbedCountExtension;
  const bonus = :getExtensionState().absorbed[:self.who].length;
  :damage(DamageType.Geo, 4 + bonus);
}

/**
 * @id 26025
 * @name 磐岩百相
 * @description
 * 【被动】战斗开始时，初始附属磐岩百相·元素汲取。
 */
define skill {
  id 26025 as StoneFacets;
  skillType passive {
    on battleBegin {
      :characterStatus(StoneFacetsElementalAbsorption);
    }
    on revive {
      :characterStatus(StoneFacetsElementalAbsorption);
    }
  }
}

/**
 * @id 2602
 * @name 若陀龙王
 * @description
 * 枷锁的隐隐震响与龙祖低沉的怒吼，同记忆一般在山峦间回荡。
 */
define character {
  id 2602 as Azhdaha;
  since "v4.3.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills SunderingCharge, AuraOfMajesty, DecimatingRockfall, StoneFacets;
}

/**
 * @id 66013
 * @name 霜刺破袭
 * @description
 * 造成3点冰元素伤害，此角色附属磐岩百相·元素凝晶。
 */
define skill {
  id 66013 as FrostspikeWave;
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 3);
  :characterStatus(StoneFacetsElementalCrystallization);
}

/**
 * @id 6601
 * @name 若陀龙王
 * @description
 * 
 */
define character {
  id 6601 as AzhdahaCryo;
  since "v4.3.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills SunderingCharge, AuraOfMajesty, FrostspikeWave, DecimatingRockfall, StoneFacets;
}

/**
 * @id 66023
 * @name 洪流重斥
 * @description
 * 造成3点水元素伤害，此角色附属磐岩百相·元素凝晶。
 */
define skill {
  id 66023 as TorrentialRebuke;
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 3);
  :characterStatus(StoneFacetsElementalCrystallization);
}

/**
 * @id 6602
 * @name 若陀龙王
 * @description
 * 
 */
define character {
  id 6602 as AzhdahaHydro;
  since "v4.3.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills SunderingCharge, AuraOfMajesty, TorrentialRebuke, DecimatingRockfall, StoneFacets;
}

/**
 * @id 66033
 * @name 炽焰重斥
 * @description
 * 造成3点火元素伤害，此角色附属磐岩百相·元素凝晶。
 */
define skill {
  id 66033 as BlazingRebuke;
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 3);
  :characterStatus(StoneFacetsElementalCrystallization);
}

/**
 * @id 6603
 * @name 若陀龙王
 * @description
 * 
 */
define character {
  id 6603 as AzhdahaPyro;
  since "v4.3.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills SunderingCharge, AuraOfMajesty, BlazingRebuke, DecimatingRockfall, StoneFacets;
}

/**
 * @id 66043
 * @name 霆雷破袭
 * @description
 * 造成3点雷元素伤害，此角色附属磐岩百相·元素凝晶。
 */
define skill {
  id 66043 as ThunderstormWave;
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
  :characterStatus(StoneFacetsElementalCrystallization);
}

/**
 * @id 6604
 * @name 若陀龙王
 * @description
 * 
 */
define character {
  id 6604 as AzhdahaElectro;
  since "v4.3.0";
  tags geo, monster;
  health 10;
  energy 2;
  skills SunderingCharge, AuraOfMajesty, ThunderstormWave, DecimatingRockfall, StoneFacets;
}

/**
 * @id 226022
 * @name 晦朔千引
 * @description
 * 战斗行动：我方出战角色为若陀龙王时，对该角色打出。使若陀龙王附属磐岩百相·元素凝晶，然后生成每种我方角色所具有的元素类型的元素骰各1个。
 * （牌组中包含若陀龙王，才能加入牌组）
 */
define card {
  id 226022 as LunarCyclesUnending;
  since "v4.3.0";
  cost DiceType.Aligned, 2;
  eventTalent [Azhdaha, AzhdahaCryo, AzhdahaHydro, AzhdahaPyro, AzhdahaElectro];
  :characterStatus(StoneFacetsElementalCrystallization, "@targets.0");
  const elements = new Set(:$$(`my characters include defeated`).map((ch) => ch.element()))
  for (const element of elements) {
    :generateDice(element, 1);
  }
}
