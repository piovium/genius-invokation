import { card, DamageType, DiceType, skill, summon, type SkillHandle, type SummonHandle } from "@gi-tcg/core/builder";
import { ScopeOutSoftSpots } from "../characters/cryo/rosaria.gts";
import { TamakushiCasket } from "../characters/hydro/sangonomiya_kokomi.gts";
import { SesshouSakura } from "../characters/electro/yae_miko.gts";
import { LandsOfDandelion } from "../characters/anemo/jean.gts";
import { SoaringOnTheWind } from "../characters/anemo/xianyun.gts";
import { MirrorCage, Refraction, Refraction01 } from "../characters/hydro/mirror_maiden.gts";
import { RipplingBladesStatus } from "../characters/hydro/abyss_herald_wicked_torrents.gts";
import { GyoeiNarukamiKariyamaRite, KukiShinobu } from "../characters/electro/kuki_shinobu.gts";

/**
 * @id 22022
 * @name 潋波绽破
 * @description
 * 造成2点水元素伤害，目标角色附属水光破镜。
 */
define skill {
  id 22022 as private InfluxBlast;
  until "v5.2.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 2);
  if (:self.hasEquipment(MirrorCage)) {
    :characterStatus(Refraction01, "opp active");
  }
  else {
    :characterStatus(Refraction, "opp active");
  }
}

/**
 * @id 115021
 * @name 蒲公英领域
 * @description
 * 结束阶段：造成1点风元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
define summon {
  id 115021 as private DandelionField;
  until "v5.2.0";
  hint DamageType.Anemo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Anemo, 1);
    :heal(1, "my active");
  }
  on increaseDamage {
    when :( :$(`my equipment with definition id ${LandsOfDandelion}`) && // 装备有天赋的琴在场时
        :e.type === DamageType.Anemo );
    :e.increaseDamage(1);
  }
}

/**
 * @id 112051
 * @name 化海月
 * @description
 * 结束阶段：造成1点水元素伤害，治疗我方出战角色1点。
 * 可用次数：2
 */
define summon {
  id 112051 as private BakeKurage;
  until "v5.2.0";
  hint DamageType.Hydro, "1";
  on endPhase {
    usage 2;
    if (:$(`my equipment with definition id ${TamakushiCasket}`)) {
      :damage(DamageType.Hydro, 2);
    }
    else {
      :damage(DamageType.Hydro, 1);
    }
    :heal(1, "my active");
  }
}

/**
 * @id 14082
 * @name 野干役咒·杀生樱
 * @description
 * 召唤杀生樱。
 */
define skill {
  id 14082 as private YakanEvocationSesshouSakura;
  until "v5.2.0";
  skillType elemental;
  cost DiceType.Electro, 3;
  :summon(SesshouSakura);
}

/**
 * @id 22032
 * @name 洄涡锋刃
 * @description
 * 造成2点水元素伤害，然后准备技能：涟锋旋刃。
 */
define skill {
  id 22032 as private VortexEdge;
  until "v5.2.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  :damage(DamageType.Hydro, 2);
  :characterStatus(RipplingBladesStatus, "@self");
}



/**
 * @id 111132
 * @name 极寒的冰枪
 * @description
 * 结束阶段：造成1点冰元素伤害，生成1层洞察破绽。
 * 可用次数：2
 */
define summon {
  id 111132 as private EvercoldFrostlance;
  until "v5.2.0";
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
    :combatStatus(ScopeOutSoftSpots);
  }
}

/**
 * @id 214111
 * @name 割舍软弱之心
 * @description
 * 战斗行动：我方出战角色为久岐忍时，装备此牌。
 * 久岐忍装备此牌后，立刻使用一次御咏鸣神刈山祭。
 * 装备有此牌的久岐忍被击倒时：角色免于被击倒，并治疗该角色到1点生命值。（每回合1次）
 * 如果装备有此牌的久岐忍生命值不多于5，则该角色造成的伤害+1。
 * （牌组中包含久岐忍，才能加入牌组）
 */
define card {
  id 214111 as private ToWardWeakness;
  until "v5.2.0";
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  talent KukiShinobu {
    on enter {
      :useSkill(GyoeiNarukamiKariyamaRite);
    }
    on beforeDefeated {
      usage perRound, 1;
      :immune(1);
    }
    on increaseSkillDamage {
      when :( :e.source.cast<"character">().health <= 5 );
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 11132
 * @name 噬罪的告解
 * @description
 * 造成1点冰元素伤害，生成2层洞察破绽。（触发洞察破绽的效果时，会生成强攻破绽。）
 */
define skill {
  id 11132 as private RavagingConfession;
  until "v5.2.0";
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :combatStatus(ScopeOutSoftSpots, "my", {
      overrideVariables: {
        layer: 2
      }
    });
}
