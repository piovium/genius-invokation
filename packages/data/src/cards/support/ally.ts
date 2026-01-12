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

import { CardHandle, CharacterHandle, DamageType, DiceType, SkillHandle, SupportHandle, card, extension, flip, pair, status, summon } from "@gi-tcg/core/builder";
import { CalledInForCleanup, CanotilasSupport, CosanzeanasSupport, LaumesSupport, LutinesSupport, MelusineSupport, OrigamiFlyingSquirrel, OrigamiHamster, PopupPaperFrog, SerenesSupport, SIMULANKA_SUMMONS, SluasisSupport, TaroumarusSavings, ThironasSupport, TopyassSupport, ToyGuard, VirdasSupport } from "../event/other";

/**
 * @id 322001
 * @name 派蒙
 * @description
 * 行动阶段开始时：生成2点万能元素。
 * 可用次数：2
 */
export const Paimon = card(322001)
  .since("v3.3.0")
  .costSame(3)
  .support("ally")
  .on("actionPhase")
  .usage(2)
  .generateDice(DiceType.Omni, 2)
  .done();

/**
 * @id 322002
 * @name 凯瑟琳
 * @description
 * 我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
export const Katheryne = card(322002)
  .since("v3.3.0")
  .costSame(1)
  .support("ally")
  .on("beforeFastSwitch")
  .usagePerRound(1)
  .setFastAction()
  .done();

/**
 * @id 322003
 * @name 蒂玛乌斯
 * @description
 * 入场时：此牌附带2个「合成材料」。如果我方牌组中初始包含至少6张「圣遗物」，则从牌组中随机抽取1张「圣遗物」牌。
 * 结束阶段：此牌补充1个「合成材料」。
 * 打出「圣遗物」手牌时：如可能，则支付等同于「圣遗物」总费用数量的「合成材料」，以免费装备此「圣遗物」。（每回合1次）
 */
export const Timaeus = card(322003)
  .since("v3.3.0")
  .costSame(2)
  .support("ally")
  .variable("material", 2)
  .on("enter", (c) => c.player.initialPile.filter((c) => c.tags.includes("artifact")).length >= 6)
  .drawCards(1, { withTag: "artifact" })
  .on("endPhase")
  .addVariable("material", 1)
  .on("deductAllDiceCard", (c, e) => e.hasCardTag("artifact") && c.getVariable("material") >= e.diceCostSize())
  .usagePerRound(1)
  .do((c, e) => {
    c.addVariable("material", -e.diceCostSize());
    e.deductAllCost();
  })
  .done();

/**
 * @id 322004
 * @name 瓦格纳
 * @description
 * 入场时：此牌附带2个「锻造原胚」。如果我方牌组中初始包含至少3种不同的「武器」，则从牌组中随机抽取1张「武器」牌。
 * 结束阶段：此牌补充1个「锻造原胚」。
 * 打出「武器」手牌时：如可能，则支付等同于「武器」总费用数量的「锻造原胚」，以免费装备此「武器」。（每回合1次）
 */
export const Wagner = card(322004)
  .since("v3.3.0")
  .costSame(2)
  .support("ally")
  .variable("material", 2)
  .on("enter")
  .do((c) => {
    const weaponDefs = c.player.initialPile
      .filter((c) => c.tags.includes("weapon"))
      .map((c) => c.id);
    const weaponKinds = new Set(weaponDefs).size;
    if (weaponKinds >= 3) {
      c.drawCards(1, { withTag: "weapon" });
    }
  })
  .on("endPhase")
  .addVariable("material", 1)
  .on("deductAllDiceCard", (c, e) => e.hasCardTag("weapon") && c.getVariable("material") >= e.diceCostSize())
  .usagePerRound(1)
  .do((c, e) => {
    c.addVariable("material", -e.diceCostSize());
    e.deductAllCost();
  })
  .done();

/**
 * @id 322005
 * @name 卯师傅
 * @description
 * 打出「料理」事件牌后：生成1个随机基础元素骰。（每回合1次）
 * 打出「料理」事件牌后：从牌组中随机抽取1张「料理」事件牌。（整场牌局限制1次）
 */
export const ChefMao = card(322005)
  .since("v3.3.0")
  .costSame(1)
  .support("ally")
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(1)
  .generateDice("randomElement", 1)
  .on("playCard", (c, e) => e.hasCardTag("food"))
  .usage(1, { autoDispose: false, visible: false })
  .drawCards(1, { withTag: "food" })
  .done();

/**
 * @id 322006
 * @name 阿圆
 * @description
 * 打出「场地」支援牌时：少花费2个元素骰。（每回合1次）
 */
export const Tubby = card(322006)
  .since("v3.3.0")
  .costSame(2)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("place"))
  .usagePerRound(1)
  .deductOmniCost(2)
  .done();

/**
 * @id 322007
 * @name 提米
 * @description
 * 每回合自动触发1次：此牌累积1只「鸽子」。如果此牌已累积3只「鸽子」，则弃置此牌，抓1张牌，并生成1点万能元素。
 */
export const Timmie = card(322007)
  .since("v3.3.0")
  .support("ally")
  .variable("pigeon", 1)
  .on("actionPhase")
  .do((c) => {
    c.addVariable("pigeon", 1);
    if (c.getVariable("pigeon") === 3) {
      c.drawCards(1);
      c.generateDice(DiceType.Omni, 1);
      c.dispose();
    }
  })
  .done();

/**
 * @id 322008
 * @name 立本
 * @description
 * 结束阶段：收集我方未使用的元素骰（每种最多1个）。
 * 行动阶段开始时：如果此牌已收集3个元素骰，则抓2张牌，生成2点万能元素，然后弃置此牌。
 */
export const Liben = card(322008)
  .since("v3.3.0")
  .support("ally")
  .variable("collected", 0)
  .on("endPhase")
  .do((c) => {
    const absorbed = c.absorbDice("diff", 3 - c.getVariable("collected"));
    c.addVariable("collected", absorbed.length);
  })
  .on("actionPhase")
  .do((c) => {
    if (c.getVariable("collected") >= 3) {
      c.drawCards(2);
      c.generateDice(DiceType.Omni, 2);
      c.dispose();
    }
  })
  .done();

/**
 * @id 322009
 * @name 常九爷
 * @description
 * 双方角色使用技能后：如果造成了物理伤害、穿透伤害或引发了元素反应，此牌累积1个「灵感」。如果此牌已累积3个「灵感」，则弃置此牌并抓2张牌。
 */
export const ChangTheNinth = card(322009)
  .since("v3.3.0")
  .support("ally")
  .variable("triggered", 0) // 穿透或物理技能触发后，不再因元素反应触发
  .variable("inspiration", 0)
  .defineSnippet((c) => {
    c.addVariable("inspiration", 1);
    if (c.getVariable("inspiration") >= 3) {
      c.drawCards(2);
      c.dispose();
    }
  })
  .onDelayedSkillDamage(
    (c, e) => e.type === DamageType.Piercing || e.type === DamageType.Physical,
  )
  .listenToAll()
  .callSnippet()
  .setVariable("triggered", 1)
  .endOn()
  .onDelayedSkillReaction((c, e) => !c.getVariable("triggered"))
  .listenToAll()
  .callSnippet()
  .on("useSkill") // reset triggered
  .listenToAll()
  .setVariable("triggered", 0)
  .done();

/**
 * @id 322010
 * @name 艾琳
 * @description
 * 我方角色使用本回合使用过的技能时：少花费1个元素骰。（每回合1次）
 */
export const Ellin = card(322010)
  .since("v3.3.0")
  .costSame(2)
  .support("ally")
  .on("deductOmniDiceSkill", (c, e) => {
    return (
      c.countOfSkill(
        e.action.skill.caller.definition.id as CharacterHandle,
        e.action.skill.definition.id as SkillHandle,
      ) > 0
    );
  })
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 322011
 * @name 田铁嘴
 * @description
 * 结束阶段：我方一名充能未满的角色获得1点充能。（出战角色优先）
 * 可用次数：2
 */
export const IronTongueTian = card(322011)
  .since("v3.3.0")
  .costVoid(2)
  .support("ally")
  .on("endPhase")
  .usage(2)
  .gainEnergy(1, "my characters with energy < maxEnergy limit 1")
  .done();

/**
 * @id 322012
 * @name 刘苏
 * @description
 * 我方切换到一个没有充能的角色后：使我方出战角色获得1点充能。（每回合1次）
 * 可用次数：2
 */
export const LiuSu = card(322012)
  .since("v3.3.0")
  .costSame(1)
  .support("ally")
  .on("switchActive", (c, e) => e.switchInfo.to.energy === 0)
  .usage(2)
  .usagePerRound(1)
  .gainEnergy(1, "my active")
  .done();

/**
 * @id 322013
 * @name 花散里
 * @description
 * 召唤物消失时：此牌累积1点「大祓」进度。（最多累积3点）
 * 我方打出「武器」或「圣遗物」装备时：如果「大祓」进度已达到3，则弃置此牌，使打出的卡牌少花费2个元素骰。
 */
export const Hanachirusato = card(322013)
  .since("v3.7.0")
  .support("ally")
  .variable("progress", 0)
  .on("dispose", (c, e) => e.entity.definition.type === "summon")
  .listenToAll()
  .addVariableWithMax("progress", 1, 3)
  .on("deductOmniDiceCard", (c, e) => e.hasOneOfCardTag("weapon", "artifact") && c.getVariable("progress") >= 3)
  .deductOmniCost(2)
  .dispose()
  .done();

/**
 * @id 322014
 * @name 鲸井小弟
 * @description
 * 行动阶段开始时：生成1点万能元素。然后，如果对方的支援区未满，则将此牌转移到对方的支援区。
 */
export const KidKujirai = card(322014)
  .since("v3.7.0")
  .support("ally")
  .on("actionPhase")
  .do((c) => {
    c.generateDice(DiceType.Omni, 1);
    if (c.remainingSupportCount("opp") > 0) {
      c.transferEntity(c.self, {
        type: "supports",
        who: flip(c.self.who),
      });
    }
  })
  .done();

/**
 * @id 322015
 * @name 旭东
 * @description
 * 打出「料理」事件牌时：少花费2个元素骰。（每回合1次）
 */
export const Xudong = card(322015)
  .since("v3.7.0")
  .costVoid(2)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("food"))
  .usagePerRound(1)
  .deductOmniCost(2)
  .done();

/**
 * @id 322016
 * @name 迪娜泽黛
 * @description
 * 打出「伙伴」支援牌时：少花费1个元素骰。（每回合1次）
 * 打出「伙伴」支援牌后：从牌组中随机抽取1张「伙伴」支援牌。（整场牌局限制1次）
 */
export const Dunyarzad = card(322016)
  .since("v3.7.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("ally"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .on("playCard", (c, e) => e.card.id !== c.self.id && e.hasCardTag("ally"))
  .usage(1, { autoDispose: false, visible: false })
  .drawCards(1, { withTag: "ally" })
  .done();

/**
 * @id 322017
 * @name 拉娜
 * @description
 * 我方角色使用「元素战技」后：生成1个我方下一个后台角色类型的元素骰。（每回合1次）
 */
export const Rana = card(322017)
  .since("v3.7.0")
  .costSame(2)
  .support("ally")
  .on("useSkill", (c, e) => e.isSkillType("elemental") && c.$("my next"))
  .usagePerRound(1)
  .do((c) => {
    const next = c.$("my next")!;
    c.generateDice(next.element(), 1);
  })
  .done();

/**
 * @id 322018
 * @name 老章
 * @description
 * 我方打出「武器」手牌时：少花费1个元素骰；我方场上每有1个已装备「武器」的角色，就额外少花费1个元素骰。（每回合1次）
 */
export const MasterZhang = card(322018)
  .since("v3.8.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("weapon"))
  .usagePerRound(1)
  .do((c, e) => {
    const weaponedCh = c.$$(
      "my characters has equipment with tag (weapon)",
    ).length;
    e.deductOmniCost(1 + weaponedCh);
  })
  .done();

/**
 * @id 322019
 * @name 塞塔蕾
 * @description
 * 双方执行任意行动后，我方手牌数量为0时：抓1张牌。
 * 可用次数：3
 */
export const Setaria = card(322019)
  .since("v4.0.0")
  .costSame(1)
  .support("ally")
  .on("action", (c) => c.player.hands.length === 0)
  .listenToAll()
  .usage(3)
  .drawCards(1)
  .done();

/**
 * @id 322020
 * @name 弥生七月
 * @description
 * 我方打出「圣遗物」手牌时：少花费1个元素骰；如果我方场上已有2个已装备「圣遗物」的角色，就额外少花费1个元素骰。（每回合1次）
 */
export const YayoiNanatsuki = card(322020)
  .since("v4.1.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("artifact"))
  .usagePerRound(1)
  .do((c, e) => {
    const artifactedCh = c.$$(
      "my characters has equipment with tag (artifact)",
    );
    if (artifactedCh.length >= 2) {
      e.deductOmniCost(2);
    } else {
      e.deductOmniCost(1);
    }
  })
  .done();

/**
 * @id 322021
 * @name 玛梅赫
 * @description
 * 我方打出「玛梅赫」以外的「料理」/「场地」/「伙伴」/「道具」行动牌后：随机生成1张「玛梅赫」以外的「料理」/「场地」/「伙伴」/「道具」行动牌，将其加入手牌。（每回合1次）
 * 可用次数：3
 */
export const Mamere: SupportHandle = card(322021)
  .since("v4.3.0")
  .support("ally")
  .on("playCard", (c, e) => e.card.definition.id !== Mamere && e.hasOneOfCardTag("food", "place", "ally", "item"))
  .usage(3)
  .usagePerRound(1)
  .do((c) => {
    const tags = ["food", "place", "ally", "item"] as const;
    const candidates = c.allCardDefinitions(
      (c) => c.id !== Mamere && tags.some((tag) => c.tags.includes(tag)),
    );
    const card = c.random(candidates);
    c.createHandCard(card.id as CardHandle);
  })
  .done();

/**
 * @id 302205
 * @name 沙与梦
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费3个元素骰。
 * 可用次数：1
 */
export const SandsAndDream = status(302205)
  .on("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master))
  .usage(1)
  .deductOmniCost(3)
  .done();

export const DisposedSupportCountExtension = extension(322022, {
  disposedSupportCount: pair(0),
})
  .description("记录本场对局中双方支援区弃置卡牌的数量")
  .mutateWhen("onDispose", (st, e) => {
    if (e.entity.definition.type === "support") {
      st.disposedSupportCount[e.who]++;
    }
  })
  .done();

/**
 * @id 322022
 * @name 婕德
 * @description
 * 此牌会记录本场对局中我方支援区弃置卡牌的数量，称为「阅历」。（最多6点）
 * 我方角色使用「元素爆发」后：如果「阅历」至少为6，则弃置此牌，对我方出战角色附属沙与梦。
 * 【此卡含描述变量】
 */
export const Jeht = card(322022)
  .since("v4.4.0")
  .costSame(1)
  .associateExtension(DisposedSupportCountExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.disposedSupportCount[area.who])
  .support("ally")
  .associateExtension(DisposedSupportCountExtension)
  .variable("experience", 0)
  .on("enter")
  .do((c) => {
    c.setVariable("experience", Math.min(c.getExtensionState().disposedSupportCount[c.self.who], 6));
  })
  .on("dispose", (c, e) => e.entity.definition.type === "support")
  .do((c) => {
    c.setVariable("experience", Math.min(c.getExtensionState().disposedSupportCount[c.self.who], 6));
  })
  .on("useSkill", (c, e) =>
    e.isSkillType("burst") &&
    !e.skillCaller.cast<"character">().hasStatus(SandsAndDream) && // 多个婕德不重复触发
    c.getVariable("experience") >= 6,
  )
  .characterStatus(SandsAndDream, "my active")
  .dispose()
  .done();

const DamageTypeCountExtension = extension(322023, {
  damages: pair(new Set<DamageType>()),
})
  .description("记录本场对局中双方角色受到过的元素伤害种类")
  .mutateWhen("onDamageOrHeal", (st, e) => {
    if (e.isDamageTypeDamage() &&  e.type !== DamageType.Physical && e.type !== DamageType.Piercing) {
      st.damages[e.targetWho].add(e.type);
    }
  })
  .done();

/**
 * @id 322023
 * @name 西尔弗和迈勒斯
 * @description
 * 此牌会记录本场对局中敌方角色受到过的元素伤害种类数，称为「侍从的周到」。（最多4点）
 * 结束阶段：如果「侍从的周到」至少为3，则弃置此牌，然后抓「侍从的周到」点数的牌。
 * 【此卡含描述变量】
 */
export const SilverAndMelus = card(322023)
  .since("v4.4.0")
  .costSame(1)
  .associateExtension(DamageTypeCountExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.damages[flip(area.who)].size)
  .support("ally")
  .associateExtension(DamageTypeCountExtension)
  .variable("count", 0)
  .on("enter")
  .do((c) => {
    const count = c.getExtensionState().damages[flip(c.self.who)].size;
    c.setVariable("count", Math.min(count, 4));
  })
  .on("damaged", (c, e) => !e.target.isMine())
  .listenToAll()
  .do((c) => {
    const count = c.getExtensionState().damages[flip(c.self.who)].size;
    c.setVariable("count", Math.min(count, 4));
  })
  .on("endPhase")
  .do((c) => {
    const count = c.getVariable("count");
    if (count >= 3) {
      c.drawCards(count);
      c.dispose();
    }
  })
  .done();

/**
 * @id 302201
 * @name 愤怒的太郎丸
 * @description
 * 结束阶段：造成2点物理伤害。
 * 可用次数：2
 */
export const TaromaruEnraged = summon(302201)
  .endPhaseDamage(DamageType.Physical, 2)
  .usage(2)
  .done();

/**
 * @id 322024
 * @name 太郎丸
 * @description
 * 入场时：生成4张太郎丸的存款，均匀地置入我方牌库中。
 * 我方打出2张太郎丸的存款后：弃置此牌，召唤愤怒的太郎丸。
 */
export const Taroumaru = card(322024)
  .since("v4.6.0")
  .costVoid(2)
  .support("ally")
  .variable("count", 0)
  .on("enter")
  .createPileCards(TaroumarusSavings, 4, "spaceAround")
  .on("playCard", (c, e) => e.card.definition.id === TaroumarusSavings)
  .do((c) => {
    c.addVariable("count", 1);
    if (c.getVariable("count") >= 2) {
      c.summon(TaromaruEnraged);
      c.dispose();
    }
  })
  .done();

/**
 * @id 322025
 * @name 白手套和渔夫
 * @description
 * 结束阶段：生成1张「清洁工作」，随机将其置入我方牌库顶部5张牌之中。如果此牌的可用次数仅剩余1，则抓1张牌。
 * 可用次数：2
 */
export const TheWhiteGloveAndTheFisherman = card(322025)
  .since("v4.6.0")
  .support("ally")
  .on("endPhase")
  .usage(2)
  .createPileCards(CalledInForCleanup, 1, `topRange5`)
  .if((c) => c.getVariable("usage") === 1)
  .drawCards(1)
  .done();

/**
 * @id 322026
 * @name 亚瑟先生
 * @description
 * 我方舍弃或调和1张牌后：此牌累积1点「新闻线索」。（最多累积到2点）
 * 结束阶段：如果此牌已累积2点「新闻线索」，则扣除2点，复制对方牌库顶的1张牌加入我方手牌。
 */
export const SirArthur = card(322026)
  .since("v4.7.0")
  .support("ally")
  .variable("clue", 0)
  .on("disposeOrTuneCard")
  .addVariableWithMax("clue", 1, 2)
  .on("endPhase", (c) => c.getVariable("clue") >= 2)
  .do((c) => {
    c.addVariable("clue", -2);
    const top = c.oppPlayer.pile[0];
    if (top) {
      c.createHandCard(top.definition.id as CardHandle);
    }
  })
  .done();

const PUCAS_ALLIES = () => [
  Paimon,
  Katheryne,
  ChefMao,
  Tubby,
  Liben,
  ChangTheNinth,
  Ellin,
  IronTongueTian,
  LiuSu,
  Hanachirusato,
  KidKujirai,
  Xudong,
  Rana,
  MasterZhang,
  Setaria,
  YayoiNanatsuki,
  Mamere,
  SilverAndMelus,
  TheWhiteGloveAndTheFisherman,
  SirArthur,
];

/**
 * @id 302213
 * @name 芙佳的声援
 * @description
 * 随机生成「伙伴」到场上，直到填满双方支援区。
 */
export const PucasSupport = card(302213)
  .since("v4.8.0")
  .do((c) => {
    const myCount = c.remainingSupportCount("my");
    const myAllies = c.randomSubset(PUCAS_ALLIES(), myCount);
    for (const def of myAllies) {
      c.createEntity("support", def, {
        type: "supports",
        who: c.self.who
      });
    }
    const oppCount = c.remainingSupportCount("opp");
    const oppAllies = c.randomSubset(PUCAS_ALLIES(), oppCount);
    for (const def of oppAllies) {
      c.createEntity("support", def, {
        type: "supports",
        who: flip(c.self.who)
      });
    }
  })
  .done();

const SERENE_SUPPORTS = [
  SerenesSupport,
  LaumesSupport,
  CosanzeanasSupport,
  CanotilasSupport,
  ThironasSupport,
  SluasisSupport,
  VirdasSupport,
  PucasSupport,
  TopyassSupport,
  LutinesSupport,
];

/**
 * @id 322027
 * @name 瑟琳
 * @description
 * 每回合自动触发1次：将1张随机的「美露莘的声援」放入我方手牌。
 * 可用次数：3
 */
export const Serene = card(322027)
  .since("v4.8.0")
  .costVoid(2)
  .support("ally")
  .on("enter")
  .do((c) => {
    const card = c.random(SERENE_SUPPORTS);
    c.createHandCard(card);
  })
  .on("actionPhase")
  .usage(2)
  .do((c) => {
    const card = c.random(SERENE_SUPPORTS);
    c.createHandCard(card);
  })
  .done();

/**
 * @id 322028
 * @name 阿伽娅
 * @description
 * 我方使用「特技」时：少花费1个元素骰。（每回合1次）
 */
export const Atea = card(322028)
  .since("v5.0.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceTechnique")
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 322029
 * @name 森林的祝福
 * @description
 * 入场时及我方触发元素反应后：从折纸飞鼠、跳跳纸蛙、折纸胖胖鼠中随机生成1张加入手牌。
 */
export const ForestBlessing = card(322029)
  .since("v5.8.0")
  .costVoid(2)
  .support("ally")
  .defineSnippet((c, e) => {
    const newCard = c.random([OrigamiFlyingSquirrel, PopupPaperFrog, OrigamiHamster]);
    c.createHandCard(newCard);
  })
  .on("enter")
  .callSnippet()
  .on("reaction", (c, e) => e.caller.isMine())
  .listenToAll()
  .callSnippet()
  .done();

/**
 * @id 322030
 * @name 预言女神的礼物
 * @description
 * 入场时：生成2张手牌积木小人，并生成2张积木小人，随机置入我方牌组中。
 * 我方打出「希穆兰卡」召唤物后，使其效果量+1。
 * 可用次数：2
 */
export const GiftOfTheGoddessOfProphecy = card(322030)
  .since("v5.8.0")
  .costVoid(2)
  .support("ally")
  .on("enter")
  .createHandCard(ToyGuard)
  .createHandCard(ToyGuard)
  .createPileCards(ToyGuard, 2, "random")
  .on("enterRelative", (c, e) =>
    e.entity.definition.type === "summon" &&
    (SIMULANKA_SUMMONS as number[]).includes(e.entity.definition.id))
  .usage(2)
  .do((c, e) => {
    e.entity.cast<"summon">().addVariable("effect", 1);
  })
  .done();

/**
 * @id 322031
 * @name 西摩尔
 * @description
 * 入场时：复制对方牌组顶的1张牌加入我方手牌。
 * 我方打出名称不存在于本局最初牌组的牌时：冒险1次。（每回合1次，最多生效2次）
 */
export const Seymour = card(322031)
  .since("v6.2.0")
  .costSame(1)
  .support("ally")
  .on("enter")
  .do((c) => {
    const oppTop = c.oppPlayer.pile[0];
    if (oppTop) {
      c.createHandCard(oppTop.definition.id as CardHandle);
    }
  })
  .on("playCard", (c, e) => !c.isInInitialPile(e.card))
  .usage(2)
  .usagePerRound(1)
  .adventure()
  .done();

/**
 * @id 322032
 * @name 玻娜与「绿松石」
 * @description
 * 入场时：冒险1次。
 * 我方使用「特技」后：冒险1次。（每回合1次）
 */
export const BonaAndCocouik = card(322032)
  .since("v6.3.0")
  .costVoid(2)
  .support("ally")
  .on("enter")
  .adventure()
  .on("useTechnique")
  .usagePerRound(1)
  .adventure()
  .done();
