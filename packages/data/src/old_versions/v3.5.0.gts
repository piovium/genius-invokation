import { DamageType, DiceType, card, combatStatus, skill } from "@gi-tcg/core/builder";
import { BakeKurage, TamakushiCasket } from "../characters/hydro/sangonomiya_kokomi.ts";

/**
 * @id 322002
 * @name 凯瑟琳
 * @description
 * 我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
const Katheryne = card(322002)
  .until("v3.5.0")
  .costVoid(2)
  .support("ally")
  .on("beforeFastSwitch")
  .usagePerRound(1)
  .setFastAction()
  .done();

/**
 * @id 12053
 * @name 海人化羽
 * @description
 * 造成3点水元素伤害，本角色附属仪来羽衣。
 */
const NereidsAscension = skill(12053)
  .until("v3.5.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 3)
  .if((c) => c.self.hasEquipment(TamakushiCasket) && c.$(`my summon with definition id ${BakeKurage}`))
  .summon(BakeKurage)
  .done();

/**
 * @id 112022
 * @name 虹剑势
 * @description
 * 我方角色普通攻击后：造成2点水元素伤害。
 * 可用次数：3
 */
const RainbowBladework = combatStatus(112022)
  .until("v3.5.0")
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .usage(3)
  .damage(DamageType.Hydro, 2)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
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
  .until("v3.5.0")
  .costSame(3)
  .artifact()
  .on("deductElementDice", (c, e) => e.isSkillOrTalentOf(c.self.master) && e.canDeductCostOfType(DiceType.Dendro))
  .usagePerRound(1)
  .deductCost(DiceType.Dendro, 1)
  .on("roll")
  .fixDice(DiceType.Dendro, 2)
  .done();

