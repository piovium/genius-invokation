import { card, DamageType, skill, status } from "@gi-tcg/core/builder";
import { BurningFlame, CatalyzingField, DendroCore } from "../commons.gts";

/**
 * @id 331702
 * @name 元素共鸣：蔓生之草
 * @description
 * 若我方场上存在燃烧烈焰/草原核/激化领域，则对对方出战角色造成1点火元素伤害/水元素伤害/雷元素伤害。
 * （牌组包含至少2个草元素角色，才能加入牌组）
 */
const ElementalResonanceSprawlingGreenery = card(331702)
  .until("v5.5.0")
  .costDendro(1)
  .tags("resonance")
  .filter((c) => c.$(`
    my combat status with definition id ${DendroCore} or 
    my combat status with definition id ${CatalyzingField} or
    my summon with definition id ${BurningFlame}`))
  .do((c) => {
    if (c.$(`my combat status with definition id ${DendroCore}`)) {
      c.damage(DamageType.Hydro, 1, "opp active");
    }
    if (c.$(`my combat status with definition id ${CatalyzingField}`)) {
      c.damage(DamageType.Electro, 1, "opp active");
    }
    if (c.$(`my summon with definition id ${BurningFlame}`)) {
      c.damage(DamageType.Pyro, 1, "opp active");
    }
  })
  .done();

/**
 * @id 112083
 * @name 永世流沔
 * @description
 * 结束阶段：对所附属角色造成3点水元素伤害。
 * 可用次数：1
 */
const LingeringAeon = status(112083)
  .until("v5.5.0")
  .on("endPhase")
  .usage(1)
  .damage(DamageType.Hydro, 3, "@master")
  .done();

/**
 * @id 12083
 * @name 浮莲舞步·远梦聆泉
 * @description
 * 造成2点水元素伤害，目标角色附属永世流沔。
 */
const DanceOfAbzendegiDistantDreamsListeningSpring = skill(12083)
  .until("v5.5.0")
  .type("burst")
  .costHydro(3)
  .costEnergy(2)
  .damage(DamageType.Hydro, 2)
  .characterStatus(LingeringAeon, "opp active")
  .done();
