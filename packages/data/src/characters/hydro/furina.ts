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

import { character, skill, summon, status, combatStatus, card, DamageType, type CharacterHandle, type CardHandle } from "@gi-tcg/core/builder";

/**
 * @id 112113
 * @name 圣俗杂座
 * @description
 * 在「始基力：荒性」和「始基力：芒性」之中，切换芙宁娜的形态。
 * 如果我方场上存在沙龙成员或众水的歌者，也切换其形态。
 */
export const SeatsSacredAndSecular: CardHandle = card(112113)
  .since("v4.7.0")
  .undiscoverable()
  .filter((c) => c.$(`my character with definition id ${FurinaPneuma} or my character with definition id ${FurinaOusia}`))
  .do((c) => {
    const furina = c.$(`my character with definition id ${FurinaPneuma} or my character with definition id ${FurinaOusia}`);
    if (!furina) {
      return;
    }
    if (furina.definition.id === FurinaPneuma) {
      c.transformDefinition(furina, FurinaOusia);
      const summon = c.$(`my summon with definition id ${SalonMembers}`);
      if (summon) {
        c.transformDefinition(summon, SingerOfManyWaters);
        summon.setVariable("hintIcon", DamageType.Heal);
      }
    } else {
      c.transformDefinition(furina, FurinaPneuma);
      const summon = c.$(`my summon with definition id ${SingerOfManyWaters}`);
      if (summon) {
        c.transformDefinition(summon, SalonMembers)
        summon.setVariable("hintIcon", DamageType.Hydro);
      }
    }
  })
  .done();

/**
 * @id 112111
 * @name 沙龙成员
 * @description
 * 结束阶段：造成1点水元素伤害。如果我方存在生命值至少为6的角色，则对一位受伤最少的我方角色造成1点穿透伤害，然后再造成1点水元素伤害。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
export const SalonMembers = summon(112111)
  .endPhaseDamage(DamageType.Hydro, 1)
  .on("endPhase") // 将两段伤害拆成两个技能，从而中间可以插入第一段伤害引发的事件（如缤纷马卡龙）
  .usageCanAppend(2, 4)
  .do((c) => {
    if (c.$(`my character with health >= 6`)) {
      c.damage(DamageType.Piercing, 1, "my characters order by maxHealth - health limit 1");
      c.damage(DamageType.Hydro, 1);
    }
  })
  .done();

/**
 * @id 112112
 * @name 众水的歌者
 * @description
 * 结束阶段：治疗所有我方角色1点。如果我方存在生命值不多于5的角色，则再治疗一位受伤最多的角色1点。
 * 可用次数：2（可叠加，最多叠加到4次）
 */
export const SingerOfManyWaters = summon(112112)
  .endPhaseDamage(DamageType.Heal, 1, "all my characters")
  .usageCanAppend(2, 4)
  .do((c) => {
    if (c.$(`my character with health <= 5`)) {
      c.heal(1, "my characters order by health - maxHealth limit 1");
    }
  })
  .done();

/**
 * @id 112116
 * @name 万众瞩目
 * @description
 * 角色进行普通攻击时：使角色造成的物理伤害变为水元素伤害。如果角色处于「荒」形态，则治疗我方所有后台角色1点；如果角色处于「芒」形态，则此伤害+2，但是对一位受伤最少的我方角色造成1点穿透伤害。
 * 可用次数：1
 */
export const CenterOfAttention = status(112116)
  .on("modifySkillDamageType", (c, e) => e.viaSkillType("normal") && e.type === DamageType.Physical)
  .changeDamageType(DamageType.Hydro)
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .usage(1)
  .do((c, e) => {
    if (c.self.master.definition.id === FurinaPneuma) {
      c.heal(1, "my standby characters");
    } else {
      e.increaseDamage(2);
      c.damage(DamageType.Piercing, 1, "my characters order by maxHealth - health limit 1");
    }
  })
  .done();

/**
 * @id 112115
 * @name 狂欢值
 * @description
 * 我方造成的伤害+1。（包括角色引发的扩散伤害）
 * 可用次数：1（可叠加，没有上限）
 */
export const Revelry = combatStatus(112115)
  .on("increaseDamage")
  .usageCanAppend(1, Infinity)
  .increaseDamage(1)
  .done();

/**
 * @id 112114
 * @name 普世欢腾
 * @description
 * 我方出战角色受到伤害或治疗后：叠加1点狂欢值。
 * 持续回合：2
 */
export const UniversalRevelry = combatStatus(112114)
  .duration(2)
  .on("damagedOrHealed", (c, e) => e.target.isActive())
  .combatStatus(Revelry)
  .done();

/**
 * @id 12111
 * @name 独舞之邀
 * @description
 * 造成2点物理伤害。
 * 每回合1次：如果手牌中没有圣俗杂座，则生成手牌圣俗杂座。
 */
export const SoloistsSolicitation = skill(12111)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12112
 * @name 孤心沙龙
 * @description
 * 芙宁娜当前处于「始基力：荒性」形态：召唤沙龙成员。
 * （芙宁娜处于「始基力：芒性」形态时，会改为召唤众水的歌者）
 */
export const SalonSolitairePneuma = skill(12112)
  .type("elemental")
  .costHydro(3)
  .summon(SalonMembers)
  .done();

/**
 * @id 12113
 * @name 万众狂欢
 * @description
 * 造成2点水元素伤害，生成普世欢腾。
 */
export const LetThePeopleRejoice = skill(12113)
  .type("burst")
  .costHydro(4)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .combatStatus(UniversalRevelry)
  .done();

/**
 * @id 12114
 * @name
 * @description
 *
 */
export const Skill12114 = skill(12114)
  .type("passive")
  .on("useSkill", (c, e) => e.isSkillType("normal") &&
    !c.player.hands.find((card) => card.definition.id === SeatsSacredAndSecular))
  .usagePerRound(1, { name: "usagePerRound1" })
  .createHandCard(SeatsSacredAndSecular)
  .done();

/**
 * @id 12115
 * @name 始基力：圣俗杂座
 * @description
 * 【被动】战斗开始时，生成手牌圣俗杂座。
 */
export const ArkheSeatsSacredAndSecular = skill(12115)
  .type("passive")
  .on("battleBegin")
  .createHandCard(SeatsSacredAndSecular)
  .done();

/**
 * @id 1211
 * @name 芙宁娜
 * @description
 * 永世领唱，无尽圆舞。
 */
export const FurinaPneuma = character(1211)
  .since("v4.7.0")
  .tags("hydro", "sword", "fontaine", "pneuma")
  .health(12)
  .energy(2)
  .skills(SoloistsSolicitation, SalonSolitairePneuma, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular)
  .done();


/**
 * @id 12121
 * @name 独舞之邀
 * @description
 * 造成2点物理伤害。
 * 每回合1次：生成手牌圣俗杂座。
 */
export const SoloistsSolicitationOusia = skill(12121)
  .type("normal")
  .costHydro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 12122
 * @name 孤心沙龙
 * @description
 * 芙宁娜当前处于「始基力：芒性」形态：召唤众水的歌者。
 * （芙宁娜处于「始基力：荒性」形态时，会改为召唤沙龙成员）
 */
export const SalonSolitaireOusia = skill(12122)
  .type("elemental")
  .costHydro(3)
  .summon(SingerOfManyWaters)
  .done();

/**
 * @id 1212
 * @name 芙宁娜
 * @description
 *
 */
export const FurinaOusia = character(1212)
  .since("v4.7.0")
  .tags("hydro", "sword", "fontaine", "ousia")
  .health(12)
  .energy(2)
  .skills(SoloistsSolicitationOusia, SalonSolitaireOusia, LetThePeopleRejoice, Skill12114, ArkheSeatsSacredAndSecular)
  .done();

/**
 * @id 212111
 * @name 「诸君听我颂，共举爱之杯！」
 * @description
 * 战斗行动：我方出战角色为芙宁娜时，装备此牌。
 * 芙宁娜装备此牌后，立刻使用一次孤心沙龙。
 * 装备有此牌的芙宁娜使用孤心沙龙时，会对自身附属万众瞩目。（角色普通攻击时根据形态触发不同效果）
 * （牌组中包含芙宁娜，才能加入牌组）
 */
export const HearMeLetUsRaiseTheChaliceOfLove = card(212111)
  .since("v4.7.0")
  .costHydro(3)
  .talent([FurinaPneuma, FurinaOusia])
  .on("enter")
  .do((c) => {
    if (c.self.master.definition.id === FurinaPneuma) {
      c.useSkill(SalonSolitairePneuma);
    } else {
      c.useSkill(SalonSolitaireOusia);
    }
  })
  .on("useSkill", (c, e) => e.isSkillType("elemental"))
  .characterStatus(CenterOfAttention, "@master")
  .done();
