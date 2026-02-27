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
 * @id 115111
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
export const NightsoulsBlessing = status(115111)
  .since("v5.7.0")
  .nightsoulsBlessing(2)
  .done();

/**
 * @id 115112
 * @name 灵枪·仪式杖
 * @description
 * 特技：多重瞄准。
 * 此牌被弃置时，所附属角色结束夜魂加持。
 * （角色最多装备1个「特技」）
 * [1151121: 多重瞄准] (2*Anemo) 消耗1点「夜魂值」，造成1点风元素伤害，然后随机舍弃3张当前元素骰费用最高的手牌。
 * [1151122: ] ()
 */
export const SoulsniperRitualStaff = card(115112)
  .since("v5.7.0")
  .nightsoulTechnique()
  .provideSkill(1151121)
  .costAnemo(2)
  .filter((c) =>
    c.self.master.hasNightsoulsBlessing()?.variables.nightsoul &&
    c.player.hands.length >= 3
  )
  .consumeNightsoul("@master", 1)
  .damage(DamageType.Anemo, 1)
  .disposeMaxCostHands(3, { allowPreview: true })
  .done();

/**
 * @id 115113
 * @name 追影弹
 * @description
 * 加入手牌时：若我方出战角色为火/水/雷/冰，则将此牌转化为对应元素。
 * 打出或弃置此牌时：造成1点风元素伤害，然后将一张追影弹随机放进牌库。
 */
export const ShadowhuntShell = card(115113)
  .since("v5.7.0")
  .unobtainable()
  .costAnemo(3)
  .onHCI((c) => {
    const element = c.$(`my active`)?.element();
    if (element === DiceType.Pyro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellPyro);
    } else if (element === DiceType.Hydro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellHydro);
    } else if (element === DiceType.Electro) {
      c.transformDefinition(c.self, ShiningShadowhuntShellElectro);
    } else if (element === DiceType.Cryo) {
      c.transformDefinition(c.self, ShiningShadowhuntShellCryo);
    }
  })
  .doSameWhenDisposed({
    filter: (c, e) => e.from.type === "hands",
    prependOp: (c) => c.abortPreview(),
  })
  .damage(DamageType.Anemo, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115114
 * @name 焕光追影弹·火
 * @description
 * 打出或弃置此牌时：造成1点火元素伤害，然后将一张追影弹随机放进牌库。
 */
export const ShiningShadowhuntShellPyro = card(115114)
  .since("v5.7.0")
  .unobtainable()
  .costPyro(3)
  .doSameWhenDisposed({
    filter: (c, e) => e.from.type === "hands",
    prependOp: (c) => c.abortPreview(),
  })
  .damage(DamageType.Pyro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115115
 * @name 焕光追影弹·水
 * @description
 * 打出或弃置此牌时：造成1点水元素伤害，然后将一张追影弹随机放进牌库。
 */
export const ShiningShadowhuntShellHydro = card(115115)
  .since("v5.7.0")
  .unobtainable()
  .costHydro(3)
  .doSameWhenDisposed({
    filter: (c, e) => e.from.type === "hands",
    prependOp: (c) => c.abortPreview(),
  })
  .damage(DamageType.Hydro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115116
 * @name 焕光追影弹·雷
 * @description
 * 打出或弃置此牌时：造成1点雷元素伤害，然后将一张追影弹随机放进牌库。
 */
export const ShiningShadowhuntShellElectro = card(115116)
  .since("v5.7.0")
  .unobtainable()
  .costElectro(3)
  .doSameWhenDisposed({
    filter: (c, e) => e.from.type === "hands",
    prependOp: (c) => c.abortPreview(),
  })
  .damage(DamageType.Electro, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115117
 * @name 焕光追影弹·冰
 * @description
 * 打出或弃置此牌时：造成1点冰元素伤害，然后将一张追影弹随机放进牌库。
 */
export const ShiningShadowhuntShellCryo = card(115117)
  .since("v5.7.0")
  .unobtainable()
  .costCryo(3)
  .doSameWhenDisposed({
    filter: (c, e) => e.from.type === "hands",
    prependOp: (c) => c.abortPreview(),
  })
  .damage(DamageType.Cryo, 1, "opp characters with health > 0 limit 1")
  .do((c) => {
    c.createPileCards(ShadowhuntShell, 1, "random");
  })
  .done();

/**
 * @id 115118
 * @name 掩护的心意
 * @description
 * 我方「切换角色」时：抓1张牌。
 * 可用次数：2
 */
export const IntentToCover = combatStatus(115118)
  .since("v5.7.0")
  .on("switchActive")
  .usage(2)
  .drawCards(1)
  .done();

/**
 * @id 15111
 * @name 迷羽流击
 * @description
 * 造成2点物理伤害。
 */
export const PhantomFeatherFlurry = skill(15111)
  .type("normal")
  .costAnemo(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 15112
 * @name 灵缰追影
 * @description
 * 造成1点风元素伤害，抓1张牌。
 * 本角色附属灵枪·仪式杖，进入夜魂加持，并获得2点「夜魂值」。（角色进入夜魂加持后不可使用此技能）（附属灵枪·仪式杖的角色可以使用特技：多重瞄准）
 * 我方接下来2次「切换角色」时：抓1张牌。
 */
export const SpiritReinsShadowHunt = skill(15112)
  .type("elemental")
  .costAnemo(3)
  .filter((c) => !c.self.hasStatus(NightsoulsBlessing))
  .damage(DamageType.Anemo, 1)
  .drawCards(1)
  .gainNightsoul("@self", 2)
  .equip(SoulsniperRitualStaff, "@self")
  .combatStatus(IntentToCover)
  .done();

/**
 * @id 15113
 * @name 索魂命袭
 * @description
 * 造成1点风元素伤害，对敌方所有后台角色造成1点穿透伤害，并抓3张牌。
 */
export const SoulReapersFatalRound = skill(15113)
  .type("burst")
  .costAnemo(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Anemo, 1)
  .drawCards(3)
  .done();

/**
 * @id 15114
 * @name 追影弹
 * @description
 * 对局开始时，将6枚追影弹随机放置进牌库。
 */
export const ShadowhuntShellPassive = skill(15114)
  .type("passive")
  .on("battleBegin")
  .createPileCards(ShadowhuntShell, 6, "random")
  .done();

/**
 * @id 1511
 * @name 恰斯卡
 * @description
 * 风花铿锵，飞羽凌空。
 */
export const Chasca = character(1511)
  .since("v5.7.0")
  .tags("anemo", "bow", "natlan")
  .health(10)
  .energy(2)
  .skills(PhantomFeatherFlurry, SpiritReinsShadowHunt, SoulReapersFatalRound, ShadowhuntShellPassive)
  .associateNightsoul(NightsoulsBlessing)
  .done();

/**
 * @id 215111
 * @name 子弹的戏法
 * @description
 * 快速行动：我方恰斯卡在场时，对该角色打出。将一张追影弹加入手牌。
 * （牌组中包含恰斯卡，才能加入牌组）
 */
export const BulletTrick = card(215111)
  .since("v5.7.0")
  .costAnemo(1)
  .eventTalent(Chasca, "none")
  .createHandCard(ShadowhuntShell)
  .done();
