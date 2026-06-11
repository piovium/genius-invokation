import { DamageType, DiceType, card, skill } from "@gi-tcg/core/builder";
import { VermillionHereafterEffect } from "../cards/equipment/artifacts.ts";

/**
 * @id 321003
 * @name 群玉阁
 * @description
 * 投掷阶段：2个元素骰初始总是投出我方出战角色类型的元素。
 */
const JadeChamber = card(321003)
  .until("v3.8.0")
  .costSame(1)
  .support("place")
  .on("roll")
  .do((c, e) => {
    e.fixDice(c.$("my active")!.element(), 2);
  })
  .done();


/**
 * @id 312101
 * @name 破冰踏雪的回音
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个冰元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const BrokenRimesEcho = card(312101)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Cryo))
  .usagePerRound(1)
  .deductCost(DiceType.Cryo, 1)
  .done();

/**
 * @id 312201
 * @name 酒渍船帽
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个水元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const WinestainedTricorne = card(312201)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Hydro))
  .usagePerRound(1)
  .deductCost(DiceType.Hydro, 1)
  .done();

/**
 * @id 312301
 * @name 焦灼的魔女帽
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个火元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const WitchsScorchingHat = card(312301)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Pyro))
  .usagePerRound(1)
  .deductCost(DiceType.Pyro, 1)
  .done();

/**
 * @id 312401
 * @name 唤雷的头冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个雷元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const ThunderSummonersCrown = card(312401)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Electro))
  .usagePerRound(1)
  .deductCost(DiceType.Electro, 1)
  .done();

/**
 * @id 312501
 * @name 翠绿的猎人之冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个风元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const ViridescentVenerersDiadem = card(312501)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Anemo))
  .usagePerRound(1)
  .deductCost(DiceType.Anemo, 1)
  .done();

/**
 * @id 312601
 * @name 不动玄石之相
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个岩元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const MaskOfSolitudeBasalt = card(312601)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Geo))
  .usagePerRound(1)
  .deductCost(DiceType.Geo, 1)
  .done();

/**
 * @id 312701
 * @name 月桂的宝冠
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个草元素。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const LaurelCoronet = card(312701)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Dendro))
  .usagePerRound(1)
  .deductCost(DiceType.Dendro, 1)
  .done();

/**
 * @id 312013
 * @name 无常之面
 * @description
 * 对角色打出「天赋」或角色使用「元素战技」时：少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const CapriciousVisage = card(312013)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "elemental"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 312011
 * @name 虺雷之姿
 * @description
 * 对角色打出「天赋」或角色使用「普通攻击」时：少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
const ThunderingPoise = card(312011)
  .until("v3.8.0")
  .costSame(2)
  .artifact()
  .on("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "normal"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .done();

/**
 * @id 312102
 * @name 冰风迷途的勇士
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个冰元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出冰元素。
 * （角色最多装备1件「圣遗物」）
 */
const BlizzardStrayer = card(312102)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Cryo))
  .usagePerRound(1)
  .deductCost(DiceType.Cryo, 1)
  .on("roll")
  .fixDice(DiceType.Cryo, 2)
  .done();

/**
 * @id 312202
 * @name 沉沦之心
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个水元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出水元素。
 * （角色最多装备1件「圣遗物」）
 */
const HeartOfDepth = card(312202)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Hydro))
  .usagePerRound(1)
  .deductCost(DiceType.Hydro, 1)
  .on("roll")
  .fixDice(DiceType.Hydro, 2)
  .done();

/**
 * @id 312302
 * @name 炽烈的炎之魔女
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个火元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出火元素。
 * （角色最多装备1件「圣遗物」）
 */
const CrimsonWitchOfFlames = card(312302)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Pyro))
  .usagePerRound(1)
  .deductCost(DiceType.Pyro, 1)
  .on("roll")
  .fixDice(DiceType.Pyro, 2)
  .done();

/**
 * @id 312402
 * @name 如雷的盛怒
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个雷元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出雷元素。
 * （角色最多装备1件「圣遗物」）
 */
const ThunderingFury = card(312402)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Electro))
  .usagePerRound(1)
  .deductCost(DiceType.Electro, 1)
  .on("roll")
  .fixDice(DiceType.Electro, 2)
  .done();

/**
 * @id 312502
 * @name 翠绿之影
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个风元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出风元素。
 * （角色最多装备1件「圣遗物」）
 */
const ViridescentVenerer = card(312502)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Anemo))
  .usagePerRound(1)
  .deductCost(DiceType.Anemo, 1)
  .on("roll")
  .fixDice(DiceType.Anemo, 2)
  .done();

/**
 * @id 312602
 * @name 悠古的磐岩
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个岩元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出岩元素。
 * （角色最多装备1件「圣遗物」）
 */
const ArchaicPetra = card(312602)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Geo))
  .usagePerRound(1)
  .deductCost(DiceType.Geo, 1)
  .on("roll")
  .fixDice(DiceType.Geo, 2)
  .done();

/**
 * @id 312702
 * @name 深林的记忆
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费1个草元素。（每回合1次）
 * 投掷阶段：2个元素骰初始总是投出草元素。
 * （角色最多装备1件「圣遗物」）
 */
const DeepwoodMemories = card(312702)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Dendro))
  .usagePerRound(1)
  .deductCost(DiceType.Dendro, 1)
  .on("roll")
  .fixDice(DiceType.Dendro, 2)
  .done();

/**
 * @id 312012
 * @name 辰砂往生录
 * @description
 * 对角色打出「天赋」或角色使用「普通攻击」时：少花费1个元素骰。（每回合1次）
 * 角色被切换为「出战角色」后：本回合中，角色「普通攻击」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
const VermillionHereafter = card(312012)
  .until("v3.8.0")
  .costSame(3)
  .artifact()
  .on("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "normal"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .on("switchActive", (c, e) => c.self.master.id === e.switchInfo.to.id)
  .characterStatus(VermillionHereafterEffect, "@master")
  .done();

/**
 * @id 312014
 * @name 追忆之注连
 * @description
 * 对角色打出「天赋」或角色使用「元素战技」时：少花费1个元素骰。（每回合1次）
 * 如果角色具有至少2点充能，就使角色「普通攻击」和「元素战技」造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
const ShimenawasReminiscence = card(312014)
  .until("v3.8.0")
  .costSame(3)
  .artifact()
  .on("deductOmniDice", (c, e) => e.isSkillOrTalentOf(c.self.master, "elemental"))
  .usagePerRound(1)
  .deductOmniCost(1)
  .on("increaseSkillDamage", (c, e) =>
    c.self.master.energy >= 2 &&
    (e.viaSkillType("normal") || e.viaSkillType("elemental")))
  .increaseDamage(1)
  .done();

/**
 * @id 312007
 * @name 华饰之兜
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * （角色最多装备1件「圣遗物」）
 */
const OrnateKabuto = card(312007)
  .until("v3.8.0")
  .costVoid(2)
  .artifact()
  .on("useSkill", (c, e) => e.skill.caller.id !== c.self.master.id && e.isSkillType("burst"))
  .listenToPlayer()
  .gainEnergy(1, "@master")
  .done();

/**
 * @id 312008
 * @name 绝缘之旗印
 * @description
 * 其他我方角色使用「元素爆发」后：所附属角色获得1点充能。
 * 角色使用「元素爆发」造成的伤害+2。
 * （角色最多装备1件「圣遗物」）
 */
const EmblemOfSeveredFate = card(312008)
  .until("v3.8.0")
  .costVoid(3)
  .artifact()
  .on("useSkill", (c, e) => e.skill.caller.id !== c.self.master.id && e.isSkillType("burst"))
  .listenToPlayer()
  .gainEnergy(1, "@master")
  .on("increaseSkillDamage", (c, e) => e.viaSkillType("burst"))
  .increaseDamage(2)
  .done();

/**
 * @id 331803
 * @name 雷与永恒
 * @description
 * 将我方所有元素骰转换为当前出战角色的类型。
 * （牌组包含至少2个「稻妻」角色，才能加入牌组）
 */
const ThunderAndEternity = card(331803)
  .until("v3.8.0")
  .do((c) => {
    c.convertDice(c.$("my active")!.element(), "all");
  })
  .done();

/**
 * @id 332005
 * @name 本大爷还没有输！
 * @description
 * 本回合有我方角色被击倒，才能打出：
 * 生成1个万能元素，我方当前出战角色获得1点充能。
 */
const IHaventLostYet = card(332005)
  .until("v3.8.0")
  .filter((c) => c.player.hasDefeated)
  .generateDice(DiceType.Omni, 1)
  .gainEnergy(1, "my active")
  .done();
