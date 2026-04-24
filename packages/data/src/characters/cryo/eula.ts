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

import { character, skill, summon, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此卡牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成4点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
export const LightfallSword = summon(111062)
  .hint(DamageType.Physical, "4+")
  .usage(0, { autoDispose: false })
  .on("useSkill", (c, e) =>
    e.skill.definition.id === FavoniusBladeworkEdel ||
    e.skill.definition.id === IcetideVortex)
  .do((c, e) => {
    if (e.skill.definition.id === IcetideVortex &&
      e.skillCaller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      c.self.addVariable("usage", 3);
    } else {
      c.self.addVariable("usage", 2);
    }
  })
  .on("endPhase")
  .do((c) => {
    c.damage(DamageType.Physical, 4 + c.getVariable("usage"));
    c.dispose();
  })
  .done();

/**
 * @id 111061
 * @name 冷酷之心
 * @description
 * 所附属角色使用冰潮的涡旋时：移除此状态，使本次伤害+3。
 */
export const Grimheart = status(111061)
  .on("increaseSkillDamage", (c, e) => e.damageInfo.via.definition.id === IcetideVortex)
  .increaseDamage(3)
  .dispose()
  .done();

/**
 * @id 11061
 * @name 西风剑术·宗室
 * @description
 * 造成2点物理伤害。
 */
export const FavoniusBladeworkEdel: SkillHandle = skill(11061)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  .noEnergy()
  .damage(DamageType.Physical, 2)
  .if((c) => !c.$(`my summons with definition id ${LightfallSword}`))
  .gainEnergy(1, "@self")
  .done();

/**
 * @id 11062
 * @name 冰潮的涡旋
 * @description
 * 造成2点冰元素伤害，如果本角色未附属冷酷之心，则使其附属冷酷之心。
 */
export const IcetideVortex: SkillHandle = skill(11062)
  .type("elemental")
  .costCryo(3)
  .noEnergy()
  .do((c) => {
    const hasHeart = c.self.hasStatus(Grimheart);
    c.damage(DamageType.Cryo, 2);
    if (!hasHeart) {
      c.characterStatus(Grimheart, "@self");
    }
    if (!c.$(`my summons with definition id ${LightfallSword}`)) {
      c.gainEnergy(1, "@self");
    }
  })
  .done();

/**
 * @id 11063
 * @name 凝浪之光剑
 * @description
 * 造成2点冰元素伤害，召唤光降之剑。
 */
export const GlacialIllumination = skill(11063)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Cryo, 2)
  .summon(LightfallSword)
  .done();

/**
 * @id 1106
 * @name 优菈
 * @description
 * 这只是一场游戏，无论是取胜或落败，你都不会因此被添上罪状。
 */
export const Eula = character(1106)
  .since("v3.5.0")
  .tags("cryo", "claymore", "mondstadt")
  .health(10)
  .energy(2)
  .skills(FavoniusBladeworkEdel, IcetideVortex, GlacialIllumination)
  .done();

/**
 * @id 211061
 * @name 战欲涌现
 * @description
 * 战斗行动：我方出战角色为优菈时，装备此牌。
 * 优菈装备此牌后，立刻使用一次凝浪之光剑。
 * 装备有此牌的优菈使用冰潮的涡旋时：额外为光降之剑累积1点「能量层数」。
 * （牌组中包含优菈，才能加入牌组）
 */
export const WellspringOfWarlust = card(211061)
  .since("v3.5.0")
  .costCryo(3)
  .costEnergy(2)
  .talent(Eula)
  .on("enter")
  .useSkill(GlacialIllumination)
  .done();
