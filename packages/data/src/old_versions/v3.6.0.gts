import { card, character, DamageType, DiceType, skill, summon, type EquipmentHandle, type SkillHandle } from "@gi-tcg/core/builder";
import { LiutianArchery, SacredCryoPearl, TrailOfTheQilin } from "../characters/cryo/ganyu.gts";
import { MirrorCage, Refraction, Refraction01 } from "../characters/hydro/mirror_maiden.gts";
import { SuperlativeSuperstrength } from "../characters/geo/arataki_itto.gts";
import { LithicGuard } from "../cards/equipment/weapon/pole.gts";

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
define skill {
  id 11013 as private FrostflakeArrow;
  until "v3.6.0";
  skillType normal;
  cost DiceType.Cryo, 5;
  if (:self.hasEquipment(UndividedHeart) && :countOfSkill() > 0) {
    :damage(DamageType.Piercing, 3, "opp standby");
    :damage(DamageType.Cryo, 3);
  } else {
    :damage(DamageType.Piercing, 2, "opp standby");
    :damage(DamageType.Cryo, 2);
  }
}

/**
 * @id 11014
 * @name 降众天华
 * @description
 * 造成1点冰元素伤害，对所有敌方后台角色造成1点穿透伤害，召唤冰灵珠。
 */
define skill {
  id 11014 as private CelestialShower;
  until "v3.6.0";
  skillType burst;
  cost DiceType.Cryo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Piercing, 1, "opp standby");
  :damage(DamageType.Cryo, 1);
  :summon(SacredCryoPearl);
}

/**
 * @id 1101
 * @name 甘雨
 * @description
 * 「既然是明早前要，那这份通稿，只要熬夜写完就好。」
 */
define character {
  id 1101 as private Ganyu;
  until "v3.6.0";
  tags cryo, bow, liyue;
  health 10;
  energy 2;
  skills LiutianArchery, TrailOfTheQilin, FrostflakeArrow, CelestialShower;
}

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成3点水元素伤害，目标角色附属水光破镜。
 */
define skill {
  id 22022 as InfluxBlast;
  until "v3.6.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 3);
  if (:self.hasEquipment(MirrorCage)) {
    :characterStatus(Refraction01, "opp active");
  }
  else {
    :characterStatus(Refraction, "opp active");
  }
}

/**
 * @id 116051
 * @name 阿丑
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：1，耗尽时不弃置此牌。
 * 此召唤物在场期间可触发1次：我方出战角色受到伤害后，为荒泷一斗附属乱神之怪力。
 * 结束阶段：弃置此牌，造成1点岩元素伤害。
 */
define summon {
  id 116051 as private Ushi;
  until "v3.6.0";
  tags barrier;
  hint DamageType.Geo, 1;
  on endPhase {
    :damage(DamageType.Geo, 1);
    :dispose();
  }
  on decreaseDamaged {
    usage 1 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on damaged {
    when :( :e.target.isActive() );
    usage 1 {
      name "addStatusUsage";
    };
    :characterStatus(SuperlativeSuperstrength, "my characters with definition id 1605");
  }
}

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
define card {
  id 311402 as private LithicSpear;
  until "v3.6.0";
  cost DiceType.Aligned, 3;
  weapon pole {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    }
    on enter {
      void 0;
      // 此版本只计算未击倒角色
      const liyueCount = :$$(`my characters with tag (liyue)`).length;
      if (liyueCount > 0) {
        :characterStatus(LithicGuard, "@master", {
          overrideVariables: {
            shield: Math.min(liyueCount, 3)
          }
        });
      }
    }
  }
}

