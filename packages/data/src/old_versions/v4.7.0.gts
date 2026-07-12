import { Aura, type CardHandle, DamageType, DiceType, card, combatStatus, skill, status, summon } from "@gi-tcg/core/builder";
import { BonecrunchersEnergyBlockCombatStatus } from "../cards/event/other.gts";
import { Cyno } from "../characters/electro/cyno.gts";
import { LightningRoseSummon } from "../characters/electro/lisa.gts";
import { DominusLapidisStrikingStone, Zhongli } from "../characters/geo/zhongli.gts";
import { AutumnWhirlwind } from "../characters/anemo/kaedehara_kazuha.gts";
import { AbiogenesisSolarIsotoma, Albedo } from "../characters/geo/albedo.gts";
import { DecorousHarmony } from "../characters/geo/yun_jin.gts";
import { DendroCore } from "../commons.gts";
import { BountifulCore } from "../characters/hydro/nilou.gts";
import { TheArtOfBudgeting, TheArtOfBudgetingInEffect, ShouldTriggerTalent } from "../characters/dendro/kaveh.gts";
import { AnomalousAnatomy, LightlessFeeding } from "../characters/hydro/alldevouring_narwhal.gts";

/**
 * @id 124051
 * @name 噬骸能量块
 * @description
 * 随机舍弃1张原本元素骰费用最高的手牌，生成1个我方出战角色类型的元素骰。如果我方出战角色是「圣骸兽」角色，则使其获得1点充能。（每回合最多打出1张）
 */
define card {
  id 124051 as private BonecrunchersEnergyBlock;
  until "v4.7.0";
  undiscoverable;
  filter :( !:$(`my combat status with definition id ${BonecrunchersEnergyBlockCombatStatus}`) );
  :disposeMaxCostHands(1);
  const activeCh = :$("my active")!;
  :generateDice(activeCh.element(), 1);
  if (activeCh.definition.tags.includes("sacread")) {
    :gainEnergy(1, activeCh);
  }
  :combatStatus(BonecrunchersEnergyBlockCombatStatus)
}

/**
 * @id 25032
 * @name 盘绕风引
 * @description
 * 造成2点风元素伤害，抓1张噬骸能量块；然后，手牌中每有1张噬骸能量块，抓1张牌（每回合最多抓2张)。
 */
define skill {
  id 25032 as private SwirlingSquall;
  until "v4.7.0";
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 2);
  :drawCards(1, { withDefinition: BonecrunchersEnergyBlock });
  const cards = :player.hands.filter((card) => card.definition.id === BonecrunchersEnergyBlock);
  const drawn = :self.getVariable("elementalSkillDrawCardsCount");
  const count = Math.min(cards.length, 2 - drawn);
  :drawCards(count);
  :self.addVariable("elementalSkillDrawCardsCount", count);
}

/**
 * @id 116073
 * @name 飞云旗阵
 * @description
 * 我方角色进行普通攻击时：造成的伤害+1。
 * 如果我方手牌数量不多于1，则此技能少花费1个元素骰。
 * 可用次数：1（可叠加，最多叠加到4次）
 */
define combatStatus {
  id 116073 as private FlyingCloudFlagFormation;
  until "v4.7.0";
  on deductOmniDiceSkill {
    when :( :e.isSkillType("normal") && :player.hands.length <= 1 );
    :e.deductOmniCost(1);
  }
  on increaseSkillDamage {
    when :( :e.viaSkillType("normal") );
    usage 1 {
      append 4;
    };
    if (:$(`my equipment with definition id ${DecorousHarmony}`) && :player.hands.length === 0) {
      :e.increaseDamage(3);
    } else {
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 117082
 * @name 迸发扫描
 * @description
 * 双方选择行动前：如果我方场上存在草原核或丰穰之核，则使其可用次数-1，并舍弃我方牌库顶的1张卡牌。然后，造成所舍弃卡牌原本元素骰费用+1的草元素伤害。
 * 可用次数：1（可叠加，最多叠加到3次）
 */
define combatStatus {
  id 117082 as private BurstScan;
  until "v4.7.0";
  on beforeAction {
    when :( :$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`) );
    listenTo all;
    :disposeCard(:player.pile[0]);
  }
  on disposeCard {
    when :( :e.via?.caller.id === :self.id );
    usage 1 {
      append 3;
    };
    :$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`)?.consumeUsage(1);
    const cost = :e.entity.diceCost();
    :damage(DamageType.Dendro, cost + 1);
    :emitCustomEvent(ShouldTriggerTalent, :e.entity.latest());
  }
}

/**
 * @id 22042
 * @name 迸落星雨
 * @description
 * 造成1点水元素伤害，此角色每有3点无尽食欲提供的额外最大生命，此伤害+1（最多+5）。然后舍弃1张原本元素骰费用最高的手牌。
 */
define skill {
  id 22042 as private StarfallShower;
  until "v4.7.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  const st = :self.hasStatus(AnomalousAnatomy);
  const extraDmg = st ? Math.min(Math.floor(st.getVariable("extraMaxHealth") / 3), 5) : 0;
  :damage(DamageType.Hydro, 1 + extraDmg);
  const [card] = :disposeMaxCostHands(1);
  if (card) {
    if (:self.hasEquipment(LightlessFeeding)) {
      :heal(card.diceCost(), "@self");
    }
  }
}

/**
 * @id 14093
 * @name 蔷薇的雷光
 * @description
 * 造成2点雷元素伤害，召唤蔷薇雷光。
 */
define skill {
  id 14093 as private LightningRose;
  until "v4.7.0";
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 2);
  :summon(LightningRoseSummon);
}

/**
 * @id 115051
 * @name 乱岚拨止
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为风元素伤害，且伤害+1。
 * 角色使用技能后：移除此效果。
 */
define status {
  id 115051 as private MidareRanzan;
  until "v4.7.0";
  on modifySkillDamageType {
    when :( :e.viaPlungingAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Anemo);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(1);
  }
  on useSkill {
    :dispose();
  }
}

/**
 * @id 115053
 * @name 乱岚拨止·冰
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为冰元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
define status {
  id 115053 as private MidareRanzanCryo;
  until "v4.7.0";
  on modifySkillDamageType {
    when :( :e.viaPlungingAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Cryo);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(1);
  }
  on useSkill {
    :dispose();
  }
}

/**
 * @id 115056
 * @name 乱岚拨止·雷
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为雷元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
define status {
  id 115056 as private MidareRanzanElectro;
  until "v4.7.0";
  on modifySkillDamageType {
    when :( :e.viaPlungingAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(1);
  }
  on useSkill {
    :dispose();
  }
}

/**
 * @id 115054
 * @name 乱岚拨止·水
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为水元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
define status {
  id 115054 as private MidareRanzanHydro;
  until "v4.7.0";
  on modifySkillDamageType {
    when :( :e.viaPlungingAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Hydro);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(1);
  }
  on useSkill {
    :dispose();
  }
}

/**
 * @id 115055
 * @name 乱岚拨止·火
 * @description
 * 所附属角色进行下落攻击时：造成的物理伤害变为火元素伤害，且伤害+1。
 * 所附属角色使用技能后：移除此效果。
 */
define status {
  id 115055 as private MidareRanzanPyro;
  until "v4.7.0";
  on modifySkillDamageType {
    when :( :e.viaPlungingAttack() && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Pyro);
  }
  on increaseSkillDamage {
    when :( :e.viaPlungingAttack() );
    :e.increaseDamage(1);
  }
  on useSkill {
    :dispose();
  }
}
  
/**
 * @id 15052
 * @name 千早振
 * @description
 * 造成3点风元素伤害，本角色附属乱岚拨止。
 * 如果此技能引发了扩散，则将乱岚拨止转换为被扩散的元素。
 * 此技能结算后：我方切换到后一个角色。
 */
define skill {
  id 15052 as private Chihayaburu;
  until "v4.7.0";
  skillType elemental;
  cost DiceType.Anemo, 3;
  const aura = :$("opp active")?.aura;
  let midareRanzan;
  switch (aura) {
    case Aura.Cryo:
    case Aura.CryoDendro:
      midareRanzan = MidareRanzanCryo;
      break;
    case Aura.Electro:
      midareRanzan = MidareRanzanElectro;
      break;
    case Aura.Hydro:
      midareRanzan = MidareRanzanHydro;
      break;
    case Aura.Pyro:
      midareRanzan = MidareRanzanPyro;
      break;
    default:
      midareRanzan = MidareRanzan;
      break;
  }
  :characterStatus(midareRanzan);
  :damage(DamageType.Anemo, 3);
}

/**
 * @id 15053
 * @name 万叶之一刀
 * @description
 * 造成3点风元素伤害，召唤流风秋野。
 */
define skill {
  id 15053 as private KazuhaSlash;
  until "v4.7.0";
  skillType burst;
  cost DiceType.Anemo, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Anemo, 3);
  :summon(AutumnWhirlwind);
}

/**
 * @id 116041
 * @name 阳华
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：3
 * 此召唤物在场时：我方角色进行下落攻击时少花费1个无色元素。（每回合1次）
 */
define summon {
  id 116041 as private SolarIsotoma;
  until "v4.7.0";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 3;
    :damage(DamageType.Geo, 1);
  }
  on deductVoidDiceSkill {
    when :( :e.isPlungingAttack() );
    usage perRound, 1;
    :e.deductVoidCost(1);
  }
}

/**
 * @id 216041
 * @name 神性之陨
 * @description
 * 战斗行动：我方出战角色为阿贝多时，装备此牌。
 * 阿贝多装备此牌后，立刻使用一次创生法·拟造阳华。
 * 装备有此牌的阿贝多在场时，如果我方场上存在阳华，则我方角色进行下落攻击时造成的伤害+1。
 * （牌组中包含阿贝多，才能加入牌组）
 */
define card {
  id 216041 as private DescentOfDivinity;
  until "v4.7.0";
  cost DiceType.Geo, 3;
  talent Albedo {
    on enter {
      :useSkill(AbiogenesisSolarIsotoma);
    }
    on increaseSkillDamage {
      when :( :$(`my summons with definition id ${SolarIsotoma}`) &&
          :e.viaPlungingAttack() );
      listenTo samePlayer;
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 216031
 * @name 炊金馔玉
 * @description
 * 战斗行动：我方出战角色为钟离时，装备此牌。
 * 钟离装备此牌后，立刻使用一次地心·磐礴。
 * 我方出战角色在护盾角色状态或护盾出战状态的保护下时，我方召唤物造成的岩元素伤害+1。
 * （牌组中包含钟离，才能加入牌组）
 */
define card {
  id 216031 as private DominanceOfEarth;
  until "v4.7.0";
  cost DiceType.Geo, 5;
  talent Zhongli {
    on enter {
      :useSkill(DominusLapidisStrikingStone);
    }
    on increaseDamage {
      when :{
        return :e.type === DamageType.Geo &&
          :e.source.definition.type === "summon" &&
          !!:$(`(my combat status with tag (shield)) or (status with tag (shield) at my active)`);
      };
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 114041
 * @name 启途誓使
 * @description
 * 结束阶段：累积1级「凭依」。
 * 根据「凭依」级数，提供效果：
 * 大于等于2级：物理伤害转化为雷元素伤害；
 * 大于等于4级：造成的伤害+2；
 * 大于等于6级时：「凭依」级数-4。
 */
define status {
  id 114041 as private PactswornPathclearer;
  until "v4.7.0";
  variable reliance, 0;
  on endPhase {
    const newVal = :getVariable("reliance") + 1;
    if (newVal >= 6) {
      :setVariable("reliance", newVal - 4);
    } else {
      :setVariable("reliance", newVal);
    }
  }
  on modifySkillDamageType {
    when :( :getVariable("reliance") >= 2 && :e.type === DamageType.Physical );
    :e.changeDamageType(DamageType.Electro);
  }
  on increaseSkillDamage {
    when :( :getVariable("reliance") >= 4 );
    :e.increaseDamage(2);
  }
}

/**
 * @id 14042
 * @name 秘仪·律渊渡魂
 * @description
 * 造成3点雷元素伤害。
 */
define skill {
  id 14042 as private SecretRiteChasmicSoulfarer;
  until "v4.7.0";
  skillType elemental;
  cost DiceType.Electro, 3;
  :damage(DamageType.Electro, 3);
}

/**
 * @id 14043
 * @name 圣仪·煟煌随狼行
 * @description
 * 造成4点雷元素伤害，
 * 启途誓使的「凭依」级数+2。
 */
define skill {
  id 14043 as private SacredRiteWolfsSwiftness;
  until "v4.7.0";
  skillType burst;
  cost DiceType.Electro, 4;
  cost DiceType.Energy, 2;
  :damage(DamageType.Electro, 4);
  const status = :self.hasStatus(PactswornPathclearer)!;
  const newVal = :getVariable("reliance", status) + 2;
  if (newVal >= 6) {
    :setVariable("reliance", newVal - 4, status);
  } else {
    :setVariable("reliance", newVal, status);
  }
}

/**
 * @id 214041
 * @name 落羽的裁择
 * @description
 * 战斗行动：我方出战角色为赛诺时，装备此牌。
 * 赛诺装备此牌后，立刻使用一次秘仪·律渊渡魂。
 * 装备有此牌的赛诺在启途誓使的「凭依」级数为偶数时，使用秘仪·律渊渡魂造成的伤害+1。
 * （牌组中包含赛诺，才能加入牌组）
 */
define card {
  id 214041 as private FeatherfallJudgment;
  until "v4.7.0";
  cost DiceType.Electro, 3;
  talent Cyno {
    on enter {
      :useSkill(SecretRiteChasmicSoulfarer);
    }
    on increaseSkillDamage {
      when :{
        const status = :self.master.hasStatus(PactswornPathclearer)!;
        return :getVariable("reliance", status) % 2 === 0 && :e.via.definition.id === SecretRiteChasmicSoulfarer;
      };
      :e.increaseDamage(1);
    }
  }
}

/**
 * @id 122021
 * @name 水光破镜
 * @description
 * 所附属角色受到的水元素伤害+1。
 * 持续回合：2
 * （同一方场上最多存在一个此状态）
 */
define status {
  id 122021 as private Refraction;
  until "v4.7.0";
  conflictWith crossCharacter, 122022;
  duration 2;
  on increaseDamaged {
    when :( :e.type === DamageType.Hydro );
    :e.increaseDamage(1);
  }
}

/**
 * @id 332026
 * @name 坍陷与契机
 * @description
 * 我方至少剩余8个元素骰，且对方未宣布结束时，才能打出：本回合中，双方牌手进行「切换角色」行动时需要额外花费1个元素骰。
 */
const [FallsAndFortune] = card(332026)
  .until("v4.7.0")
  .costSame(1)
  .filter((c) => c.player.dice.length >= 8 && !c.oppPlayer.declaredEnd)
  .toCombatStatus(303226)
  .oneDuration()
  .on("addDice", (c, e) => e.action.type === "switchActive")
  .listenToAll()
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 303230
 * @name 海底宝藏
 * @description
 * 治疗我方出战角色1点，生成1个随机基础元素骰。
 */
define card {
  id 303230 as private UnderseaTreasure;
  until "v4.7.0";
  :heal(1, "my active");
  :generateDice("randomElement", 1);
}

/**
 * @id 332024
 * @name 琴音之诗
 * @description
 * 将一个我方角色所装备的「圣遗物」返回手牌。
 * 本回合中，我方下次打出「圣遗物」手牌时：少花费2个元素骰。
 */
const [Lyresong] = card(332024)
  .until("v4.7.0")
  .addTarget("my character has equipment with tag (artifact)")
  .do((c, e) => {
    e.targets[0].unequipArtifact();
  })
  .toCombatStatus(303224)
  .oneDuration()
  .once("deductOmniDiceCard", (c, e) => e.hasCardTag("artifact"))
  .deductOmniCost(2)
  .done();

/**
 * @id 323007
 * @name 流明石触媒
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
define card {
  id 323007 as private LumenstoneAdjuvant;
  until "v4.7.0";
  cost DiceType.Aligned, 2;
  support item {
    variable playedCard, 0 {
      visible false;
    };
    replaceDescription "[GCG_TOKEN_COUNTER]", ((st, self) => self.variables.playedCard);
    on playCard {
      when :( :e.card.id !== :self.id );
      :addVariable("playedCard", 1);
    }
    on playCard {
      when :( :getVariable("playedCard") === 3 );
      usage perRound, 1;
      usage 3;
      :drawCards(1);
      :generateDice(DiceType.Omni, 1);
    }
    on actionPhase {
      :setVariable("playedCard", 0);
    }
  }
}

/**
 * @id 321004
 * @name 晨曦酒庄
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。（每回合1次）
 */
define card {
  id 321004 as private DawnWinery;
  until "v4.7.0";
  cost DiceType.Aligned, 2;
  support place {
    on deductOmniDiceSwitch {
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 323008
 * @name 苦舍桓
 * @description
 * 行动阶段开始时：舍弃最多2张元素骰费用最高的手牌，每舍弃1张，此牌就累积1点「记忆和梦」。（最多2点）
 * 我方角色使用技能时：如果我方本回合未打出过行动牌，则消耗1点「记忆和梦」，以使此技能少花费1个元素骰。
 */
define card {
  id 323008 as private Kusava;
  until "v4.7.0";
  support item {
    variable memory, 0;
    variable cardPlayed, 0 {
      visible false;
    };
    on actionPhase {
      const memory = :getVariable("memory");
      if (memory < 2) {
        const disposed = :disposeMaxCostHands(2 - memory);
        const count = disposed.length;
        :addVariableWithMax("memory", count, 2);
      }
      :setVariable("cardPlayed", 0);
    }
    on playCard {
      :setVariable("cardPlayed", 1);
    }
    on deductOmniDiceSkill {
      when :( !:getVariable("cardPlayed") && :getVariable("memory") > 0 );
      :e.deductOmniCost(1);
      :addVariable("memory", -1);
    }
  }
}
