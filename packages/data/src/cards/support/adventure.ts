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

import { card, DamageType, DiceType, summon } from "@gi-tcg/core/builder";
import { ChenyuBrew } from "../event/food";
import { AgileSwitch, BattlePlan, EfficientSwitch } from "../../commons";
import { ReforgeTheHolyBlade, WoodenToySword } from "../event/other";

/**
 * @id 321032
 * @name 沉玉谷
 * @description
 * 冒险经历达到2时：生成2张手牌沉玉茶露。
 * 冒险经历达到4时：我方获得3层高效切换和敏捷切换。
 * 冒险经历达到8时：我方全体角色附着水元素，治疗我方受伤最多的角色至最大生命值，并使其获得2点最大生命值，然后弃置此牌。
 */
export const ChenyuVale = card(321032)
  .since("v6.1.0")
  .adventureSpot()
  .on("adventure", (c) => c.getVariable("exp") >= 2)
  .usage(1, { name: "stage1", visible: false })
  .createHandCard(ChenyuBrew)
  .createHandCard(ChenyuBrew)
  .on("adventure", (c) => c.getVariable("exp") >= 4)
  .usage(1, { name: "stage2", visible: false })
  .combatStatus(EfficientSwitch, "my", {
    overrideVariables: {
      usage: 3
    }
  })
  .combatStatus(AgileSwitch, "my", {
    overrideVariables: {
      usage: 3
    }
  })
  .on("adventure", (c) => c.getVariable("exp") >= 8)
  .usage(1, { name: "stage3", visible: false })
  .apply(DamageType.Hydro, "all my characters")
  .do((c) => {
    const targetCh = c.$(`my characters order by health - maxHealth limit 1`);
    if (!targetCh) {
      return;
    }
    const healValue = 999; // interesting.
    c.heal(healValue, targetCh);
    c.increaseMaxHealth(2, targetCh);
    c.finishAdventure();
  })
  .done();

/**
 * @id 321033
 * @name 自体自身之塔
 * @description
 * 入场时：对我方所有角色造成1点穿透伤害。
 * 冒险经历达到偶数次时：生成1个随机基础元素骰。
 * 冒险经历达到5时：生成手牌木质玩具剑。
 * 冒险经历达到12时：生成手牌重铸圣剑，然后弃置此牌。
 */
export const TowerOfIpsissimus = card(321033)
  .since("v6.2.0")
  .tags("adventureSpot")
  .adventureSpot()
  .on("enter", (c, e) => !e.overridden)
  .damage(DamageType.Piercing, 1, "all my characters")
  .on("adventure", (c) => c.getVariable("exp") % 2 === 0)
  .generateDice("randomElement", 1)
  .on("adventure", (c) => c.getVariable("exp") >= 5)
  .usage(1, { name: "stage5", autoDispose: false, visible: false })
  .createHandCard(WoodenToySword)
  .on("adventure", (c) => c.getVariable("exp") >= 12)
  .usage(1, { name: "stage12", autoDispose: false, visible: false })
  .createHandCard(ReforgeTheHolyBlade)
  .finishAdventure()
  .done();

/**
 * @id 301041
 * @name 回天的圣主
 * @description
 * 结束阶段：造成2点穿透伤害。
 * 此卡牌被弃置时，对双方场上生命值最多的角色造成5点穿透伤害。可用次数：3
 */
export const TideTurningSacredLord = summon(301041)
  .hint(DamageType.Physical, "2")
  .on("endPhase")
  .damage(DamageType.Piercing, 2)
  .usage(3)
  .on("selfDispose")
  .damage(DamageType.Piercing, 5, "all characters order by 0 - health limit 1")
  .done();

/**
 * @id 321034
 * @name 天蛇船
 * @description
 * 冒险经历增加时：将1个元素骰转换为万能元素。
 * 冒险经历达到2时：抓1张牌。
 * 冒险经历达到4时：我方出战角色附属2层战斗计划。
 * 冒险经历达到6时：弃置敌方场上1个随机召唤物，召唤回天的圣主，然后弃置此牌。
 */
export const Tonatiuh = card(321034)
  .since("v6.3.0")
  .tags("adventureSpot")
  .adventureSpot()
  .on("adventure")
  .convertDice(DiceType.Omni, 1)
  .on("adventure", (c) => c.getVariable("exp") >= 2)
  .usage(1, { name: "stage1", visible: false })
  .drawCards(1)
  .on("adventure", (c) => c.getVariable("exp") >= 4)
  .usage(1, { name: "stage2", visible: false })
  .characterStatus(BattlePlan, "my active", {
    overrideVariables: { usage: 2 }
  })
  .on("adventure", (c) => c.getVariable("exp") >= 6)
  .usage(1, { name: "stage3", visible: false })
  .do((c) => {
    const summons = c.$$("opp summons");
    if (summons.length > 0) {
      const summon = c.random(summons);
      c.dispose(summon);
    }
    c.summon(TideTurningSacredLord);
    c.finishAdventure();
  })
  .done();

