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

import { character, skill, status, combatStatus, card, DamageType, StatusHandle, customEvent, $ } from "@gi-tcg/core/builder";

// 蕴种印描述修正：
// 入场时，此牌携带3点可用次数。可用次数耗尽时，弃置此牌。
// 角色受到元素反应伤害后：对所附属角色造成1点穿透伤害，消耗1点可用次数。
//     注：若对方装备有心识蕴藏之种，且摩耶之殿在场，且对方有火元素角色，则改为造成1点草元素伤害。
// 其它我方阵营的蕴种印触发上述效果后：对所附属角色造成1点穿透伤害，消耗1点可用次数。

export const TriggerOtherSeed = customEvent("nahida/triggerOtherSeed");

/**
 * @id 117031
 * @name 蕴种印
 * @description
 * 任意具有「蕴种印」的所在阵营角色受到元素反应伤害后：对所附属角色造成1点穿透伤害。
 * 可用次数：2
 */
export const SeedOfSkandha: StatusHandle = status(117031)
  .usage(2)
  .on("damaged", (c, e) => e.getReaction() !== null)
  .do((c) => {
    if (
      // 由于蕴种印在对方场上，故查找我方信息时使用 opp
      c.query($.opp.typeEquipment.def(TheSeedOfStoredKnowledge)) && // 装备有心识蕴藏之种
      (
        c.query($.opp.combatStatus.def(ShrineOfMaya)) ||
        c.query($.opp.combatStatus.def(ShrineOfMaya01))
      ) &&                                                          // 摩耶之殿在场时
      c.query($.opp.character.includesDefeated.tag("pyro"))         // 我方队伍中存在火元素
    ) {
      c.damage(DamageType.Dendro, 1, "@master")
    } else {
      c.damage(DamageType.Piercing, 1, "@master")
    }
    c.consumeUsage();
    c.emitCustomEvent(TriggerOtherSeed);
  })
  .on(TriggerOtherSeed, (c, e) => e.entity.id !== c.self.id)
  .listenToPlayer()
  .damage(DamageType.Piercing, 1, "@master")
  .consumeUsage()
  // 自身因元素反应伤害击倒而弃置时
  .on("selfDispose", (c, e) => {
    if (e.from.type !== "characters") {
      return;
    }
    const fromChId = e.from.characterId;
    if (c.get(fromChId).variables.alive) {
      return;
    }
    return c.hasPhaseDamage("all", (e) =>
      e.getReaction() !== null && 
      e.damageInfo.causeDefeated && 
      e.damageInfo.target.id === fromChId
    );
  })
  .emitCustomEvent(TriggerOtherSeed)
  .done();

/**
 * @id 117033
 * @name 摩耶之殿
 * @description
 * 我方引发元素反应时：伤害额外+1。
 * 持续回合：3
 */
export const ShrineOfMaya01 = combatStatus(117033)
  .conflictWith(117032)
  .duration(3)
  .on("increaseDamage", (c, e) => e.getReaction())
  .increaseDamage(1)
  .on("enter", (c) => 
    c.$("my characters has equipment with definition id 217031") && // 装备有心识蕴藏之种
    c.$("my characters include defeated with tag (electro)") // 我方队伍中存在雷元素
  )
  .do((c) => {
    // 对方场上蕴种印的可用次数+1
    c.$$("opp status with definition id 117031").forEach((s) => s.addVariable("usage", 1));
  })
  .done();

/**
 * @id 117032
 * @name 摩耶之殿
 * @description
 * 我方引发元素反应时：伤害额外+1。
 * 持续回合：2
 */
export const ShrineOfMaya = combatStatus(117032)
  .conflictWith(117033)
  .duration(2)
  .on("increaseDamage", (c, e) => e.getReaction())
  .increaseDamage(1)
  .on("enter", (c) => 
    c.$("my characters has equipment with definition id 217031") && // 装备有心识蕴藏之种
    c.$("my characters include defeated with tag (electro)") // 我方队伍中存在雷元素
  )
  .do((c) => {
    // 对方场上蕴种印的可用次数+1
    c.$$("opp status with definition id 117031").forEach((s) => s.addVariable("usage", 1));
  })
  .done();

/**
 * @id 17031
 * @name 行相
 * @description
 * 造成1点草元素伤害。
 */
export const Akara = skill(17031)
  .type("normal")
  .costDendro(1)
  .costVoid(2)
  .damage(DamageType.Dendro, 1)
  .done();

/**
 * @id 17032
 * @name 所闻遍计
 * @description
 * 造成2点草元素伤害，目标角色附属蕴种印；如果在附属前目标角色已附属有蕴种印，就改为对所有敌方角色附属蕴种印。
 */
export const AllSchemesToKnow = skill(17032)
  .type("elemental")
  .costDendro(3)
  .if((c) => c.$("opp active")?.hasStatus(SeedOfSkandha))
  .characterStatus(SeedOfSkandha, "all opp characters")
  .else()
  .characterStatus(SeedOfSkandha, "opp active")
  .damage(DamageType.Dendro, 2)
  .done();

/**
 * @id 17033
 * @name 所闻遍计·真如
 * @description
 * 造成3点草元素伤害，所有敌方角色附属蕴种印。
 */
export const AllSchemesToKnowTathata = skill(17033)
  .type("elemental")
  .costDendro(5)
  .characterStatus(SeedOfSkandha, "all opp characters")
  .damage(DamageType.Dendro, 3)
  .done();

/**
 * @id 17034
 * @name 心景幻成
 * @description
 * 造成4点草元素伤害，生成摩耶之殿。
 */
export const IllusoryHeart = skill(17034)
  .type("burst")
  .costDendro(3)
  .costEnergy(2)
  .damage(DamageType.Dendro, 4)
  .do((c) => {
    if (
      c.self.hasEquipment(TheSeedOfStoredKnowledge) && // 装备有心识蕴藏之种
      c.$("my characters include defeated with tag (hydro)") // 我方队伍中存在水元素
    ) {
      c.combatStatus(ShrineOfMaya01);
    } else {
      c.combatStatus(ShrineOfMaya);
    }
  })
  .done();

/**
 * @id 1703
 * @name 纳西妲
 * @description
 * 白草净华，幽宫启蛰。
 */
export const Nahida = character(1703)
  .since("v3.7.0")
  .tags("dendro", "catalyst", "sumeru")
  .health(10)
  .energy(2)
  .skills(Akara, AllSchemesToKnow, AllSchemesToKnowTathata, IllusoryHeart)
  .done();

/**
 * @id 217031
 * @name 心识蕴藏之种
 * @description
 * 战斗行动：我方出战角色为纳西妲时，装备此牌。
 * 纳西妲装备此牌后，立刻使用一次心景幻成。
 * 装备有此牌的纳西妲在场时，根据我方队伍中存在的元素类型提供效果：
 * 火元素：摩耶之殿在场时，自身受到元素反应触发蕴种印的敌方角色，所受蕴种印的穿透伤害改为草元素伤害；
 * 雷元素：摩耶之殿入场时，使当前对方场上蕴种印的可用次数+1；
 * 水元素：装备有此牌的纳西妲所生成的摩耶之殿初始持续回合+1。
 * （牌组中包含纳西妲，才能加入牌组）
 */
export const TheSeedOfStoredKnowledge = card(217031)
  .since("v3.7.0")
  .costDendro(3)
  .costEnergy(2)
  .talent(Nahida)
  .on("enter")
  .useSkill(IllusoryHeart)
  .done();
