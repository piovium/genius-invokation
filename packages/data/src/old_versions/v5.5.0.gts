import { card, DamageType, DiceType, skill, status } from "@gi-tcg/core/builder";
import { BurningFlame, CatalyzingField, DendroCore } from "../commons.gts";

/**
 * @id 331702
 * @name 元素共鸣：蔓生之草
 * @description
 * 若我方场上存在燃烧烈焰/草原核/激化领域，则对对方出战角色造成1点火元素伤害/水元素伤害/雷元素伤害。
 * （牌组包含至少2个草元素角色，才能加入牌组）
 */
define card {
  id 331702 as private ElementalResonanceSprawlingGreenery;
  until "v5.5.0";
  cost DiceType.Dendro, 1;
  tags resonance;
  filter :( :$(`my combat status with definition id ${DendroCore} or my combat status with definition id ${CatalyzingField} or my summon with definition id ${BurningFlame}`) );
  if (:$(`my combat status with definition id ${DendroCore}`)) {
    :damage(DamageType.Hydro, 1, "opp active");
  }
  if (:$(`my combat status with definition id ${CatalyzingField}`)) {
    :damage(DamageType.Electro, 1, "opp active");
  }
  if (:$(`my summon with definition id ${BurningFlame}`)) {
    :damage(DamageType.Pyro, 1, "opp active");
  }
}

/**
 * @id 112083
 * @name 永世流沔
 * @description
 * 结束阶段：对所附属角色造成3点水元素伤害。
 * 可用次数：1
 */
define status {
  id 112083 as private LingeringAeon;
  until "v5.5.0";
  on endPhase {
    usage 1;
    :damage(DamageType.Hydro, 3, "@master");
  }
}

/**
 * @id 12083
 * @name 浮莲舞步·远梦聆泉
 * @description
 * 造成2点水元素伤害，目标角色附属永世流沔。
 */
define skill {
  id 12083 as private DanceOfAbzendegiDistantDreamsListeningSpring;
  until "v5.5.0";
  skillType burst;
  cost DiceType.Hydro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Hydro, 2);
  :characterStatus(LingeringAeon, "opp active");
}
