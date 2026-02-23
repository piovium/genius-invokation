import { DamageType, DiceType, card, skill, status } from "@gi-tcg/core/builder";
import { EmbersRekindled } from "../characters/pyro/abyss_lector_fathomless_flames";
import { HeronStrike } from "../characters/hydro/candace";
import { Wavestrider } from "../characters/electro/beidou";
import { DisposedSupportCountExtension } from "../cards/support/ally";

/**
 * @id 123022
 * @name 火之新生
 * @description
 * 所附属角色被击倒时：移除此效果，使角色免于被击倒，并治疗该角色到3点生命值。
 */
const FieryRebirthStatus = status(123022)
  .until("v4.5.0")
  .on("beforeDefeated")
  .immune(3)
  .do((c) => {
    const talent = c.self.master.hasEquipment(EmbersRekindled);
    if (talent) {
      c.dispose(talent);
      c.characterStatus(AegisOfAbyssalFlame, "@master");
    }
  })
  .dispose()
  .done();

/**
 * @id 123024
 * @name 渊火加护
 * @description
 * 为所附属角色提供3点护盾。
 * 此护盾耗尽前：所附属角色造成的火元素伤害+1。
 */
const AegisOfAbyssalFlame = status(123024)
  .until("v4.5.0")
  .shield(3)
  .on("increaseSkillDamage", (c, e) => e.type === DamageType.Pyro)
  .increaseDamage(1)
  .done();

/**
 * @id 112071
 * @name 苍鹭护盾
 * @description
 * 本角色将在下次行动时，直接使用技能：苍鹭震击。
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
const HeronShield = status(112071)
  .until("v4.5.0")
  .shield(2)
  .prepare(HeronStrike)
  .done();

/**
 * @id 12072
 * @name 圣仪·苍鹭庇卫
 * @description
 * 本角色附属苍鹭护盾并准备技能：苍鹭震击。
 */
const SacredRiteHeronsSanctum = skill(12072)
  .until("v4.5.0")
  .type("elemental")
  .costHydro(3)
  .characterStatus(HeronShield)
  .done();

/**
 * @id 114051
 * @name 捉浪·涛拥之守
 * @description
 * 本角色将在下次行动时，直接使用技能：踏潮。
 * 准备技能期间：提供2点护盾，保护所附属的角色。
 */
const TidecallerSurfEmbrace = status(114051)
  .until("v4.5.0")
  .prepare(Wavestrider)
  .shield(2)
  .done();

/**
 * @id 14052
 * @name 捉浪
 * @description
 * 本角色附属捉浪·涛拥之守并准备技能：踏潮。
 */
const Tidecaller = skill(14052)
  .until("v4.5.0")
  .type("elemental")
  .costElectro(3)
  .characterStatus(TidecallerSurfEmbrace)
  .done();

/**
 * @id 322020
 * @name 弥生七月
 * @description
 * 我方打出「圣遗物」手牌时：少花费1个元素骰；我方场上每有一个已装备「圣遗物」的角色，就额外少花费1个元素骰。（每回合1次）
 */
export const YayoiNanatsuki = card(322020)
  .until("v4.5.0")
  .costSame(1)
  .support("ally")
  .on("deductOmniDiceCard", (c, e) => e.hasCardTag("artifact"))
  .usagePerRound(1)
  .do((c, e) => {
    const artifactedCh = c.$$("my characters has equipment with tag (artifact)").length;
    e.deductOmniCost(1 + artifactedCh);
  })
  .done();

/**
 * @id 323005
 * @name 化种匣
 * @description
 * 我方打出原本元素骰费用为1的装备或支援牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
const SeedDispensary = card(323005)
  .until("v4.5.0")
  .support("item")
  .on("deductOmniDiceCard", (c, e) => e.currentDiceCostSize() === 1 &&
    ["equipment", "support"].includes(e.action.skill.caller.definition.type))
  .usagePerRound(1)
  .usage(2)
  .deductOmniCost(1)
  .done();

/**
 * @id 322022
 * @name 婕德
 * @description
 * 此牌会记录本场对局中我方支援区弃置卡牌的数量，称为「阅历」。（最多6点）
 * 我方角色使用「元素爆发」后：如果「阅历」至少为5，则弃置此牌，生成「阅历」-2数量的万能元素。
 */
const Jeht = card(322022)
  .until("v4.5.0")
  .costVoid(2)
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
  .on("useSkill", (c, e) => e.isSkillType("burst"))
  .do((c) => {
    const exp = c.getVariable("experience");
    if (exp >= 5) {
      c.generateDice(DiceType.Omni, exp - 2);
      c.dispose();
    }
  })
  .done();
