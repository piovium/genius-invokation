import {
  DamageType,
  DiceType,
  type SkillHandle,
  type PassiveSkillHandle,
  type StatusHandle,
  type CombatStatusHandle,
} from "#custom-data-loader";

// 水丘丘相关

const WhirlingScythe = 22051 as SkillHandle;
const SlashOfSurgingTides = 22052 as SkillHandle;
const BubblefloatBlitz = 22053 as SkillHandle;
const SlashOfSurgingTidesPassive = 22054 as PassiveSkillHandle;

// 雷莹相关

const SurgingThunder = 24044 as SkillHandle;
const HurtlingBolts = 24041 as SkillHandle;
const MistyCall = 24042 as SkillHandle;
const SurgingThunderStatus = 124043 as StatusHandle;
const ElectroCicinShield = 124042 as CombatStatusHandle;

/**
 * @id 2205
 * @name 丘丘水行游侠
 * @hp 10
 * @energy 2
 * @description
 * 不属于任何部族的丘丘人流浪者，如同自我流放一般在荒野中四处漫游。
 */
define character {
  id 2205 as HydroHilichurlRogue;
  tags hydro, monster, hilichurl;
  health 10;
  energy 2;
  skills WhirlingScythe,
    SlashOfSurgingTides,
    BubblefloatBlitz,
    SlashOfSurgingTidesPassive;
};

/**
 * @id 2404
 * @name 愚人众·雷萤术士
 * @hp 10
 * @energy 3
 * @description
 * …正如雾虚草的气味会令雷萤迷醉，嗜虐的术士也贪恋着戏弄对手的快感…
 */
define character {
  id 2404 as FatuiElectroCicinMage;
  tags electro, fatui;
  health 10;
  energy 3;
  skills HurtlingBolts, MistyCall, ThunderingShield, SurgingThunder;
};

// 能量消耗改动
/**
 * @id 24043
 * @name 霆雷之护
 * @cost 3*Electro, 3*Energy
 * @description
 * 造成1点雷元素伤害，本角色附着雷元素，生成雷萤护罩并准备技能：霆电迸发。
 */
define skill {
  id 24043 as ThunderingShield;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Electro, 1);
  :apply(DamageType.Electro, :self);
  :combatStatus(ElectroCicinShield);
  :characterStatus(SurgingThunderStatus);
};

// 删去了舍弃触发
/**
 * @id 16075
 * @name 云堇长枪开相计数
 * @cost
 * @description
 *
 */
define skill {
  id 16075 as CountDiscardOrTune;
  skillType passive {
    variable discardOrTuneCardCount, 0;
    on discardOrTuneCard {
      when :( :e.isTuning() );
      :variables.discardOrTuneCardCount! += 1;
    };
    on roundEnd {
      :variables.discardOrTuneCardCount = 0;
    };
  };
};
