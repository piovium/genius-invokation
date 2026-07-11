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

import { character, skill, summon, status, combatStatus, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 114081
 * @name 杀生樱
 * @description
 * 结束阶段：造成1点雷元素伤害；
 * 可用次数：3（可叠加，最多叠加到6次）
 * 我方宣布结束时：如果此牌的可用次数至少为4，则造成1点雷元素伤害。（需消耗可用次数）
 */
export const SesshouSakura = summon(114081)
  .variable("atk", 1)
  .hint(DamageType.Electro, (c, e) => e.variables.atk)
  .on("endPhase")
  .usageCanAppend(3, 6)
  .do((c) => {
    c.damage(DamageType.Electro, c.getVariable("atk"));
  })
  .on("declareEnd", (c) => c.getVariable("usage") >= 4)
  .do((c) => {
    c.damage(DamageType.Electro, c.getVariable("atk"));
  })
  .consumeUsage()
  .done();

/**
 * @id 114082
 * @name 遣役之仪
 * @description
 * 本回合中，所附属角色下次施放野干役咒·杀生樱时少花费2个元素骰。
 */
export const RiteOfDispatch = status(114082)
  .oneDuration()
  .once("deductOmniDiceSkill", (c, e) => e.action.skill.definition.id === YakanEvocationSesshouSakura)
  .deductOmniCost(2)
  .done();

/**
 * @id 114083
 * @name 天狐霆雷
 * @description
 * 我方选择行动前：造成3点雷元素伤害。
 * 可用次数：1
 */
export const TenkoThunderbolts = combatStatus(114083)
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Electro, 3)
  .done();

/**
 * @id 14081
 * @name 狐灵食罪式
 * @description
 * 造成1点雷元素伤害。
 */
export const SpiritfoxSineater = skill(14081)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Electro, 1)
  .done();

/**
 * @id 14082
 * @name 野干役咒·杀生樱
 * @description
 * 召唤杀生樱。如果场上原本已存在杀生樱，则额外使其造成的伤害+1。（最多+1）
 */
export const YakanEvocationSesshouSakura = skill(14082)
  .type("elemental")
  .costElectro(3)
  .do((c) => {
    const sakura = c.$(`my summon with definition id ${SesshouSakura}`);
    if (sakura && sakura.getVariable("atk") === 1) {
      sakura.addVariable("atk", 1);
    }
  })
  .summon(SesshouSakura)
  .done();

/**
 * @id 14083
 * @name 大密法·天狐显真
 * @description
 * 造成4点雷元素伤害；如果我方场上存在杀生樱，则将其消灭，然后生成天狐霆雷。
 */
export const GreatSecretArtTenkoKenshin = skill(14083)
  .type("burst")
  .costElectro(3)
  .costEnergy(2)
  .do((c) => {
    c.damage(DamageType.Electro, 4)
    const sakura = c.$(`my summon with definition id ${SesshouSakura}`);
    if (sakura) {
      sakura.dispose();
      c.combatStatus(TenkoThunderbolts);
      if (c.self.hasEquipment(TheShrinesSacredShade)) {
        c.characterStatus(RiteOfDispatch);
      }
    }
  })
  .done();

/**
 * @id 1408
 * @name 八重神子
 * @description
 * 「兼具智慧与美貌的八重神子大人」
 */
export const YaeMiko = character(1408)
  .since("v3.7.0")
  .tags("electro", "catalyst", "inazuma")
  .health(10)
  .energy(2)
  .skills(SpiritfoxSineater, YakanEvocationSesshouSakura, GreatSecretArtTenkoKenshin)
  .done();

/**
 * @id 214081
 * @name 神篱之御荫
 * @description
 * 战斗行动：我方出战角色为八重神子时，装备此牌。
 * 八重神子装备此牌后，立刻使用一次大密法·天狐显真。
 * 装备有此牌的八重神子通过大密法·天狐显真消灭了杀生樱后：本回合下次使用野干役咒·杀生樱时少花费2个元素骰。
 * （牌组中包含八重神子，才能加入牌组）
 */
export const TheShrinesSacredShade = card(214081)
  .since("v3.7.0")
  .costElectro(3)
  .costEnergy(2)
  .talent(YaeMiko)
  .on("enter")
  .useSkill(GreatSecretArtTenkoKenshin)
  .done();
