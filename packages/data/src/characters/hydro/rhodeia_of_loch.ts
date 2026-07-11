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

import { character, skill, summon, card, DamageType, type SummonHandle } from "@gi-tcg/core/builder";

/**
 * @id 122013
 * @name 纯水幻形·蛙
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点水元素伤害。
 */
export const OceanicMimicFrog = summon(122013)
  .tags("barrier")
  .hint(DamageType.Hydro, "2")
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .on("endPhase", (c) => c.getVariable("usage") <= 0)
  .damage(DamageType.Hydro, 2)
  .dispose()
  .done();

/**
 * @id 122012
 * @name 纯水幻形·飞鸢
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 可用次数：3
 */
export const OceanicMimicRaptor = summon(122012)
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(3)
  .done();

/**
 * @id 122011
 * @name 纯水幻形·花鼠
 * @description
 * 结束阶段：造成2点水元素伤害。
 * 可用次数：2
 */
export const OceanicMimicSquirrel = summon(122011)
  .endPhaseDamage(DamageType.Hydro, 2)
  .usage(2)
  .done();

/**
 * @id 122010
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用1次；耗尽后，在结束阶段造成2点水元素伤害。
 */
export const OceanicMimicRaptorPreview = summon(122010) // 这是纯水幻形·飞鸢的预览版本
  .endPhaseDamage(DamageType.Hydro, 1)
  .usage(3)
  .done();

/**
 * @id 122014
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种，最多同时存在2种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用1次；耗尽后，在结束阶段造成2点水元素伤害。
 */
export const OceanicMimicFrogPreview = summon(122014) // 这是纯水幻形·蛙的预览版本
  .hint(DamageType.Hydro, "2")
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .on("endPhase", (c) => c.getVariable("usage") <= 0)
  .damage(DamageType.Hydro, 2)
  .dispose()
  .done();

/**
 * @id 22011
 * @name 翻涌
 * @description
 * 造成1点水元素伤害。
 */
export const Surge = skill(22011)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Hydro, 1)
  .done();

export const NORMAL_MIMICS = [OceanicMimicSquirrel, OceanicMimicRaptor, OceanicMimicFrog] as number[];

export const PREVIEW_MIMICS = [OceanicMimicSquirrel, OceanicMimicRaptorPreview, OceanicMimicFrogPreview] as number[];

/**
 * @id 22012
 * @name 纯水幻造
 * @description
 * 随机召唤1种纯水幻形。（优先生成不同的类型）
 */
export const OceanidMimicSummoning = skill(22012)
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    const mimics = c.isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
    const exists = c.player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
    let target;
    const rest = mimics.filter((id) => !exists.includes(id));
    if (rest.length > 0) {
      target = c.random(rest);
    } else {
      target = c.random(mimics);
    }
    c.summon(target as SummonHandle);
  })
  .done();

/**
 * @id 22013
 * @name 林野百态
 * @description
 * 随机召唤2种纯水幻形。（优先生成不同的类型）
 */
export const TheMyriadWilds = skill(22013)
  .type("elemental")
  .costHydro(5)
  .do((c) => {
    const mimics = c.isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
    const exists = c.player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
    for (let i = 0; i < 2; i++) {
      let target;
      const rest = mimics.filter((id) => !exists.includes(id));
      if (rest.length > 0) {
        target = c.random(rest);
      } else {
        target = c.random(mimics);
      }
      c.summon(target as SummonHandle);
      exists.push(target);
    }
  })
  .done();

/**
 * @id 22014
 * @name 潮涌与激流
 * @description
 * 造成4点水元素伤害；我方每有1个召唤物，再使此伤害+1。
 */
export const TideAndTorrent = skill(22014)
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .do((c) => {
    const summons = c.$$("my summons");
    const damageValue = 4 + summons.length;
    c.damage(DamageType.Hydro, damageValue);
    if (c.self.hasEquipment(StreamingSurge)) {
      summons.forEach((s) => s.addVariable("usage", 1))
    }
  })
  .done();

/**
 * @id 2201
 * @name 纯水精灵·洛蒂娅
 * @description
 * 「但，只要百川奔流，雨露不休，水就不会消失…」
 */
export const RhodeiaOfLoch = character(2201)
  .since("v3.3.0")
  .tags("hydro", "monster")
  .health(11)
  .energy(3)
  .skills(Surge, OceanidMimicSummoning, TheMyriadWilds, TideAndTorrent)
  .done();

/**
 * @id 222011
 * @name 百川奔流
 * @description
 * 战斗行动：我方出战角色为纯水精灵·洛蒂娅时，装备此牌。
 * 纯水精灵·洛蒂娅装备此牌后，立刻使用一次潮涌与激流。
 * 装备有此牌的纯水精灵·洛蒂娅使用潮涌与激流时：我方所有召唤物可用次数+1。
 * （牌组中包含纯水精灵·洛蒂娅，才能加入牌组）
 */
export const StreamingSurge = card(222011)
  .since("v3.3.0")
  .costHydro(4)
  .costEnergy(3)
  .talent(RhodeiaOfLoch)
  .on("enter")
  .useSkill(TideAndTorrent)
  .done();
