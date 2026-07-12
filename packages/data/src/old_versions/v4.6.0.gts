import { card, combatStatus, DamageType, DiceType, skill } from "@gi-tcg/core/builder";
import { UnderseaTreasure } from "../cards/event/other.gts";

/**
 * @id 332031
 * @name 海中寻宝
 * @description
 * 生成6张海底宝藏，随机地置入我方牌库中。
 */
define card {
  id 332031 as private UnderwaterTreasureHunt;
  until "v4.6.0";
  cost DiceType.Aligned, 1;
  :createPileCards(UnderseaTreasure, 6, "random");
}

/**
 * @id 112092
 * @name 玄掷玲珑
 * @description
 * 我方角色普通攻击后：造成2点水元素伤害。
 * 持续回合：2
 */
define combatStatus {
  id 112092 as private ExquisiteThrow;
  until "v4.6.0";
  duration 2;
  on useSkill {
    when :( :e.isSkillType("normal") );
    :damage(DamageType.Hydro, 2);
  }
}

/**
 * @id 12093
 * @name 渊图玲珑骰
 * @description
 * 造成1点水元素伤害，生成玄掷玲珑。
 */
define skill {
  id 12093 as private DepthclarionDice;
  until "v4.6.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Hydro, 1);
  :combatStatus(ExquisiteThrow);
}
