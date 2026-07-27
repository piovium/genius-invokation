// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import {
  $,
  DiceType,
  type StatusHandle,
  card,
  combatStatus,
  status,
} from "@gi-tcg/core/builder";
import { BattlePlan, Satiated, SharpenTheBlade } from "../../commons.gts";

/**
 * @id 333001
 * @name 绝云锅巴
 * @description
 * 本回合中，目标角色下一次「普通攻击」造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333001 as JueyunGuoba;
  since "v3.3.0";
  food;
  :characterStatus(JueyunGuobaInEffect, :e.targets[0]);
};

/**
 * @id 303301
 * @name 绝云锅巴（生效中）
 * @description
 * 本回合中，该角色下一次「普通攻击」造成的伤害+1。
 */
define status {
  id 303301 as private JueyunGuobaInEffect;
  since "v3.3.0";
  oneDuration;
  once increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  };
};

/**
 * @id 333002
 * @name 仙跳墙
 * @description
 * 本回合中，目标角色下一次「元素爆发」造成的伤害+3。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333002 as AdeptusTemptation;
  since "v3.3.0";
  cost DiceType.Void, 2;
  food;
  :characterStatus(AdeptusTemptationInEffect, :e.targets[0]);
};

/**
 * @id 303302
 * @name 仙跳墙（生效中）
 * @description
 * 本回合中，该角色下一次「元素爆发」造成的伤害+3。
 */
define status {
  id 303302 as private AdeptusTemptationInEffect;
  since "v3.3.0";
  oneDuration;
  once increaseSkillDamage {
    when :( :e.viaSkillType("burst") );
    :e.increaseDamage(3);
  };
};

/**
 * @id 333003
 * @name 莲花酥
 * @description
 * 本回合中，目标角色下次受到的伤害-3。
 * （每回合中每个角色最多食用1次「料理」）
 */
define card {
  id 333003 as LotusFlowerCrisp;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  food;
  :characterStatus(LotusFlowerCrispInEffect, :e.targets[0]);
};

/**
 * @id 303303
 * @name 莲花酥（生效中）
 * @description
 * 本回合中，该角色下次受到的伤害-3。
 */
define status {
  id 303303 as private LotusFlowerCrispInEffect;
  since "v3.3.0";
  tags barrier;
  oneDuration;
  once decreaseDamaged {
    :e.decreaseDamage(3);
  };
};

/**
 * @id 333004
 * @name 北地烟熏鸡
 * @description
 * 本回合中，目标角色下一次「普通攻击」少花费1个无色元素。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333004 as NorthernSmokedChicken;
  since "v3.3.0";
  food;
  :characterStatus(NorthernSmokedChickenInEffect, :e.targets[0]);
};

/**
 * @id 303304
 * @name 北地烟熏鸡（生效中）
 * @description
 * 本回合中，该角色下一次「普通攻击」少花费1个无色元素。
 */
define status {
  id 303304 as private NorthernSmokedChickenInEffect;
  since "v3.3.0";
  oneDuration;
  once deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    :e.deductVoidCost(1);
  };
};

/**
 * @id 333005
 * @name 甜甜花酿鸡
 * @description
 * 治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333005;
  since "v3.3.0";
  food { injuredOnly; };
  :heal(1, :e.targets[0]);
};

/**
 * @id 333006
 * @name 蒙德土豆饼
 * @description
 * 治疗目标角色2点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333006 as MondstadtHashBrown;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  food {
    injuredOnly;
  };
  :heal(2, :e.targets[0]);
};

/**
 * @id 333007
 * @name 烤蘑菇披萨
 * @description
 * 治疗目标角色1点，两回合内结束阶段再治疗此角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333007 as MushroomPizza;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  food {
    injuredOnly;
  };
  :heal(1, :e.targets[0]);
  :characterStatus(MushroomPizzaInEffect, :e.targets[0]);
};

/**
 * @id 303305
 * @name 烤蘑菇披萨（生效中）
 * @description
 * 结束阶段：治疗该角色1点。
 * 可用次数：2
 */
define status {
  id 303305 as private MushroomPizzaInEffect;
  since "v3.3.0";
  duration 2;
  on endPhase {
    :heal(1, :self.master);
  };
};

/**
 * @id 303306
 * @name 兽肉薄荷卷（生效中）
 * @description
 * 角色在本回合结束前，之后3次「普通攻击」都少花费1个无色元素。
 */
define status {
  id 303306 as MintyMeatRollsInEffect;
  since "v3.3.0";
  oneDuration;
  on deductVoidDiceSkill {
    when :( :e.isSkillType("normal") );
    usage 3;
    :e.deductVoidCost(1);
  };
};

/**
 * @id 333008
 * @name 兽肉薄荷卷
 * @description
 * 目标角色在本回合结束前，之后3次「普通攻击」都少花费1个无色元素。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333008 as MintyMeatRolls;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  food;
  :characterStatus(MintyMeatRollsInEffect, :e.targets[0]);
};

/**
 * @id 303307
 * @name 复苏冷却中
 * @description
 * 本回合无法通过「料理」复苏角色。
 */
define combatStatus {
  id 303307 as ReviveOnCooldown;
  oneDuration;
};

/**
 * @id 333009
 * @name 提瓦特煎蛋
 * @description
 * 复苏目标角色，并治疗此角色1点。
 * （每回合中，最多通过「料理」复苏1个角色，并且每个角色最多食用1次「料理」）
 */
define card {
  id 333009 as TeyvatFriedEgg;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  tags food;
  filter :( !:query($.my.combatStatus.def(ReviveOnCooldown)) );
  addTarget $.my.character.onlyDefeated;
  :heal(1, :e.targets[0], { kind: "revive" });
  :characterStatus(Satiated, :e.targets[0]);
  :combatStatus(ReviveOnCooldown);
};

/**
 * @id 333010
 * @name 刺身拼盘
 * @description
 * 目标角色在本回合结束前，「普通攻击」造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333010 as SashimiPlatter;
  since "v3.7.0";
  cost DiceType.Aligned, 1;
  food;
  :characterStatus(SashimiPlatterInEffect, :e.targets[0]);
};

/**
 * @id 303308
 * @name 刺身拼盘（生效中）
 * @description
 * 本回合中，该角色「普通攻击」造成的伤害+1。
 */
define status {
  id 303308 as private SashimiPlatterInEffect;
  since "v3.7.0";
  oneDuration;
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    :e.increaseDamage(1);
  };
};

/**
 * @id 333011
 * @name 唐杜尔烤鸡
 * @description
 * 本回合中，所有我方角色下一次「元素战技」造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333011 as TandooriRoastChicken;
  since "v3.7.0";
  cost DiceType.Void, 2;
  food combat;
  :characterStatus(
    TandooriRoastChickenInEffect,
    $.my.character.intersection($.not($.has($.typeStatus.def(Satiated)))),
  );
};

/**
 * @id 303309
 * @name 唐杜尔烤鸡（生效中）
 * @description
 * 本回合中，该角色下一次「元素战技」造成的伤害+2。
 */
define status {
  id 303309 as private TandooriRoastChickenInEffect;
  since "v3.7.0";
  oneDuration;
  once increaseSkillDamage {
    when :( :e.viaSkillType("elemental") );
    :e.increaseDamage(2);
  };
};

/**
 * @id 333012
 * @name 黄油蟹蟹
 * @description
 * 本回合中，所有我方角色下次受到的伤害-2。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333012 as ButterCrab;
  since "v3.7.0";
  cost DiceType.Void, 2;
  food combat;
  :characterStatus(
    ButterCrabInEffect,
    $.my.character.intersection($.not($.has($.typeStatus.def(Satiated)))),
  );
};

/**
 * @id 303310
 * @name 黄油蟹蟹（生效中）
 * @description
 * 本回合中，该角色下次受到的伤害-2。
 */
define status {
  id 303310 as private ButterCrabInEffect;
  since "v3.7.0";
  tags barrier;
  oneDuration;
  once decreaseDamaged {
    :e.decreaseDamage(2);
  };
};

/**
 * @id 333013
 * @name 炸鱼薯条
 * @description
 * 本回合中，所有我方角色下次使用技能时少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333013 as FishAndChips;
  since "v4.3.0";
  cost DiceType.Void, 2;
  food combat;
  :characterStatus(
    FishAndChipsActive,
    $.my.character.intersection($.not($.has($.typeStatus.def(Satiated)))),
  );
};

/**
 * @id 303311
 * @name 炸鱼薯条（生效中）
 * @description
 * 本回合中，所附属角色下次使用技能时少花费1个元素骰。
 */
define status {
  id 303311 as private FishAndChipsActive;
  since "v4.3.0";
  oneDuration;
  once deductOmniDiceSkill {
    :e.deductOmniCost(1);
  };
};

/**
 * @id 333014
 * @name 松茸酿肉卷
 * @description
 * 治疗目标角色2点，3回合内的结束阶段再治疗此角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333014 as MatsutakeMeatRolls;
  since "v4.4.0";
  cost DiceType.Aligned, 2;
  food {
    injuredOnly;
  };
  :heal(2, :e.targets[0]);
  :characterStatus(MatsutakeMeatRollsInEffect, :e.targets[0]);
};

/**
 * @id 303312
 * @name 松茸酿肉卷（生效中）
 * @description
 * 结束阶段：治疗该角色1点。
 * 可用次数：3
 */
define status {
  id 303312 as private MatsutakeMeatRollsInEffect;
  since "v4.4.0";
  on endPhase {
    usage 3;
    :heal(1, :self.master);
  };
};

/**
 * @id 333015
 * @name 缤纷马卡龙
 * @description
 * 治疗目标角色1点，该角色接下来3次受到伤害后再治疗其1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333015 as RainbowMacarons;
  since "v4.6.0";
  cost DiceType.Void, 2;
  food {
    injuredOnly;
  };
  :heal(1, :e.targets[0]);
  :characterStatus(RainbowMacaronsInEffect, :e.targets[0]);
};

/**
 * @id 303313
 * @name 缤纷马卡龙（生效中）
 * @description
 * 所附属角色受到伤害后：治疗该角色1点。
 * 可用次数：3
 */
define status {
  id 303313 as RainbowMacaronsInEffect;
  since "v4.6.0";
  on damaged {
    usage 3;
    :heal(1, :self.master);
  };
};

/**
 * @id 133085
 * @name 唐社尔烤鸡
 * @description
 * 本回合中，所有我方角色下一次「元素战技」造成的伤害+2。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 133085 as TandooriGrilledChicken; // 骗骗花
  reserved;
};

/**
 * @id 133097
 * @name 甜甜酿花鸡
 * @description
 * 治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 133097 as SweetMaam; // 骗骗花
  reserved;
};

/**
 * @id 133098
 * @name 美味马卡龙
 * @description
 * 治疗目标角色1点，该角色接下来3次受到伤害后再治疗其1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 133098 as DeliciousMacarons; // 骗骗花
  reserved;
};

/**
 * @id 333016
 * @name 龙龙饼干
 * @description
 * 本回合中，目标角色下一次使用「特技」少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333016 as SaurusCrackers;
  since "v5.1.0";
  food;
  :characterStatus(SaurusCrackersInEffect, :e.targets[0]);
};

/**
 * @id 303314
 * @name 龙龙饼干（生效中）
 * @description
 * 本回合中，该角色下一次使用「特技」少花费1个元素骰。
 */
define status {
  id 303314 as private SaurusCrackersInEffect;
  since "v5.1.0";
  oneDuration;
  once deductOmniDiceTechnique {
    :e.deductOmniCost(1);
  };
};

/**
 * @id 333017
 * @name 宝石闪闪
 * @description
 * 目标角色获得1点额外最大生命值。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333017 as GlitteringGemstones;
  since "v5.3.0";
  cost DiceType.Aligned, 1;
  food;
  :increaseMaxHealth(1, :e.targets[0]);
};

/**
 * @id 333018
 * @name 咚咚嘭嘭
 * @description
 * 接下来3次名称不存在于初始牌组中的牌加入我方手牌时，目标我方角色治疗自身1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333018 as PuffPops;
  since "v5.3.0";
  cost DiceType.Aligned, 1;
  food;
  :characterStatus(PuffPopsInEffect, :e.targets[0]);
};

/**
 * @id 303315
 * @name 咚咚嘭嘭（生效中）
 * @description
 * 名称不存在于初始牌组中的牌加入我方手牌时：治疗该角色1点。
 * 可用次数：3
 */
define status {
  id 303315 as PuffPopsInEffect;
  since "v5.3.0";
  on handCardInserted {
    when :( !:isInInitialPile(:e.card) );
    usage 3;
    :heal(1, :self.master);
  };
};

/**
 * @id 333019
 * @name 温泉时光
 * @description
 * 治疗目标，其数值等同于我方场上召唤物的数量。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333019 as HotSpringOclock;
  since "v5.4.0";
  cost DiceType.Aligned, 1;
  food {
    injuredOnly;
  };
  :heal(:queryAll($.my.summon).length, :e.targets[0]);
};

/**
 * @id 333021
 * @name 奇瑰之汤·疗愈
 * @description
 * 治疗目标角色2点。
 */
define card {
  id 333021 as MystiqueSoupHealing;
  since "v5.5.0";
  food;
  undiscoverable;
  :heal(2, :e.targets[0]);
};

/**
 * @id 333022
 * @name 奇瑰之汤·助佑
 * @description
 * 本回合中，目标角色下次使用技能时少花费2个元素骰。
 */
define card {
  id 333022 as MystiqueSoupProvidence;
  since "v5.5.0";
  food;
  undiscoverable;
  :characterStatus(MystiqueSoupProvidenceInEffect, :e.targets[0]);
};

/**
 * @id 303317
 * @name 奇瑰之汤·助佑（生效中）
 * @description
 * 本回合中，该角色下次使用技能时少花费2个元素骰。
 */
define status {
  id 303317 as private MystiqueSoupProvidenceInEffect;
  since "v5.5.0";
  oneDuration;
  once deductOmniDiceSkill {
    :e.deductOmniCost(2);
  };
};

/**
 * @id 303318
 * @name 奇瑰之汤·激愤（生效中）
 * @description
 * 本回合中，该角色下一次造成的伤害+1。
 * 可用次数：2
 */
define status {
  id 303318 as MystiqueSoupFuryInEffect;
  oneDuration;
  on increaseSkillDamage {
    usage 2;
    :e.increaseDamage(1);
  };
};

/**
 * @id 333023
 * @name 奇瑰之汤·激愤
 * @description
 * 本回合中，目标角色下次造成的伤害+1。（最多生效2次）
 */
define card {
  id 333023 as MystiqueSoupFury;
  since "v5.5.0";
  food;
  undiscoverable;
  :characterStatus(MystiqueSoupFuryInEffect, :e.targets[0]);
};

/**
 * @id 333024
 * @name 奇瑰之汤·宁静
 * @description
 * 本回合中，目标角色下次受到的伤害-2。
 */
define card {
  id 333024 as MystiqueSoupSerenity;
  since "v5.5.0";
  food;
  undiscoverable;
  :characterStatus(MystiqueSoupSerenityInEffect, :e.targets[0]);
};

/**
 * @id 303319
 * @name 奇瑰之汤·宁静（生效中）
 * @description
 * 本回合中，该角色下次受到的伤害-2。
 */
define status {
  id 303319 as private MystiqueSoupSerenityInEffect;
  since "v5.5.0";
  tags barrier;
  oneDuration;
  once decreaseDamaged {
    :e.decreaseDamage(2);
  };
};

/**
 * @id 333025
 * @name 奇瑰之汤·安神
 * @description
 * 本回合中，目标我方角色受到的伤害-1。（最多生效3次）
 */
define card {
  id 333025 as MystiqueSoupSoothing;
  since "v5.5.0";
  food;
  undiscoverable;
  :characterStatus(MystiqueSoupSoothingInEffect, :e.targets[0]);
};

/**
 * @id 303320
 * @name 奇瑰之汤·安神（生效中）
 * @description
 * 本回合中，该我方角色受到的伤害-1。
 * 可用次数：3
 */
define status {
  id 303320 as private MystiqueSoupSoothingInEffect;
  since "v5.5.0";
  tags barrier;
  oneDuration;
  on decreaseDamaged {
    usage 3;
    :e.decreaseDamage(1);
  };
};

/**
 * @id 333026
 * @name 奇瑰之汤·鼓舞
 * @description
 * 目标角色获得1点额外最大生命值。
 */
define card {
  id 333026 as MystiqueSoupInspiration;
  since "v5.5.0";
  food;
  undiscoverable;
  :increaseMaxHealth(1, :e.targets[0]);
};

/**
 * @id 333020
 * @name 奇瑰之汤
 * @description
 * 从3个随机效果中挑选1个，对目标角色生效。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333020 as MystiqueSoup;
  since "v5.5.0";
  cost DiceType.Aligned, 1;
  food {
    noSatiated;
  };
  const allCards = [
    MystiqueSoupHealing,
    MystiqueSoupProvidence,
    MystiqueSoupFury,
    MystiqueSoupSerenity,
    MystiqueSoupSoothing,
    MystiqueSoupInspiration,
  ];
  const candidates = :randomSubset(allCards, 3);
  :selectAndPlay(candidates, :e.targets[0]);
};

/**
 * @id 333027
 * @name 纵声欢唱
 * @description
 * 所有我方角色获得饱腹，抓2张牌，下2次切换角色少花费1个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333027 as SingYourHeartOut;
  since "v5.6.0";
  cost DiceType.Void, 3;
  food combat {
    satiatedFilter "allNot";
  };
  :drawCards(2);
  :combatStatus(SingYourHeartOutInEffect);
};

/**
 * @id 303321
 * @name 纵声欢唱（生效中）
 * @description
 * 下次切换角色少花费1个无色元素。
 */
define combatStatus {
  id 303321 as SingYourHeartOutInEffect;
  since "v5.6.0";
  on deductOmniDiceSwitch {
    usage 2;
    :e.deductOmniCost(1);
  };
};

/**
 * @id 333028
 * @name 丰稔之赐
 * @description
 * 治疗目标角色1点，目标角色之后2次准备技能时：治疗自身1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333028 as HarvestsBoon;
  since "v5.7.0";
  cost DiceType.Aligned, 1;
  food;
  :heal(1, :e.targets[0]);
  :characterStatus(HarvestsBoonInEffect, :e.targets[0]);
};

/**
 * @id 303322
 * @name 丰稔之赐（生效中）
 * @description
 * 该角色准备技能时：治疗自身1点。
 * 可用次数：2
 */
define status {
  id 303322 as private HarvestsBoonInEffect;
  since "v5.7.0";
  on enterRelative {
    when :(
      :e.entity.definition.type === "status" &&
        :e.entity.definition.tags.includes("preparingSkill")
    );
    usage 2;
    :heal(1, :self.master);
  };
};

/**
 * @id 333029
 * @name 沉玉茶露
 * @description
 * 选择1个我方角色，我方下2次冒险或结束阶段时，治疗目标角色1点。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333029 as ChenyuBrew;
  since "v6.1.0";
  food;
  :characterStatus(ChenyuBrewInEffect, :e.targets[0]);
};

/**
 * @id 303323
 * @name 沉玉茶露（生效中）
 * @description
 * 我方下2次冒险或结束阶段时，治疗所附属角色1点。
 */
define status {
  id 303323 as private ChenyuBrewInEffect;
  since "v6.1.0";
  usage 2;
  on adventure {
    :heal(1, :self.master);
    :consumeUsage();
  };
  on endPhase {
    :heal(1, :self.master);
    :consumeUsage();
  };
};

/**
 * @id 333030
 * @name 转盘特调
 * @description
 * 目标角色获得4次随机增益效果，其中效果如下：
 * 治疗目标角色2点。
 * 目标角色获得1点额外最大生命值。
 * 目标角色下次使用技能少花费1个元素骰。
 * 目标角色下次造成的伤害+1。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333030 as RouletteSpecial;
  since "v6.6.0";
  cost DiceType.Aligned, 4;
  food;
  :abortPreview();
  const target = :e.targets[0];
  const effects = [
    () => (:heal(2, target)),
    () => (:increaseMaxHealth(1, target)),
    () => (:characterStatus(BattlePlan, target)),
    () => (:characterStatus(SharpenTheBlade, target)),
  ];
  for (let i = 0; i < 4; i++) {
    const effect = :random(effects);
    effect();
  }
};

/**
 * @id 303324
 * @name 白灵果派（生效中）
 * @description
 * 本回合所附属角色使用技能少花费2个元素骰。
 * 可用次数：2
 */
define status {
  id 303324 as LakkaberryPieInEffect;
  oneDuration;
  on deductOmniDiceSkill {
    usage 2;
    :e.deductOmniCost(2);
  };
};

/**
 * @id 333031
 * @name 白灵果派
 * @description
 * 本回合目标角色下2次使用技能少花费2个元素骰。
 * （每回合每个角色最多食用1次「料理」）
 */
define card {
  id 333031 as LakkaberryPie;
  since "v6.7.0";
  cost DiceType.Aligned, 4;
  food;
  :characterStatus(LakkaberryPieInEffect, :e.targets[0]);
};
