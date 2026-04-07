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

import { character, skill, status, card, DamageType, Aura, StatusHandle } from "@gi-tcg/core/builder";

/**
 * @id 115132
 * @name 变格
 * @description
 * 如果此状态有2层，则消耗2层此状态，并且本角色下次勠心拳将视为快速行动，并且此次勠心拳·蓄力伤害+1。（可叠加，没有上限）
 */
export const Declension: StatusHandle = status(115132)
  .since("v5.8.0")
  .variableCanAppend("henkaku", 1, Infinity)
  .on("useSkill", (c, e) =>
    e.skill.definition.id === HeartstopperStrike &&
    c.self.getVariable("henkaku") >= 2)
  .do((c) => {
    // 使用 勠心拳 后，我方继续行动一个回合
    if(!c.oppPlayer.declaredEnd) {
      c.continueNextTurn();      
    }
    // 为 角色 添加 增伤数值
    if (c.self.master.hasEquipment(CuriousCasefiles)) {
      c.self.master.setVariable("increaseDmg", 2);
    } else {
      c.self.master.setVariable("increaseDmg", 1);
    }
    // 消耗 2 层变格
    c.addVariable("henkaku", -2);
    if (c.getVariable("henkaku") <= 0){
      c.dispose();
    }
  })
  .done();

/**
 * @id 15135
 * @name 勠心拳·蓄力
 * @description
 * 造成4点风元素伤害。
 */
export const HeartstopperStrikeCharge = skill(15135)
  .type("elemental")
  .prepared()
  .do((c) => {
    // 读取 角色 的 增伤数值，随后清空
    const increaseDmg = c.self.getVariable("increaseDmg") ?? 0;
    c.damage(DamageType.Anemo, 4 + increaseDmg);
    c.self.setVariable("increaseDmg", 0);
  })
  .done();

/**
 * @id 115131
 * @name 在罪之先
 * @description
 * 本角色将在下次行动时，直接使用技能：勠心拳·蓄力。
 */
export const PreexistingGuilt = status(115131)
  .since("v5.8.0")
  .prepare(HeartstopperStrikeCharge)
  .done();

/**
 * @id 115133
 * @name 聚风真眼·冰
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点冰元素伤害。
 * 可用次数：1
 */
export const WindmusterIrisCryo = status(115133)
  .since("v5.8.0")
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Cryo, 1, "@master")
  .done();

/**
 * @id 115134
 * @name 聚风真眼·水
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点水元素伤害。
 * 可用次数：1
 */
export const WindmusterIrisHydro = status(115134)
  .since("v5.8.0")
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Hydro, 1, "@master")
  .done();

/**
 * @id 115135
 * @name 聚风真眼·火
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点火元素伤害。
 * 可用次数：1
 */
export const WindmusterIrisPyro = status(115135)
  .since("v5.8.0")
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Pyro, 1, "@master")
  .done();

/**
 * @id 115136
 * @name 聚风真眼·雷
 * @description
 * 所在阵营选择行动前：对所附属角色造成1点雷元素伤害。
 * 可用次数：1
 */
export const WindmusterIrisElectro = status(115136)
  .since("v5.8.0")
  .on("beforeAction")
  .usage(1)
  .damage(DamageType.Electro, 1, "@master")
  .done();

/**
 * @id 15131
 * @name 不动流格斗术
 * @description
 * 造成1点风元素伤害。
 */
export const FudouStyleMartialArts = skill(15131)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Anemo, 1)
  .done();

/**
 * @id 15132
 * @name 勠心拳
 * @description
 * 准备技能：勠心拳·蓄力
 */
export const HeartstopperStrike = skill(15132)
  .type("elemental")
  .costAnemo(3)
  .characterStatus(PreexistingGuilt)
  .done();

/**
 * @id 15133
 * @name 聚风蹴
 * @description
 * 造成4点风元素伤害，如果此技能引发了风元素相关反应，则敌方出战角色附属对应元素的聚风真眼。
 */
export const WindmusterKick = skill(15133)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .do((c) => {
    const aura = c.$("opp active")?.aura;
    c.damage(DamageType.Anemo, 4);
    switch (aura) {
      case Aura.Cryo:
      case Aura.CryoDendro:
        c.characterStatus(WindmusterIrisCryo, "opp active");
        break;
      case Aura.Hydro:
        c.characterStatus(WindmusterIrisHydro, "opp active");
        break;
      case Aura.Pyro:
        c.characterStatus(WindmusterIrisPyro, "opp active");
        break;
      case Aura.Electro:
        c.characterStatus(WindmusterIrisElectro, "opp active");
        break;
      default:
        break;
    }
  })
  .done();

/**
 * @id 15134
 * @name 反论稽古
 * @description
 * 【被动】我方引发了风元素相关反应后：自身附属1层变格。
 */
export const ParadoxicalPractice = skill(15134)
  .type("passive")
  .variable("increaseDmg", 0)
  .on("dealDamage", (c, e) => e.isReactionRelatedTo(DamageType.Anemo))
  .listenToPlayer()
  .characterStatus(Declension, "@self")
  .done();

/**
 * @id 1513
 * @name 鹿野院平藏
 * @description
 * 天衣但无缝，也惧凉风吹。
 */
export const ShikanoinHeizou = character(1513)
  .since("v5.8.0")
  .tags("anemo", "catalyst", "inazuma")
  .health(10)
  .energy(2)
  .skills(FudouStyleMartialArts, HeartstopperStrike, WindmusterKick, ParadoxicalPractice, HeartstopperStrikeCharge)
  .done();

/**
 * @id 215131
 * @name 奇想天开捕物帐
 * @description
 * 战斗行动：我方出战角色为鹿野院平藏时，装备此牌。
 * 鹿野院平藏装备此牌后，立刻使用一次勠心拳。
 * 变格提高的伤害额外+1。
 * （牌组中包含鹿野院平藏，才能加入牌组）
 */
export const CuriousCasefiles = card(215131)
  .since("v5.8.0")
  .costAnemo(3)
  .talent(ShikanoinHeizou)
  .on("enter")
  .useSkill(HeartstopperStrike)
  .done();
