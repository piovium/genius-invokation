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

import { character, skill, status, combatStatus, card, DamageType, DiceType } from "@gi-tcg/core/builder";

/**
 * @id 114052
 * @name 奔潮引电
 * @description
 * 本回合内，所附属的角色普通攻击少花费1个无色元素。
 * 可用次数：2
 */
export const SummonerOfLightning = status(114052)
  .oneDuration()
  .on("deductVoidDiceSkill", (c, e) => e.isSkillType("normal"))
  .usage(2)
  .deductVoidCost(1)
  .done();

/**
 * @id 14054
 * @name 踏潮
 * @description
 * （需准备1个行动轮）
 * 造成3点雷元素伤害。
 */
export const Wavestrider = skill(14054)
  .type("elemental")
  .prepared()
  .do((c) => {
    c.$(`status with definition id ${TidecallerSurfEmbrace} at @self`)?.dispose();
    c.damage(DamageType.Electro, 3);
    if (c.self.hasEquipment(LightningStorm)){
      c.characterStatus(SummonerOfLightning, "@self")
    }
  })
  .done();

/**
 * @id 114051
 * @name 捉浪·涛拥之守
 * @description
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
export const TidecallerSurfEmbrace = status(114051)
  .shield(2)
  .done();

/**
 * @id 114055
 * @name 踏潮
 * @description
 * 本角色将在下次行动时，直接使用技能：踏潮。
 */
export const WavestriderStatus = status(114055)
  .prepare(Wavestrider)
  .done();


/**
 * @id 114053
 * @name 雷兽之盾
 * @description
 * 我方角色普通攻击后：造成1点雷元素伤害。
 * 我方角色受到至少为3的伤害时：抵消其中1点伤害。
 * 持续回合：2
 */
export const ThunderbeastsTarge = combatStatus(114053)
  .tags("barrier")
  .duration(2)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .damage(DamageType.Electro, 1)
  .on("decreaseDamaged", (c, e) => e.value >= 3)
  .decreaseDamage(1)
  .done();

/**
 * @id 14051
 * @name 征涛
 * @description
 * 造成2点物理伤害。
 */
export const Oceanborne = skill(14051)
  .type("normal")
  .costElectro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 14052
 * @name 捉浪
 * @description
 * 本角色附属捉浪·涛拥之守并准备技能：踏潮。
 */
export const Tidecaller = skill(14052)
  .type("elemental")
  .costElectro(3)
  .characterStatus(TidecallerSurfEmbrace)
  .characterStatus(WavestriderStatus)
  .done();

/**
 * @id 14053
 * @name 斫雷
 * @description
 * 造成2点雷元素伤害，生成雷兽之盾。
 */
export const Stormbreaker = skill(14053)
  .type("burst")
  .costElectro(3)
  .costEnergy(3)
  .damage(DamageType.Electro, 2)
  .combatStatus(ThunderbeastsTarge)
  .done();

/**
 * @id 1405
 * @name 北斗
 * @description
 * 「记住这一天，你差点赢了南十字船队老大的钱。」
 */
export const Beidou = character(1405)
  .since("v3.4.0")
  .tags("electro", "claymore", "liyue")
  .health(11)
  .energy(3)
  .skills(Oceanborne, Tidecaller, Stormbreaker, Wavestrider)
  .done();

/**
 * @id 214051
 * @name 霹雳连霄
 * @description
 * 战斗行动：我方出战角色为北斗时，装备此牌。
 * 北斗装备此牌后，立刻使用一次捉浪。
 * 装备有此牌的北斗使用踏潮后：使北斗本回合内「普通攻击」少花费1个无色元素。（最多触发2次）
 * （牌组中包含北斗，才能加入牌组）
 */
export const LightningStorm = card(214051)
  .since("v3.4.0")
  .costElectro(3)
  .talent(Beidou)
  .on("enter")
  .useSkill(Tidecaller)
  .done();
