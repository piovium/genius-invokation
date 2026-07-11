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

import { character, skill, summon, status, card, DamageType, Aura } from "@gi-tcg/core/builder";

/**
 * @id 115072
 * @name 不倒貉貉
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方受伤最多的角色2点。
 * 可用次数：2
 */
export const MujimujiDaruma = summon(115072)
  .endPhaseDamage(DamageType.Anemo, 1)
  .usage(2)
  .heal(2, "my characters order by health - maxHealth limit 1")
  .done();

/**
 * @id 15074
 * @name 风风轮舞踢
 * @description
 * （需准备1个行动轮）
 * 造成2点风元素伤害（或被扩散元素的伤害）。
 */
export const FuufuuWhirlwindKick = skill(15074)
  .type("elemental")
  .prepared()
  .do((c) => {
    const caller = c.skillInfo.requestBy!.caller;
    const damageType = c.getVariable("swirled", caller);
    if (damageType) {
      c.damage(damageType, 2);
    } else {
      c.damage(DamageType.Anemo, 2);
    }
  })
  .done();

/**
 * @id 115071
 * @name 风风轮
 * @description
 * 本角色将在下次行动时，直接使用技能：风风轮舞踢。
 */
export const FuufuuWindwheel = status(115071)
  .variable("swirled", 0, { visible: false })
  .prepare(FuufuuWhirlwindKick)
  .done();

/**
 * @id 15071
 * @name 忍刀·终末番
 * @description
 * 造成2点物理伤害。
 */
export const ShuumatsubanNinjaBlade = skill(15071)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15072
 * @name 呜呼流·风隐急进
 * @description
 * 造成1点风元素伤害，本角色准备技能：风风轮舞踢。
 * 如果当前技能引发了扩散，则风风轮舞踢将改为造成被扩散元素的伤害。
 */
export const YoohooArtFuuinDash = skill(15072)
  .type("elemental")
  .costAnemo(3)
  .do((c) => {
    const aura = c.$("opp active")?.aura;
    let fuufuuWindType: DamageType;
    switch (aura) {
      case Aura.Cryo:
      case Aura.CryoDendro:
        fuufuuWindType = DamageType.Cryo;
        break;
      case Aura.Hydro:
        fuufuuWindType = DamageType.Hydro;
        break;
      case Aura.Pyro:
        fuufuuWindType = DamageType.Pyro;
        break;
      case Aura.Electro:
        fuufuuWindType = DamageType.Electro;
        break;
      default:
        fuufuuWindType = DamageType.Anemo;
        break;
    }
    c.characterStatus(FuufuuWindwheel, "@self", {
      overrideVariables: {
        swirled: fuufuuWindType
      }
    });
    c.damage(DamageType.Anemo, 1);
  })
  .done();

/**
 * @id 15073
 * @name 呜呼流·影貉缭乱
 * @description
 * 造成1点风元素伤害，召唤不倒貉貉。
 */
export const YoohooArtMujinaFlurry = skill(15073)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Anemo, 1)
  .summon(MujimujiDaruma)
  .done();

/**
 * @id 1507
 * @name 早柚
 * @description
 * 一梦作伴，万野无踪。
 */
export const Sayu = character(1507)
  .since("v4.4.0")
  .tags("anemo", "claymore", "inazuma")
  .health(10)
  .energy(2)
  .skills(ShuumatsubanNinjaBlade, YoohooArtFuuinDash, YoohooArtMujinaFlurry, FuufuuWhirlwindKick)
  .done();

/**
 * @id 215071
 * @name 偷懒的新方法
 * @description
 * 战斗行动：我方出战角色为早柚时，装备此牌。
 * 早柚装备此牌后，立刻使用一次呜呼流·风隐急进。
 * 装备有此牌的早柚为出战角色期间，我方引发扩散反应时：抓2张牌。（每回合1次）
 * （牌组中包含早柚，才能加入牌组）
 */
export const SkivingNewAndImproved = card(215071)
  .since("v4.4.0")
  .costAnemo(3)
  .talent(Sayu)
  .on("enter")
  .useSkill(YoohooArtFuuinDash)
  .on("dealDamage", (c, e) => c.self.master.isActive() && e.isSwirl())
  .listenToPlayer()
  .usagePerRound(1)
  .drawCards(2)
  .done();
