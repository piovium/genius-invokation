import { card, character, combatStatus, DamageType, DiceType, skill, status, type SkillHandle } from "@gi-tcg/core/builder";
import { AurousBlaze, FireworkFlareup, NiwabiFiredance } from "../characters/pyro/yoimiya.gts";
import { ShadowswordGallopingFrost, ShadowswordLoneGale, TranscendentAutomaton } from "../characters/anemo/maguu_kenki.gts";
import { Collei, FloralBrush } from "../characters/dendro/collei.gts";

/**
 * @id 13053
 * @name 琉金云间草
 * @description
 * 造成3点火元素伤害，生成琉金火光。
 */
define skill {
  id 13053 as private RyuukinSaxifrage;
  until "v3.3.0";
  skillType burst;
  cost DiceType.Pyro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Pyro, 3);
  :combatStatus(AurousBlaze);
}

/**
 * @id 1305
 * @name 宵宫
 * @description
 * 花见坂第十一届全街邀请赛「长野原队」队长兼首发牌手。
 */
define character {
  id 1305 as private Yoimiya;
  until "v3.3.0";
  tags pyro, bow, inazuma;
  health 10;
  energy 2;
  skills FireworkFlareup, NiwabiFiredance, RyuukinSaxifrage;
}

/**
 * @id 25012
 * @name 孤风刀势
 * @description
 * 造成1点风元素伤害，召唤剑影·孤风。
 */
define skill {
  id 25012 as private BlusteringBlade;
  until "v3.3.0";
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 1);
  :summon(ShadowswordLoneGale);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive("my next");
  }
}

/**
 * @id 25013
 * @name 霜驰影突
 * @description
 * 造成1点冰元素伤害，召唤剑影·霜驰。
 */
define skill {
  id 25013 as private FrostyAssault;
  until "v3.3.0";
  skillType elemental;
  cost DiceType.Cryo, 3;
  :damage(DamageType.Cryo, 1);
  :summon(ShadowswordGallopingFrost);
  if (:self.hasEquipment(TranscendentAutomaton)) {
    :switchActive("my prev");
  }
}

/**
 * @id 303306
 * @name 兽肉薄荷卷（生效中）
 * @description
 * 角色在本回合结束前，所有普通攻击都少花费1无色元素。
 */
define status {
  id 303306 as private MintyMeatRollsInEffect;
  until "v3.3.0";
  oneDuration;
  on deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(1);
  }
}

/**
 * @id 117
 * @name 激化领域
 * @description
 * 我方对敌方出战角色造成雷元素伤害或草元素伤害时，伤害值+1。
 * 可用次数：3
 */
define combatStatus {
  id 117 as private CatalyzingField;
  until "v3.3.0";
  on increaseDamage {
    when :( ([DamageType.Electro, DamageType.Dendro] as DamageType[]).includes(:e.type) &&
        :e.target.id === :$("opp active")?.id );
    usage 3;
    :e.increaseDamage(1);
  }
}

/**
 * @id 217011
 * @name 飞叶迴斜
 * @description
 * 战斗行动：我方出战角色为柯莱时，装备此牌。
 * 柯莱装备此牌后，立刻使用一次拂花偈叶。
 * 装备有此牌的柯莱使用了拂花偈叶的回合中，我方角色的技能引发草元素相关反应后：造成1点草元素伤害。（每回合1次）
 * （牌组中包含柯莱，才能加入牌组）
 */
define card {
  id 217011 as private FloralSidewinder;
  until "v3.3.0";
  cost DiceType.Dendro, 3;
  talent Collei {
    on enter {
      :useSkill(FloralBrush);
    }
  }
}
