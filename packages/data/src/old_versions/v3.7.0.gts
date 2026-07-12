import { DamageType, DiceType, type SkillHandle, card, character, skill, status, summon } from "@gi-tcg/core/builder";
import { AurousBlaze } from "../characters/pyro/yoimiya.gts";
import { ThunderbeastsTarge } from "../characters/electro/beidou.gts";
import { PyronadoStatus } from "../characters/pyro/xiangling.gts";
import { ClawAndThunder, SteelFang, TheWolfWithin } from "../characters/electro/razor.gts";
import { FavoniusBladeworkEdel, IcetideVortex, WellspringOfWarlust } from "../characters/cryo/eula.gts";

/**
 * @id 312004
 * @name 赌徒的耳环
 * @description
 * 敌方角色被击倒后：如果所附属角色为「出战角色」，则生成2个万能元素。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312004 as private GamblersEarrings;
  until "v3.7.0";
  cost DiceType.Aligned, 1;
  artifact {
    on defeated {
      when :( :self.master.isActive() && !:e.target.isMine() );
      listenTo all;
      :generateDice(DiceType.Omni, 2);
    }
  }
}

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成4点火元素伤害，生成琉金火光。
 */
define skill {
  id 13053 as private RyuukinSaxifrage;
  until "v3.7.0";
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 3;
  :damage(DamageType.Pyro, 4);
  :combatStatus(AurousBlaze);
}

/**
 * @id 14054
 * @name 踏潮
 * @description
 * （需准备1个行动轮）
 * 造成2点雷元素伤害。
 */
define skill {
  id 14054 as private Wavestrider;
  until "v3.7.0";
  skillType elemental;
  noEnergy;
  :damage(DamageType.Electro, 2);
}

/**
 * @id 14053
 * @name 斫雷
 * @description
 * 造成3点雷元素伤害，生成雷兽之盾。
 */
define skill {
  id 14053 as private Stormbreaker;
  until "v3.7.0";
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 3;
  :damage(DamageType.Electro, 3);
  :combatStatus(ThunderbeastsTarge);
}

/**
 * @id 13023
 * @name 旋火轮
 * @description
 * 造成2点火元素伤害，生成旋火轮。
 */
define skill {
  id 13023 as private Pyronado;
  until "v3.7.0";
  skillType burst;
  cost DiceType.Pyro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 2);
  :combatStatus(PyronadoStatus);
}

/**
 * @id 14023
 * @name 雷牙
 * @description
 * 造成5点雷元素伤害，本角色附属雷狼。
 */
define skill {
  id 14023 as private LightningFang;
  until "v3.7.0";
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Electro, 5);
  :characterStatus(TheWolfWithin);
}

/**
 * @id 1402
 * @name 雷泽
 * @description
 * 「牌，难。」
 * 「但，有朋友…」
 */
define character {
  id 1402 as private Razor;
  until "v3.7.0";
  tags electro, claymore, mondstadt;
  health 10;
  energy 3;
  skills SteelFang, ClawAndThunder, LightningFang;
}

/**
 * @id 111061
 * @name 冷酷之心
 * @description
 * 所附属角色使用冰潮的涡旋时：移除此状态，使本次伤害+2。
 */
define status {
  id 111061 as private Grimheart;
  until "v3.7.0";
  on increaseSkillDamage {
    when :( :e.damageInfo.via.definition.id === IcetideVortex );
    :e.increaseDamage(2);
    :dispose();
  }
}

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成2点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
define summon {
  id 111062 as private LightfallSword;
  until "v3.7.0";
  hint DamageType.Physical, "3+";
  usage 0 {
    autoDispose false;
  };
  on useSkill {
    when :( :e.skill.definition.id === FavoniusBladeworkEdel || 
        :e.skill.definition.id === IcetideVortex );
    if (:e.skill.definition.id === IcetideVortex &&
      :e.skill.caller.cast<"character">().hasEquipment(WellspringOfWarlust)) {
      :self.addVariable("usage", 3);
    } else {
      :self.addVariable("usage", 2);
    }
  }
  on endPhase {
    :damage(DamageType.Physical, 2 + :getVariable("usage"));
    :dispose();
  }
}

