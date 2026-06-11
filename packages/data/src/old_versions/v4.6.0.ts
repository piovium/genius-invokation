import { skill, combatStatus, card, DamageType } from "@gi-tcg/core/builder";
import { UnderseaTreasure } from "../cards/event/other.ts";

/**
 * @id 332031
 * @name 海中寻宝
 * @description
 * 生成6张海底宝藏，随机地置入我方牌库中。
 */
const UnderwaterTreasureHunt = card(332031)
  .until("v4.6.0")
  .costSame(1)
  .createPileCards(UnderseaTreasure, 6, "random")
  .done();

/**
 * @id 112092
 * @name 玄掷玲珑
 * @description
 * 我方角色普通攻击后：造成2点水元素伤害。
 * 持续回合：2
 */
const ExquisiteThrow = combatStatus(112092)
  .until("v4.6.0")
  .duration(2)
  .on("useSkill", (c, e) => e.isSkillType("normal"))
  .damage(DamageType.Hydro, 2)
  .done();

/**
 * @id 12093
 * @name 渊图玲珑骰
 * @description
 * 造成1点水元素伤害，生成玄掷玲珑。
 */
const DepthclarionDice = skill(12093)
  .until("v4.6.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(3)
  .damage(DamageType.Hydro, 1)
  .combatStatus(ExquisiteThrow)
  .done();
