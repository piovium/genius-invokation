import { DamageType, type EquipmentHandle, type SkillHandle, card, character, skill, summon } from "@gi-tcg/core/builder";
import { LiutianArchery, SacredCryoPearl, TrailOfTheQilin } from "../characters/cryo/ganyu.ts";
import { MirrorCage, Refraction, Refraction01 } from "../characters/hydro/mirror_maiden.ts";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto.ts";
import { LithicGuard } from "../cards/equipment/weapon/pole.ts";

/**
 * @id 211011
 * @name 唯此一心
 * @description
 * 战斗行动：我方出战角色为甘雨时，装备此牌。
 * 甘雨装备此牌后，立刻使用一次霜华矢。
 * 装备有此牌的甘雨使用霜华矢时：如果此技能在本场对局中曾经被使用过，则其造成的冰元素伤害+1，并且改为对敌方后台角色造成3点穿透伤害。
 * （牌组中包含甘雨，才能加入牌组）
 */
const UndividedHeart = 211011 as EquipmentHandle; // keep same

/**
 * @id 11013
 * @name 霜华矢
 * @description
 * 造成2点冰元素伤害，对所有敌方后台角色造成2点穿透伤害。
 */
const FrostflakeArrow = skill(11013)
  .until("v3.6.0")
  .type("normal")
  .costCryo(5)
  .do((c) => {
    if (c.self.hasEquipment(UndividedHeart) && c.countOfSkill() > 0) {
      c.damage(DamageType.Piercing, 3, "opp standby");
      c.damage(DamageType.Cryo, 3);
    } else {
      c.damage(DamageType.Piercing, 2, "opp standby");
      c.damage(DamageType.Cryo, 2);
    }
  })
  .done();

/**
 * @id 11014
 * @name 降众天华
 * @description
 * 造成1点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤冰灵珠。
 */
const CelestialShower = skill(11014)
  .until("v3.6.0")
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  .damage(DamageType.Piercing, 1, "opp standby")
  .damage(DamageType.Cryo, 1)
  .summon(SacredCryoPearl)
  .done();

/**
 * @id 1101
 * @name 甘雨
 * @description
 * 「既然是明早前要，那这份通稿，只要熬夜写完就好。」
 */
const Ganyu = character(1101)
  .until("v3.6.0")
  .tags("cryo", "bow", "liyue")
  .health(10)
  .energy(2)
  .skills(LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower)
  .done();

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成3点水元素伤害，目标角色附属水光破镜。
 */
export const InfluxBlast: SkillHandle = skill(22022)
  .until("v3.6.0")
  .type("elemental")
  .costHydro(3)
  .damage(DamageType.Hydro, 3)
  .if((c) => c.self.hasEquipment(MirrorCage))
  .characterStatus(Refraction01, "opp active")
  .else()
  .characterStatus(Refraction, "opp active")
  .done();

/**
 * @id 116051
 * @name 阿丑
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 此召唤物在场期间可触发1次：我方出战角色受到伤害后，为荒泷一斗附属乱神之怪力。
 * 结束阶段：弃置此牌，造成1点岩元素伤害。
 */
const Ushi = summon(116051)
  .until("v3.6.0")
  .tags("barrier")
  .endPhaseDamage(DamageType.Geo, 1)
  .dispose()
  .on("decreaseDamaged")
  .usage(1, { autoDispose: false })
  .decreaseDamage(1)
  .on("damaged", (c, e) => e.target.isActive())
  .usage(1, { name: "addStatusUsage" })
  .characterStatus(SuperlativeSuperstrength, `my characters with definition id 1605`)
  .done();

/**
 * @id 332013
 * @name 送你一程
 * @description
 * 选择一个敌方「召唤物」，将其消灭。
 */
const SendOff = card(332013)
  .until("v3.6.0")
  .costSame(2)
  .addTarget("opp summon")
  .do((c, e) => {
    e.targets[0].dispose();
  })
  .done();

/**
 * @id 311402
 * @name 千岩长枪
 * @description
 * 角色造成的伤害+1。
 * 入场时：我方队伍中每有一名「璃月」角色，此牌就为附属的角色提供1点护盾。（最多3点）
 * （「长柄武器」角色才能装备。角色最多装备1件「武器」）
 */
const LithicSpear = card(311402)
  .until("v3.6.0")
  .costSame(3)
  .weapon("pole")
  .on("increaseSkillDamage")
  .increaseDamage(1)
  .on("enter")
  .do((c) => {
    // 此版本只计算未击倒角色
    const liyueCount = c.$$(`my characters with tag (liyue)`).length;
    if (liyueCount > 0) {
      c.characterStatus(LithicGuard, "@master", {
        overrideVariables: {
          shield: Math.min(liyueCount, 3)
        }
      });
    }
  })
  .done();

