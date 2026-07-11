// Copyright (C) 2024 Guyutongxue
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

import { character, skill, card, DamageType, combatStatus, type EquipmentHandle } from "@gi-tcg/core/builder";
import { BondOfLife } from "../../commons.gts";

/**
 * @id 113141
 * @name 血偿勒令
 * @description
 * 我方角色受到伤害后：我方受到伤害的角色和敌方阿蕾奇诺均附属2层生命之契。
 * 可用次数：3
 */
export const BlooddebtDirective = combatStatus(113141)
  .since("v5.4.0")
  .on("damaged")
  .usage(3)
  .do((c, e) => {
    if (e.target.variables.alive) {
      c.characterStatus(BondOfLife, e.target, {
        overrideVariables: { usage: 2 }
      });
    }
    c.characterStatus(BondOfLife, `opp characters with definition id ${Arlecchino}`, {
      overrideVariables: { usage: 2 }
    });
  })
  .done();

/**
 * @id 13141
 * @name 斩首之邀
 * @description
 * 造成2点物理伤害，若可能，消耗目标至多3层生命之契，提高等量伤害。
 */
export const InvitationToABeheading = skill(13141)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .do((c) => {
    let increasedValue = 0;
    const bond = c.$(`status with definition id ${BondOfLife} at opp active`);
    if (bond) {
      increasedValue = Math.min(3, bond.getVariable("usage"));
      c.consumeUsage(increasedValue, bond);
    }
    c.damage(DamageType.Physical, 2 + increasedValue);
  })
  .done();

/**
 * @id 13142
 * @name 万相化灰
 * @description
 * 在对方场上生成3层血偿勒令，然后造成2点火元素伤害。
 */
export const AllIsAsh = skill(13142)
  .type("elemental")
  .costPyro(3)
  .combatStatus(BlooddebtDirective, "opp")
  .damage(DamageType.Pyro, 2)
  .done();

/**
 * @id 13143
 * @name 厄月将升
 * @description
 * 造成4点火元素伤害，移除自身所有生命之契，每移除1层，治疗自身1点。
 */
export const BalemoonRising = skill(13143)
  .type("burst")
  .costPyro(3)
  .costEnergy(3)
  .damage(DamageType.Pyro, 4)
  .do((c) => {
    const bond = c.$(`status with definition id ${BondOfLife} at my active`);
    let healValue = 0;
    if (bond) {
      healValue = bond.getVariable("usage");
      bond.dispose();
    }
    c.heal(healValue, "@self");
  })
  .done();

/**
 * @id 13144
 * @name 唯厄月可知晓
 * @description
 * 角色不会受到厄月将升以外的治疗。
 * 自身附属生命之契时：角色造成的物理伤害变为火元素伤害。
 */
export const TheBalemoonAloneMayKnowPassive01 = skill(13144)
  .type("passive")
  .on("cancelHealed", (c, e) => e.via.definition.id !== BalemoonRising)
  .cancel()
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical && c.self.hasStatus(BondOfLife))
  .changeDamageType(DamageType.Pyro)
  .done();

/**
 * @id 13146
 * @name 唯厄月可知晓
 * @description
 * 角色不会受到厄月将升以外的治疗。
 * 自身附属生命之契时：角色造成的物理伤害变为火元素伤害。
 */
export const TheBalemoonAloneMayKnowPassive02 = skill(13146)
  .type("passive")
  .reserve();

/**
 * @id 13147
 * @name 唯厄月可知晓
 * @description
 * 角色不会受到厄月将升以外的治疗。
 * 自身附属生命之契时：角色造成的物理伤害变为火元素伤害。
 */
export const TheBalemoonAloneMayKnowPassive03 = skill(13147)
  .type("passive")
  .on("decreaseDamaged", (c) => c.self.hasEquipment(AllReprisalsAndArrearsMineToBear))
  .do((c, e) => {
    const bond = c.self.hasStatus(BondOfLife);
    if (bond) {
      e.decreaseDamage(1)
      c.consumeUsage(1, bond);
    }
  })
  .done();

/**
 * @id 1314
 * @name 阿蕾奇诺
 * @description
 * 繁星晦暗，厄月孤存。
 */
export const Arlecchino = character(1314)
  .since("v5.4.0")
  .tags("pyro", "pole", "fatui")
  .health(10)
  .energy(3)
  .skills(InvitationToABeheading, AllIsAsh, BalemoonRising, TheBalemoonAloneMayKnowPassive01, TheBalemoonAloneMayKnowPassive03)
  .done();

/**
 * @id 213141
 * @name 所有的仇与债皆由我偿…
 * @description
 * 战斗行动：我方出战角色为阿蕾奇诺时，对该角色打出，使阿蕾奇诺附属3层生命之契。
 * 装备有此牌的阿蕾奇诺受到伤害时：如果阿蕾奇诺附属了生命之契，则消耗1层生命之契，抵消1点伤害。
 * （牌组中包含阿蕾奇诺，才能加入牌组）
 */
export const AllReprisalsAndArrearsMineToBear: EquipmentHandle = card(213141)
  .since("v5.4.0")
  .costPyro(1)
  .talent(Arlecchino, "action")
  .on("enter")
  .characterStatus(BondOfLife, "@master", {
    overrideVariables: { usage: 3 }
  }) // 消耗生命之契增伤的部分在被动技能 13147 里
  .done();
