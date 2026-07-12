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

import { type EntityDefinition, type CardHandle, DamageType, DiceType, Reaction, card, combatStatus, extension, status, summon, originalDiceCostOfCard, $, type CombatStatusHandle } from "@gi-tcg/core/builder";
import { BurningFlame, CatalyzingField, CostReduction, DendroCore, EfficientSwitch, Empowerment, ResistantForm, Shield } from "../../commons.gts";
import { BountifulCore } from "../../characters/hydro/nilou.gts";

/**
 * @id 303211
 * @name 冰箭丘丘人
 * @description
 * 结束阶段：造成1点冰元素伤害。
 * 可用次数：2
 */
define summon {
  id 303211 as CryoHilichurlShooter;
  hint DamageType.Cryo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Cryo, 1);
  }
}

/**
 * @id 303212
 * @name 水丘丘萨满
 * @description
 * 结束阶段：造成1点水元素伤害。
 * 可用次数：2
 */
define summon {
  id 303212 as HydroSamachurl;
  hint DamageType.Hydro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Hydro, 1);
  }
}


/**
 * @id 303213
 * @name 冲锋丘丘人
 * @description
 * 结束阶段：造成1点火元素伤害。
 * 可用次数：2
 */
define summon {
  id 303213 as HilichurlBerserker;
  hint DamageType.Pyro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Pyro, 1);
  }
}

/**
 * @id 303214
 * @name 雷箭丘丘人
 * @description
 * 结束阶段：造成1点雷元素伤害。
 * 可用次数：2
 */
define summon {
  id 303214 as ElectroHilichurlShooter;
  hint DamageType.Electro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Electro, 1);
  }
}

/**
 * @id 303216
 * @name 愚人众伏兵·冰萤术士
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点冰元素伤害。（每回合1次）
 * 可用次数：2
 */
define combatStatus {
  id 303216 as FatuiAmbusherCryoCicinMage;
  on useSkill {
    usage 2;
    usage perRound, 1;
    :damage(DamageType.Cryo, 1, "my active");
  }
}

/**
 * @id 303217
 * @name 愚人众伏兵·藏镜仕女
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点水元素伤害。（每回合1次）
 * 可用次数：2
 */
define combatStatus {
  id 303217 as FatuiAmbusherMirrorMaiden;
  on useSkill {
    usage 2;
    usage perRound, 1;
    :damage(DamageType.Hydro, 1, "my active");
  }
}

/**
 * @id 303218
 * @name 愚人众伏兵·火铳游击兵
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点火元素伤害。（每回合1次）
 * 可用次数：2
 */
define combatStatus {
  id 303218 as FatuiAmbusherPyroslingerBracer;
  on useSkill {
    usage 2;
    usage perRound, 1;
    :damage(DamageType.Pyro, 1, "my active");
  }
}

/**
 * @id 303219
 * @name 愚人众伏兵·雷锤前锋军
 * @description
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点雷元素伤害。（每回合1次）
 * 可用次数：2
 */
define combatStatus {
  id 303219 as FatuiAmbusherElectrohammerVanguard;
  on useSkill {
    usage 2;
    usage perRound, 1;
    :damage(DamageType.Electro, 1, "my active");
  }
}

/**
 * @id 331102
 * @name 元素共鸣：粉碎之冰
 * @description
 * 本回合中，我方当前出战角色下一次造成的伤害+2。
 * （牌组包含至少2个冰元素角色，才能加入牌组）
 */
export const [ElementalResonanceShatteringIce] = card(331102)
  .since("v3.3.0")
  .costCryo(1)
  .tags("resonance")
  .toStatus(303112, "my active")
  .oneDuration()
  .once("increaseSkillDamage")
  .increaseDamage(2)
  .done();

/**
 * @id 331202
 * @name 元素共鸣：愈疗之水
 * @description
 * 治疗我方出战角色2点。然后，治疗所有我方后台角色1点。
 * （牌组包含至少2个水元素角色，才能加入牌组）
 */
define card {
  id 331202 as ElementalResonanceSoothingWater;
  since "v3.3.0";
  cost DiceType.Hydro, 1;
  tags resonance;
  filter :( :$(`my characters with health < maxHealth`) );
  :heal(2, "my active");
  :heal(1, "my standby");
}

/**
 * @id 331302
 * @name 元素共鸣：热诚之火
 * @description
 * 本回合中，我方当前出战角色下一次引发火元素相关反应时，造成的伤害+3。
 * （牌组包含至少2个火元素角色，才能加入牌组）
 */
export const [ElementalResonanceFerventFlames] = card(331302)
  .since("v3.3.0")
  .costPyro(1)
  .tags("resonance")
  .toStatus(303132, "my active")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.isReactionRelatedTo(DamageType.Pyro))
  .increaseDamage(3)
  .done();

/**
 * @id 331402
 * @name 元素共鸣：强能之雷
 * @description
 * 我方出战角色和下一名充能未满的角色获得1点充能。
 * （牌组包含至少2个雷元素角色，才能加入牌组）
 */
define card {
  id 331402 as ElementalResonanceHighVoltage;
  since "v3.3.0";
  cost DiceType.Electro, 1;
  tags resonance;
  filter :( :$(`my characters with energy < maxEnergy`) );
  :gainEnergy(1, "my active");
  :gainEnergy(1, "my standby character with energy < maxEnergy limit 1");
}

/**
 * @id 303133
 * @name 元素共鸣：迅捷之风（生效中）
 * @description
 * 我方下次执行「切换角色」行动时：少花费1个元素骰。
 */
define combatStatus {
  id 303133 as ElementalResonanceImpetuousWindsInEffect01;
  once deductOmniDiceSwitch {
    :e.deductOmniCost(1);
  }
}

/**
 * @id 303136
 * @name 元素共鸣：迅捷之风（生效中）
 * @description
 * 我方下次执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。
 */
define combatStatus {
  id 303136 as ElementalResonanceImpetuousWindsInEffect03;
  once beforeFastSwitch {
    :e.setFastAction();
  }
}

/**
 * @id 303134
 * @name 元素共鸣：迅捷之风（生效中）
 * @description
 * 我方下次触发扩散反应时对目标以外的所有敌方角色造成的伤害+1。
 */
define combatStatus {
  id 303134 as ElementalResonanceImpetuousWindsInEffect02;
  on increaseDamage {
    when :( (
        ([
          Reaction.SwirlCryo, 
          Reaction.SwirlElectro, 
          Reaction.SwirlHydro, 
          Reaction.SwirlPyro
        ] as (Reaction | null)[]).includes(:e.damageInfo.fromReaction)) &&
        !:e.target.isMine() );
    :e.increaseDamage(1);
  }
  on reaction {
    when :( :e.reactionInfo.fromDamage && 
        :e.reactionInfo.fromDamage.source.who === :self.who &&
        :e.relatedTo(DamageType.Anemo) );
    listenTo all;
    :dispose();
  }
}

/**
 * @id 331502
 * @name 元素共鸣：迅捷之风
 * @description
 * 我方下次执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。
 * 我方下次触发扩散反应时对目标以外的所有敌方角色造成的伤害+1。
 * （牌组包含至少2个风元素角色，才能加入牌组）
 */
define card {
  id 331502 as ElementalResonanceImpetuousWinds;
  since "v3.3.0";
  cost DiceType.Anemo, 1;
  tags resonance;
  :combatStatus(ElementalResonanceImpetuousWindsInEffect01);
  :combatStatus(ElementalResonanceImpetuousWindsInEffect02);
  :combatStatus(ElementalResonanceImpetuousWindsInEffect03);
}

/**
 * @id 303162
 * @name 护盾
 * @description
 * 为我方出战角色提供3点护盾。
 */
define combatStatus {
  id 303162 as ResonanceShield;
  shield 3;
}

/**
 * @id 331602
 * @name 元素共鸣：坚定之岩
 * @description
 * 为我方出战角色提供3点护盾。
 * （牌组包含至少2个岩元素角色，才能加入牌组）
 */
define card {
  id 331602 as ElementalResonanceEnduringRock;
  since "v3.3.0";
  cost DiceType.Geo, 1;
  tags resonance;
  :combatStatus(ResonanceShield);
}

/**
 * @id 331702
 * @name 元素共鸣：蔓生之草
 * @description
 * 若我方场上存在燃烧烈焰/草原核或丰穰之核/激化领域，则对对方出战角色造成1点火元素伤害/水元素伤害/雷元素伤害。
 * （牌组包含至少2个草元素角色，才能加入牌组）
 */
define card {
  id 331702 as ElementalResonanceSprawlingGreenery;
  since "v3.3.0";
  cost DiceType.Dendro, 1;
  tags resonance;
  filter :( :$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore} or my combat status with definition id ${CatalyzingField} or my summon with definition id ${BurningFlame}`) );
  if (:$(`my combat status with definition id ${DendroCore} or my summon with definition id ${BountifulCore}`)) {
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
 * @id 331721
 * @name 月兆·满辉
 * @description
 * 赋予我方随机1张手牌以及牌组顶的卡牌费用降低。
 * （牌组包含至少2个「挪德卡莱」角色，才能加入牌组）
 */
define card {
  id 331721 as MoonsignAscendantGleam;
  since "v6.5.0";
  tags resonance;
  const handCandidates = :queryAll($.macros.myHandsNotFree);
  if (handCandidates.length > 0) {
    const handCard = :random(handCandidates);
    :attachCostReduction(handCard);
  }
  // queryAll 返回顺序是底到顶，牌顶是最后一张
  const pileCard = :queryAll($.macros.myPileNotFree).at(-1);
  if (pileCard) {
    :attachCostReduction(pileCard);
  }
}

/**
 * @id 331101
 * @name 元素共鸣：交织之冰
 * @description
 * 生成1个冰元素骰。
 * （牌组包含至少2个冰元素角色，才能加入牌组）
 */
define card {
  id 331101 as ElementalResonanceWovenIce;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Cryo, 1);
}

/**
 * @id 331201
 * @name 元素共鸣：交织之水
 * @description
 * 生成1个水元素骰。
 * （牌组包含至少2个水元素角色，才能加入牌组）
 */
define card {
  id 331201 as ElementalResonanceWovenWaters;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Hydro, 1);
}

/**
 * @id 331301
 * @name 元素共鸣：交织之火
 * @description
 * 生成1个火元素骰。
 * （牌组包含至少2个火元素角色，才能加入牌组）
 */
define card {
  id 331301 as ElementalResonanceWovenFlames;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Pyro, 1);
}

/**
 * @id 331401
 * @name 元素共鸣：交织之雷
 * @description
 * 生成1个雷元素骰。
 * （牌组包含至少2个雷元素角色，才能加入牌组）
 */
define card {
  id 331401 as ElementalResonanceWovenThunder;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Electro, 1);
}

/**
 * @id 331501
 * @name 元素共鸣：交织之风
 * @description
 * 生成1个风元素骰。
 * （牌组包含至少2个风元素角色，才能加入牌组）
 */
define card {
  id 331501 as ElementalResonanceWovenWinds;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Anemo, 1);
}

/**
 * @id 331601
 * @name 元素共鸣：交织之岩
 * @description
 * 生成1个岩元素骰。
 * （牌组包含至少2个岩元素角色，才能加入牌组）
 */
define card {
  id 331601 as ElementalResonanceWovenStone;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Geo, 1);
}

/**
 * @id 331701
 * @name 元素共鸣：交织之草
 * @description
 * 生成1个草元素骰。
 * （牌组包含至少2个草元素角色，才能加入牌组）
 */
define card {
  id 331701 as ElementalResonanceWovenWeeds;
  since "v3.3.0";
  tags resonance;
  :generateDice(DiceType.Dendro, 1);
}

/**
 * @id 303181
 * @name 风与自由（生效中）
 * @description
 * 本回合中，我方角色使用技能后：将下一个我方后台角色切换到场上。
 */
define combatStatus {
  id 303181 as WindAndFreedomInEffect;
  oneDuration;
  on useSkill {
    :switchActive("my next");
  }
}

/**
 * @id 331801
 * @name 风与自由
 * @description
 * 本回合中，我方角色使用技能后：将下一个我方后台角色切换到场上。
 * （牌组包含至少2个「蒙德」角色，才能加入牌组）
 */
define card {
  id 331801 as WindAndFreedom;
  since "v3.7.0";
  filter :( :$(`my standby characters`) );
  :combatStatus(WindAndFreedomInEffect);
}

/**
 * @id 331802
 * @name 岩与契约
 * @description
 * 下回合行动阶段开始时：生成3点万能元素，抓1张牌。
 * （牌组包含至少2个「璃月」角色，才能加入牌组）
 */
export const [StoneAndContracts] = card(331802)
  .since("v3.7.0")
  .costVoid(3)
  .toCombatStatus(303182)
  .once("actionPhase")
  .generateDice(DiceType.Omni, 3)
  .drawCards(1)
  .done();

/**
 * @id 331803
 * @name 雷与永恒
 * @description
 * 将我方所有元素骰转换为万能元素。
 * （牌组包含至少2个「稻妻」角色，才能加入牌组）
 */
define card {
  id 331803 as ThunderAndEternity;
  since "v3.7.0";
  :convertDice(DiceType.Omni, "all");
}

/**
 * @id 331804
 * @name 草与智慧
 * @description
 * 抓1张牌。然后，选择任意手牌替换。
 * （牌组包含至少2个「须弥」角色，才能加入牌组）
 */
define card {
  id 331804 as NatureAndWisdom;
  since "v3.7.0";
  cost DiceType.Aligned, 1;
  :drawCards(1);
  :switchCards();
}

/**
 * @id 331805
 * @name 水与正义
 * @description
 * 平均分配我方未被击倒的角色的生命值，然后治疗所有我方角色1点。
 * （牌组包含至少2个「枫丹」角色，才能加入牌组）
 */
define card {
  id 331805 as WaterAndJustice;
  since "v4.7.0";
  cost DiceType.Void, 2;
  filter :( :$(`my characters with health < maxHealth`) );
  const chs = :$$("all my characters");
  const chCount = chs.length;
  const totalHealth = chs.reduce((acc, ch) => acc + ch.health, 0);
  const avgHealth = Math.floor(totalHealth / chCount);
  const remainder = totalHealth % chCount;
  for (let i = 0; i < chCount; i++) {
    const currentHealth = chs[i].health;
    const expectHealth = avgHealth + (i < remainder ? 1 : 0);
    if (currentHealth > expectHealth) {
      :damage(DamageType.Piercing, currentHealth - expectHealth, chs[i]);
    } else if (currentHealth < expectHealth) {
      :heal(expectHealth - currentHealth, chs[i], { kind: "distribution" });
    }
  }
  :heal(1, "all my characters");
}

/**
 * @id 303240
 * @name 还魂诗
 * @description
 * 本回合内，所附属角色被击倒时：如可能，消耗等同于此牌「重燃」的元素骰，使角色免于被击倒，并治疗该角色到2点生命值。然后此牌「重燃」+1。
 */
define status {
  id 303240 as OdeOfResurrection;
  oneDuration;
  variable reignite, 1;
  on beforeDefeated {
    when :( :player.dice.length >= :getVariable("reignite") );
    :absorbDice("seq", :getVariable("reignite"));
    :immune(1);
    :addVariable("reignite", 1);
  }
}

/**
 * @id 331806
 * @name 火与战争
 * @description
 * 选一个我方角色，使其附属「重燃」为1的还魂诗。（本回合内该角色被击倒时，消耗等同于「重燃」的元素骰，使角色免于被击倒，并治疗该角色到1点生命值，然后「重燃」+1）
 * （牌组包含至少2个「纳塔」角色，才能加入牌组）
 */
export const FireAndWar = card(331806)
  .since("v5.7.0")
  .costSame(1)
  .addTarget("my characters")
  .characterStatus(OdeOfResurrection, "@targets.0")
  .done();


/**
 * @id 303184
 * @name 月与故乡（生效中）
 * @description
 * 行动阶段开始时：创建所记录的卡牌加入手牌。
 */
define combatStatus {
  id 303184 as MoonAndHomelandInEffect02;
  variable cardDefId, 0 {
    visible false;
    forceOverwrite;
  };
  once actionPhase {
    const cardDefId = :getVariable("cardDefId") as CardHandle;
    if (cardDefId) {
      :createHandCard(cardDefId);
    }
  }
}

/**
 * @id 303183
 * @name 月与故乡（生效中）
 * @description
 * 本回合内我方打出下张卡牌后：在下个回合开始时，创建1张所打出的卡牌加入手牌。
 */
define combatStatus {
  id 303183 as MoonAndHomelandInEffect01;
  oneDuration;
  once playCard {
    when :( :e.card.definition.id !== MoonAndHomeland );
    :combatStatus(MoonAndHomelandInEffect02, "my", {
      overrideVariables: {
        cardDefId: :e.card.definition.id,
      }
    })
  }
}

/**
 * @id 331807
 * @name 月与故乡
 * @description
 * 本回合内我方打出下张卡牌后：在下个回合开始时，创建1张所打出的卡牌加入手牌。
 * （牌组包含至少2个「挪德卡莱」角色，才能加入牌组）
 */
define card {
  id 331807 as MoonAndHomeland;
  since "v6.5.0";
  :combatStatus(MoonAndHomelandInEffect01);
}

/**
 * @id 332001
 * @name 最好的伙伴！
 * @description
 * 生成2个万能元素。
 */
define card {
  id 332001 as TheBestestTravelCompanion;
  since "v3.3.0";
  cost DiceType.Void, 2;
  :generateDice(DiceType.Omni, 2);
}

/**
 * @id 332002
 * @name 换班时间
 * @description
 * 我方下次执行「切换角色」行动时：少花费1个元素骰。
 */
export const [ChangingShifts] = card(332002)
  .since("v3.3.0")
  .filter((c) => c.$(`my standby characters`))
  .toCombatStatus(303202)
  .once("deductOmniDiceSwitch")
  .deductOmniCost(1)
  .done();

/**
 * @id 332003
 * @name 一掷乾坤
 * @description
 * 选择任意元素骰重投，可重投2次。
 */
define card {
  id 332003 as TossUp;
  since "v3.3.0";
  :rerollDice(2);
}

/**
 * @id 332004
 * @name 运筹帷幄
 * @description
 * 抓2张牌。
 */
define card {
  id 332004 as Strategize;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  :drawCards(2);
}

/**
 * @id 303205
 * @name 本大爷还没有输！（冷却中）
 * @description
 * 本回合无法再打出「本大爷还没有输！」。
 */
define combatStatus {
  id 303205 as IHaventLostYetCooldown;
  oneDuration;
}

/**
 * @id 332005
 * @name 本大爷还没有输！
 * @description
 * 本回合有我方角色被击倒，才能打出：生成1个万能元素，我方当前出战角色获得1点充能。（每回合中，最多只能打出1张「本大爷还没有输！」。）
 */
define card {
  id 332005 as IHaventLostYet;
  since "v3.3.0";
  filter :( :player.hasDefeated && !:$(`my combat status with definition id ${IHaventLostYetCooldown}`) );
  :generateDice(DiceType.Omni, 1);
  :gainEnergy(1, "my active");
  :combatStatus(IHaventLostYetCooldown);
}

/**
 * @id 332006
 * @name 交给我吧！
 * @description
 * 我方下次执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。
 */
export const [LeaveItToMe] = card(332006)
  .since("v3.3.0")
  .filter((c) => c.$(`my standby characters`))
  .toCombatStatus(303206)
  .once("beforeFastSwitch")
  .setFastAction()
  .done();

/**
 * @id 332007
 * @name 鹤归之时
 * @description
 * 我方下一次使用技能后：将下一个我方后台角色切换到场上。
 */
export const [WhenTheCraneReturned] = card(332007)
  .since("v3.3.0")
  .filter((c) => c.$(`my standby characters`))
  .costSame(1)
  .toCombatStatus(303207)
  .once("useSkill")
  .switchActive("my next")
  .done();

/**
 * @id 332008
 * @name 星天之兆
 * @description
 * 我方当前出战角色获得1点充能。
 */
define card {
  id 332008 as Starsigns;
  since "v3.3.0";
  cost DiceType.Void, 2;
  filter :( :$(`my active with energy < maxEnergy`) );
  :$("my active character")?.gainEnergy(1);
}

/**
 * @id 332009
 * @name 白垩之术
 * @description
 * 从最多2个我方后台角色身上，转移1点充能到我方出战角色。
 */
define card {
  id 332009 as CalxsArts;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  filter :( :$(`my standby with energy > 0`) && :$(`my active with energy < maxEnergy`) );
  const chs = :$$("my standby characters limit 2");
  let count = 0;
  for (const ch of chs) {
    count += ch.loseEnergy();
  }
  :$("my active")?.gainEnergy(count);
}

/**
 * @id 332010
 * @name 诸武精通
 * @description
 * 将一个装备在我方角色的「武器」装备牌，转移给另一个武器类型相同的我方角色，并重置其效果的「每回合」次数限制。
 */
export const MasterOfWeaponry = card(332010)
  .since("v3.3.0")
  .addTarget("my character has equipment with tag (weapon)")
  .addTarget("my character with tag weapon of (@targets.0) and not @targets.0")
  .do((c, e) => {
    const weapon = e.targets[0].hasWeapon()!;
    weapon.resetUsagePerRound();
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    const targetOldWeapon = target.hasWeapon();
    if (targetOldWeapon) {
      c.dispose(targetOldWeapon);
    }
    c.moveEntity(weapon, area);
  })
  .done();

/**
 * @id 332011
 * @name 神宝迁宫祝词
 * @description
 * 将一个装备在我方角色的「圣遗物」装备牌，转移给另一个我方角色，并重置其效果的「每回合」次数限制。
 */
export const BlessingOfTheDivineRelicsInstallation = card(332011)
  .since("v3.3.0")
  .addTarget("my character has equipment with tag (artifact)")
  .addTarget("my character and not @targets.0")
  .do((c, e) => {
    const artifact = e.targets[0].hasArtifact()!;
    artifact.resetUsagePerRound();
    const target = e.targets[1];
    const area = {
      type: "characters" as const,
      who: target.who,
      characterId: target.id,
    };
    const targetOldArtifact = target.hasArtifact();
    if (targetOldArtifact) {
      c.dispose(targetOldArtifact);
    }
    c.moveEntity(artifact, area);
  })
  .done();

/**
 * @id 332012
 * @name 快快缝补术
 * @description
 * 选择一个我方「召唤物」，使其「可用次数」+1。
 */
export const QuickKnit = card(332012)
  .since("v3.3.0")
  .costSame(1)
  .addTarget("my summons")
  .do((c, e) => {
    e.targets[0].addVariable("usage", 1);
  })
  .done();

/**
 * @id 332013
 * @name 送你一程
 * @description
 * 选择一个敌方「召唤物」，使其「可用次数」-2。
 */
export const SendOff = card(332013)
  .since("v3.3.0")
  .costVoid(2)
  .addTarget("opp summon")
  .do((c, e) => {
    e.targets[0].consumeUsage(2);
  })
  .done();

/**
 * @id 332014
 * @name 护法之誓
 * @description
 * 消灭所有「召唤物」。（不分敌我！）
 */
define card {
  id 332014 as GuardiansOath;
  since "v3.3.0";
  cost DiceType.Aligned, 4;
  :dispose("all summons");
}

/**
 * @id 332015
 * @name 深渊的呼唤
 * @description
 * 召唤一个随机「丘丘人」召唤物！
 * （牌组包含至少2个「魔物」角色，才能加入牌组）
 */
define card {
  id 332015 as AbyssalSummons;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  const candidates = [
    CryoHilichurlShooter, 
    HydroSamachurl, 
    HilichurlBerserker, 
    ElectroHilichurlShooter
  ];
  const summons = :queryAll($.my.summon);
  const target = :random(candidates.filter((c) => !summons.some((s) => s.definition.id === c)));
  if (target) {
    :summon(target);
  }
}

/**
 * @id 332016
 * @name 愚人众的阴谋
 * @description
 * 在对方场上，生成1个随机类型的「愚人众伏兵」。
 * （牌组包含至少2个「愚人众」角色，才能加入牌组）
 */
define card {
  id 332016 as FatuiConspiracy;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  :combatStatus(
    :random([
      FatuiAmbusherCryoCicinMage,
      FatuiAmbusherMirrorMaiden,
      FatuiAmbusherPyroslingerBracer,
      FatuiAmbusherElectrohammerVanguard
    ]),
    "opp"
  );
}

/**
 * @id 332017
 * @name 下落斩
 * @description
 * 战斗行动：切换到目标角色，然后该角色进行「普通攻击」。
 */
export const PlungingStrike = card(332017)
  .since("v3.7.0")
  .costSame(3)
  .tags("action")
  .addTarget("my characters and not has status with tag (disableSkill)")
  .switchActive("@targets.0")
  .useSkill("normal")
  .done();

/**
 * @id 332018
 * @name 重攻击
 * @description
 * 本回合中，当前我方出战角色下次「普通攻击」造成的伤害+1。
 * 此次「普通攻击」为重击时：伤害额外+1。
 */
export const [HeavyStrike] = card(332018)
  .since("v3.7.0")
  .costSame(1)
  .toStatus(303220, "my active")
  .oneDuration()
  .once("increaseSkillDamage", (c, e) => e.viaSkillType("normal"))
  .increaseDamage(1)
  .if((c, e) => e.viaChargedAttack())
  .increaseDamage(1)
  .done();

/**
 * @id 332019
 * @name 温妮莎传奇
 * @description
 * 生成4个不同类型的基础元素骰。
 */
define card {
  id 332019 as TheLegendOfVennessa;
  since "v3.7.0";
  cost DiceType.Aligned, 3;
  :generateDice("randomElement", 4);
}

/**
 * @id 332020
 * @name 永远的友谊
 * @description
 * 手牌数小于4的牌手抓牌，直到手牌数各为4张。
 */
define card {
  id 332020 as FriendshipEternal;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  if (:player.hands.length < 4) {
    :drawCards(4 - :player.hands.length, { who: "my" });
  }
  if (:oppPlayer.hands.length < 4) {
    :drawCards(4 - :oppPlayer.hands.length, { who: "opp" });
  }
}

/**
 * @id 332021
 * @name 大梦的曲调
 * @description
 * 我方下次打出「武器」或「圣遗物」手牌时：少花费1个元素骰。
 */
export const [RhythmOfTheGreatDream] = card(332021)
  .since("v3.8.0")
  .toCombatStatus(302021)
  .once("deductOmniDiceCard", (c, e) => e.hasOneOfCardTag("weapon", "artifact"))
  .deductOmniCost(1)
  .done();

/**
 * @id 332022
 * @name 藏锋何处
 * @description
 * 将一个我方角色所装备的「武器」返回手牌。
 * 本回合中，我方下次打出「武器」手牌时：少花费2个元素骰。
 */
export const [WhereIsTheUnseenRazor] = card(332022)
  .since("v4.0.0")
  .addTarget("my character has equipment with tag (weapon)")
  .do((c, e) => {
    e.targets[0].unequipWeapon();
  })
  .toCombatStatus(303222)
  .oneDuration()
  .once("deductOmniDiceCard", (c, e) => e.hasCardTag("weapon"))
  .deductOmniCost(2)
  .done();

/**
 * @id 332023
 * @name 拳力斗技！
 * @description
 * 我方至少剩余8个元素骰，且对方未宣布结束时，才能打出：本回合中一位牌手先宣布结束时，未宣布结束的牌手抓2张牌。
 */
export const [Pankration] = card(332023)
  .since("v4.1.0")
  .filter((c) => c.player.dice.length >= 8 && !c.oppPlayer.declaredEnd)
  .toCombatStatus(303223)
  .once("declareEnd")
  .listenToAll()
  .do((c) => {
    if (c.player.declaredEnd) {
      c.drawCards(2, { who: "opp" });
    } else {
      c.drawCards(2, { who: "my" });
    }
  })
  .done();

const LyresongIsFirstExtension = extension(332024, { first: "pair<boolean>" })
  .initialState({ first: [true, true] })
  .description("打出琴音之诗前该方该轮次未打出过其他行动牌")
  .mutateWhen("onRoundEnd", (c) => c.first = [true, true])
  .mutateWhen("onPlayCard", (c, e) => c.first[e.who] = false)
  .done();

/**
 * @id 303232
 * @name 琴音之诗（生效中）
 * @description
 * 本回合中，我方下次打出「圣遗物」手牌时：少花费1个元素骰。
 */
define combatStatus {
  id 303232 as private LyresongInEffect1;
  oneDuration;
  once deductOmniDiceCard {
    when :( :e.hasCardTag("artifact") );
    :e.deductOmniCost(1);
  }
}


/**
 * @id 303224
 * @name 琴音之诗（生效中）
 * @description
 * 本回合中，我方下次打出「圣遗物」手牌时：少花费2个元素骰。
 */
define combatStatus {
  id 303224 as private LyresongInEffect2;
  oneDuration;
  once deductOmniDiceCard {
    when :( :e.hasCardTag("artifact") );
    :e.deductOmniCost(2);
  }
}

/**
 * @id 332024
 * @name 琴音之诗
 * @description
 * 将一个我方角色所装备的「圣遗物」返回手牌。
 * 本回合中，我方下次打出「圣遗物」手牌时：少花费1个元素骰。如果打出此牌前我方未打出过其他行动牌，则改为少花费2个元素骰。
 */
export const Lyresong = card(332024)
  .since("v4.2.0")
  .associateExtension(LyresongIsFirstExtension)
  .addTarget("my character has equipment with tag (artifact)")
  .do((c, e) => {
    e.targets[0].unequipArtifact();
    if (c.getExtensionState().first[c.self.who]) {
      c.combatStatus(LyresongInEffect2);
    } else {
      c.combatStatus(LyresongInEffect1);
    }
  })
  .done();

/**
 * @id 332025
 * @name 野猪公主
 * @description
 * 本回合中，我方每有1张装备在角色身上的「装备牌」被弃置时：获得1个万能元素。（最多获得2个）
 * （角色被击倒时弃置装备牌，或者覆盖装备「武器」「圣遗物」或「特技」，都可以触发此效果）
 */
export const [TheBoarPrincess, TheBoarPrincessInEffect] = card(332025)
  .since("v4.3.0")
  .toCombatStatus(303225)
  .usage(2)
  .oneDuration()
  .on("dispose", (c, e) => e.entity.definition.type === "equipment")
  .generateDice(DiceType.Omni, 1)
  .consumeUsage()
  .done();

/**
 * @id 332026
 * @name 坍陷与契机
 * @description
 * 我方至少剩余8个元素骰，且对方未宣布结束时，才能打出：本回合中，双方牌手进行「切换角色」行动时需要额外花费1个元素骰。
 */
export const [FallsAndFortune] = card(332026)
  .since("v4.3.0")
  .filter((c) => c.player.dice.length >= 8 && !c.oppPlayer.declaredEnd)
  .toCombatStatus(303226)
  .oneDuration()
  .on("addDice", (c, e) => e.action.type === "switchActive")
  .listenToAll()
  .addCost(DiceType.Void, 1)
  .done();

/**
 * @id 332027
 * @name 浮烁的四叶印
 * @description
 * 目标角色附属四叶印：每个回合的结束阶段，我方都切换到此角色。
 */
export const [FlickeringFourleafSigil] = card(332027)
  .since("v4.3.0")
  .addTarget("my characters")
  .toStatus(303227, "@targets.0")
  .on("endPhase")
  .switchActive("@master")
  .done();

/**
 * @id 332028
 * @name 机关铸成之链
 * @description
 * 对我方「出战角色」造成1点物理伤害。从牌组中随机抽取1张「圣遗物」牌。
 */
define card {
  id 332028 as MachineAssemblyLine;
  since "v4.4.0";
  cost DiceType.Aligned, 1;
  :damage(DamageType.Physical, 1, "my active");
  :drawCards(1, { withTag: "artifact" });
}

/**
 * @id 332029
 * @name 净觉花
 * @description
 * 选择一张我方支援区的牌，将其弃置。然后，在我方手牌中随机生成2张支援牌。
 * 本回合中，我方下次打出支援牌时：少花费1个元素骰。
 */
export const [SunyataFlower] = card(332029)
  .since("v4.4.0")
  .addTarget("my supports")
  .dispose("@targets.0")
  .do((c) => {
    const candidates = c.allCardDefinitions("support");
    const card0 = c.random(candidates);
    const card1 = c.random(candidates);
    c.createHandCard(card0.id as CardHandle);
    c.createHandCard(card1.id as CardHandle);
  })
  .toCombatStatus(303229)
  .oneDuration()
  .once("deductOmniDiceCard", (c, e) => e.action.skill.caller.definition.type === "support")
  .deductOmniCost(1)
  .done();

/**
 * @id 332030
 * @name 可控性去危害化式定向爆破
 * @description
 * 对方支援区和召唤物区的卡牌数量总和至少为4时，才能打出：双方所有召唤物的可用次数-1。
 */
define card {
  id 332030 as ControlledDirectionalBlast;
  since "v4.5.0";
  cost DiceType.Aligned, 1;
  filter :( :$$("opp summons or opp supports").length >= 4 );
  for (const summon of :$$("all summons")) {
    summon.consumeUsage();
  }
}

/**
 * @id 302202
 * @name 太郎丸的存款
 * @description
 * 生成1个万能元素。
 */
define card {
  id 302202 as TaroumarusSavings;
  since "v4.6.0";
  undiscoverable;
  :generateDice(DiceType.Omni, 1);
}

/**
 * @id 302203
 * @name 「清洁工作」
 * @description
 * 我方出战角色下次造成的伤害+1。（可叠加，最多叠加到+2）
 */
export const [CalledInForCleanup] = card(302203)
  .since("v4.6.0")
  .undiscoverable()
  .toCombatStatus(302204)
  .variableCanAppend("damage", 1, 2)
  .once("increaseSkillDamage")
  .do((c, e) => {
    e.increaseDamage(c.getVariable("damage"));
  })
  .done();

/**
 * @id 303231
 * @name 海底宝藏（冷却中）
 * @description
 * 本回合此角色不会再受到来自「海底宝藏」的治疗。
 */
define status {
  id 303231 as private UnderseaTreasureOnCD;
  oneDuration;
}

/**
 * @id 303230
 * @name 海底宝藏
 * @description
 * 生成1个随机基础元素骰，治疗我方出战角色1点。（每个角色每回合最多受到1次来自本效果的治疗）
 */
define card {
  id 303230 as UnderseaTreasure;
  since "v4.6.0";
  undiscoverable;
  :generateDice("randomElement", 1);
  if (!:$(`my active has status with definition id ${UnderseaTreasureOnCD}`)) {
    :heal(1, "my active")
    :characterStatus(UnderseaTreasureOnCD, "my active");
  }
}

/**
 * @id 332031
 * @name 海中寻宝
 * @description
 * 生成6张海底宝藏，随机地置入我方牌库中。
 */
define card {
  id 332031 as UnderwaterTreasureHunt;
  since "v4.6.0";
  cost DiceType.Aligned, 2;
  :createPileCards(UnderseaTreasure, 6, "random");
}

/**
 * @id 124053
 * @name 噬骸能量块
 * @description
 * 本回合无法再打出噬骸能量块。
 */
define combatStatus {
  id 124053 as BonecrunchersEnergyBlockCombatStatus;
  oneDuration;
}

/**
 * @id 124051
 * @name 噬骸能量块
 * @description
 * 随机舍弃1张当前元素骰费用最高的手牌，生成1个我方出战角色类型的元素骰。（每回合最多打出1张）
 */
define card {
  id 124051 as BonecrunchersEnergyBlock;
  since "v4.7.0";
  undiscoverable;
  filter :( !:$(`my combat status with definition id ${BonecrunchersEnergyBlockCombatStatus}`) );
  :abortPreview();
  :disposeMaxCostHands(1);
  const activeCh = :$("my active")!;
  :generateDice(activeCh.element(), 1);
  :combatStatus(BonecrunchersEnergyBlockCombatStatus)
}

/**
 * @id 301021
 * @name 禁忌知识（冷却中）
 * @description
 * 本回合无法再打出「禁忌知识」。
 */
define combatStatus {
  id 301021 as ForbiddenKnowledgeCoolDown;
  oneDuration;
}

/**
 * @id 301020
 * @name 禁忌知识
 * @description
 * 无法使用此牌进行元素调和，且每回合最多只能打出1张「禁忌知识」。
 * 对我方出战角色造成1点穿透伤害，抓1张牌。
 */
export const ForbiddenKnowledge = card(301020)
  .since("v4.7.0")
  .undiscoverable()
  .tags("abyss")
  .disableTuning()
  .filter((c) => !c.$(`my combat status with definition id ${ForbiddenKnowledgeCoolDown}`))
  .damage(DamageType.Piercing, 1, "my active")
  .drawCards(1)
  .combatStatus(ForbiddenKnowledgeCoolDown)
  .done();

/**
 * @id 332032
 * @name 幻戏倒计时：3
 * @description
 * 将我方所有元素骰转换为万能元素，抓4张牌。
 * 此牌在手牌或牌库中被舍弃后：将1张元素骰费用比此牌少1个的「幻戏倒计时」放置到你的牌库顶。
 */
define card {
  id 332032 as CountdownToTheShow3;
  since "v4.7.0";
  cost DiceType.Aligned, 3;
  on selfDiscard {
    :createPileCards(CountdownToTheShow2, 1, "top");
  }
  :convertDice(DiceType.Omni, "all");
  :drawCards(4);
}

/**
 * @id 332033
 * @name 幻戏倒计时：2
 * @description
 * 将我方所有元素骰转换为万能元素，抓4张牌。
 * 此牌在手牌或牌库中被舍弃后：将1张元素骰费用比此牌少1个的「幻戏倒计时」放置到你的牌库顶。
 */
define card {
  id 332033 as CountdownToTheShow2;
  since "v4.7.0";
  undiscoverable;
  cost DiceType.Aligned, 2;
  on selfDiscard {
    :createPileCards(CountdownToTheShow1, 1, "top");
  }
  :convertDice(DiceType.Omni, "all");
  :drawCards(4);
}

/**
 * @id 332034
 * @name 幻戏倒计时：1
 * @description
 * 将我方所有元素骰转换为万能元素，抓4张牌。
 * 此牌在手牌或牌库中被舍弃后：将1张元素骰费用为0的「幻戏开始！」放置到你的牌库顶。
 */
define card {
  id 332034 as CountdownToTheShow1;
  since "v4.7.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  on selfDiscard {
    :createPileCards(TheShowBegins, 1, "top");
  }
  :convertDice(DiceType.Omni, "all");
  :drawCards(4);
}

/**
 * @id 332035
 * @name 幻戏开始！
 * @description
 * 将我方所有元素骰转换为万能元素，抓4张牌。
 */
define card {
  id 332035 as TheShowBegins;
  since "v4.7.0";
  undiscoverable;
  :convertDice(DiceType.Omni, "all");
  :drawCards(4);
}

/**
 * @id 302206
 * @name 瑟琳的声援
 * @description
 * 随机将2张美露莘推荐的「料理」加入手牌。
 */
define card {
  id 302206 as SerenesSupport;
  since "v4.8.0";
  undiscoverable;
  const candidates = :allCardDefinitions("food");
  // 似乎是“有放回抽样”，两张牌可重
  const card0 = :random(candidates);
  const card1 = :random(candidates);
  :createHandCard(card0.id as CardHandle);
  :createHandCard(card1.id as CardHandle);
}

/**
 * @id 302207
 * @name 洛梅的声援
 * @description
 * 随机将2张美露莘好奇的「圣遗物」加入手牌。
 */
define card {
  id 302207 as LaumesSupport;
  since "v4.8.0";
  undiscoverable;
  const candidates = :allCardDefinitions("artifact");
  const card0 = :random(candidates);
  const card1 = :random(candidates);
  :createHandCard(card0.id as CardHandle);
  :createHandCard(card1.id as CardHandle);
}

/**
 * @id 302208
 * @name 柯莎的声援
 * @description
 * 随机将2张美露莘称赞的「武器」加入手牌。
 */
define card {
  id 302208 as CosanzeanasSupport;
  since "v4.8.0";
  undiscoverable;
  const candidates = :allCardDefinitions("weapon");
  // 似乎是“有放回抽样”，两张牌可重
  const card0 = :random(candidates);
  const card1 = :random(candidates);
  :createHandCard(card0.id as CardHandle);
  :createHandCard(card1.id as CardHandle);
}

const MELUSINE_EVENT_CARDS = [
  ElementalResonanceShatteringIce,
  ElementalResonanceSoothingWater,
  ElementalResonanceFerventFlames,
  ElementalResonanceHighVoltage,
  ElementalResonanceImpetuousWinds,
  ElementalResonanceEnduringRock,
  ElementalResonanceSprawlingGreenery,
  WindAndFreedom,
  StoneAndContracts,
  ThunderAndEternity,
  NatureAndWisdom,
  WaterAndJustice,
  FireAndWar,
  MoonAndHomeland,
  // 331808 
];

// 筛出当前版本存在的卡
const getMelusineEventCards = (cards: ReadonlyMap<number, EntityDefinition>): CardHandle[] => {
  return MELUSINE_EVENT_CARDS
    .map(id => cards.get(id))
    .filter(def => !!def)
    .map((def) => def.id as CardHandle);
}

/**
 * @id 302209
 * @name 夏诺蒂拉的声援
 * @description
 * 随机将2张美露莘看好的超棒事件牌加入手牌。
 */
define card {
  id 302209 as CanotilasSupport;
  since "v4.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  const cards = getMelusineEventCards(:data.entities);
  const card0 = :random(cards);
  const card1 = :random(cards);
  :createHandCard(card0);
  :createHandCard(card1);
}

/**
 * @id 302219
 * @name 希洛娜的心意
 * @description
 * 回合结束时：随机将1张超棒事件牌加入手牌。
 * 可用次数：3
 */
define combatStatus {
  id 302219 as private ThironasGoodWill;
  on endPhase { // 文本有误
    usage 3;
    const cards = getMelusineEventCards(:data.entities);
    const card = :random(cards);
    :createHandCard(card);
  }
}

/**
 * @id 302210
 * @name 希洛娜的声援
 * @description
 * 接下来3个回合结束时，各将1张美露莘看好的超棒事件牌加入手牌。
 */
define card {
  id 302210 as ThironasSupport;
  since "v4.8.0";
  undiscoverable;
  :combatStatus(ThironasGoodWill);
}

/**
 * @id 302211
 * @name 希露艾的声援
 * @description
 * 复制对方牌库顶部的3张牌，加入手牌。
 */
define card {
  id 302211 as SluasisSupport;
  since "v4.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  for (const card of :oppPlayer.pile.slice(0, 3)) {
    :createHandCard(card.definition.id as CardHandle);
  };
}

/**
 * @id 302212
 * @name 薇尔妲的声援
 * @description
 * 随机将2张「秘传」卡牌加入你的手牌，并恢复双方牌手的「秘传」卡牌使用机会。
 */
define card {
  id 302212 as VirdasSupport;
  since "v4.8.0";
  undiscoverable;
  cost DiceType.Void, 2;
  const candidates = :allCardDefinitions("legend");
  const card0 = :random(candidates);
  const card1 = :random(candidates);
  :createHandCard(card0.id as CardHandle);
  :createHandCard(card1.id as CardHandle);
  :mutate({
    type: "setPlayerFlag",
    who: 0,
    flagName: "legendUsed",
    value: false
  });
  :mutate({
    type: "setPlayerFlag",
    who: 1,
    flagName: "legendUsed",
    value: false
  });
}

/**
 * @id 302213
 * @name 芙佳的声援
 * @description
 * 随机生成「伙伴」到场上，直到填满双方支援区。
 */
const PucasSupport = void 0; /* moves to support/ally.ts */

/**
 * @id 302216
 * @name 托皮娅的心意
 * @description
 * 本回合打出手牌后，随机舍弃1张牌或抓1张牌。
 */
define combatStatus {
  id 302216 as private TopyassGoodwill;
  oneDuration;
  on playCard {
    :abortPreview();
    let doDrawCard: boolean;
    if (:player.pile.length === 0 && :player.hands.length === 0) {
      // 啥也做不了
      return;
    } else if (:player.pile.length === 0) {
      // 只能舍弃
      doDrawCard = false;
    } else if (:player.hands.length === 0) {
      // 只能抽牌
      doDrawCard = true;
    } else {
      // 随机
      doDrawCard = :random([true, false]);
    }
    if (doDrawCard) {
      :drawCards(1);
    } else {
      const target = :random(:player.hands);
      :disposeCard(target);
    }
  }
}

/**
 * @id 302214
 * @name 托皮娅的声援
 * @description
 * 抓2张牌，双方获得以下效果：「本回合打出手牌后，随机舍弃1张牌或抓1张牌。」
 */
define card {
  id 302214 as TopyassSupport;
  since "v4.8.0";
  undiscoverable;
  :drawCards(2);
  :combatStatus(TopyassGoodwill, "my");
  :combatStatus(TopyassGoodwill, "opp");
}

/**
 * @id 302217
 * @name 卢蒂妮的心意
 * @description
 * 我方角色使用技能后：受到2点治疗或2点穿透伤害。
 * 可用次数：2
 */
define combatStatus {
  id 302217 as private LutinesGoodwill;
  on useSkill {
    usage 2;
    :abortPreview();
    const caller = :e.skill.caller.cast<"character">();
    if (:random([true, false])) {
      :heal(2, caller);
    } else {
      :damage(DamageType.Piercing, 2, caller);
    }
  }
}

/**
 * @id 302215
 * @name 卢蒂妮的声援
 * @description
 * 抓2张牌，双方获得以下效果：「角色使用技能后，随机受到2点治疗或2点穿透伤害。可用次数：2」
 */
define card {
  id 302215 as LutinesSupport;
  since "v4.8.0";
  undiscoverable;
  :drawCards(2);
  :combatStatus(LutinesGoodwill, "my");
  :combatStatus(LutinesGoodwill, "opp");
}

/**
 * @id 302218
 * @name 美露莘的声援
 * @description
 * 效果随机的超棒贴纸，凝聚了美露莘们的心意。
 */
define card {
  id 302218 as MelusineSupport;
  reserved;
}

/**
 * @id 303236
 * @name 「看到那小子挣钱…」（生效中）
 * @description
 * 本回合中，对方每获得1个元素骰时，如果你未宣布回合结束，则你生成1个万能元素；否则，生成1点护盾。
 * 可用次数：3
 */
define combatStatus {
  id 303236 as IdRatherLoseMoneyMyselfInEffect;
  oneDuration;
  on generateDice {
    when :( :e.who !== :self.who );
    usage 3;
    listenTo all;
    if (!:player.declaredEnd) {
      :generateDice(DiceType.Omni, 1);
    } else {
      :combatStatus(Shield);
    }
  }
}

/**
 * @id 332036
 * @name 「看到那小子挣钱…」
 * @description
 * 本回合中，对方每获得1个元素骰时，如果你未宣布回合结束，则你生成1个万能元素；否则，生成1点护盾。
 * 可用次数：3
 */
define card {
  id 332036 as IdRatherLoseMoneyMyself;
  since "v4.8.0";
  :combatStatus(IdRatherLoseMoneyMyselfInEffect);
}

/**
 * @id 332037
 * @name 噔噔！
 * @description
 * 对我方「出战角色」造成1点物理伤害。本回合的结束阶段时，抓1张牌。
 */
export const [Tada] = card(332037)
  .since("v4.8.0")
  .damage(DamageType.Physical, 1, "my active")
  .toCombatStatus(303237)
  .on("endPhase")
  .usage(1)
  .drawCards(1)
  .done();

/**
 * @id 332039
 * @name 龙伙伴的聚餐
 * @description
 * 选择一个装备在我方角色的「特技」装备牌，使其可用次数+1。
 */
export const SaurianDiningBuddies = card(332039)
  .since("v5.0.0")
  .addTarget("my character has equipment with tag (technique)")
  .do((c, e) => {
    const technique = e.targets[0].hasTechnique();
    if (technique) {
      c.addVariable("usage", 1, technique);
    }
  })
  .done();

/**
 * @id 133090
 * @name 海底寻宝
 * @description
 * 生成6张海底宝藏，随机地置入我方牌库中。
 */
define card {
  id 133090 as FakeUnderwaterTreasureHunt; // 骗骗花
  reserved;
}

/**
 * @id 133091
 * @name 可控性危害化式定向爆破
 * @description
 * 对方支援区和召唤物区的卡牌数量总和至少为4时，才能打出：双方所有召唤物的可用次数-1。
 */
define card {
  id 133091 as FakeControlledDirectionalBlast; // 骗骗花
  reserved;
}

/**
 * @id 133094
 * @name 温妮莎传说
 * @description
 * 生成4个不同类型的基础元素骰。
 */
define card {
  id 133094 as TheTaleOfVennessa; // 骗骗花
  reserved;
}

/**
 * @id 332040
 * @name 镀金旅团的茶歇
 * @description
 * 如果我方存在相同元素类型的角色，则从3张「场地」中挑选1张加入手牌；
 * 如果我方存在相同武器类型的角色，则从3张「道具」中挑选1张加入手牌；
 * 如果我方存在相同所属势力的角色，则从3张「料理」中挑选1张加入手牌。
 */
define card {
  id 332040 as EremiteTeatime;
  since "v5.1.0";
  cost DiceType.Aligned, 2;
  const characters = :$$("my characters include defeated");
  const elements = characters.map((ch) => ch.element());
  const weapons = characters.map((ch) => ch.weaponTag());
  const nations = characters.flatMap((ch) => ch.nationTags());
  if (new Set(elements).size < characters.length) {
    const cards = :allCardDefinitions("place");
    const candidates = :randomSubset(cards, 3);
    :selectAndCreateHandCard(candidates);
  }
  if (new Set(weapons).size < characters.length) {
    const cards = :allCardDefinitions("item");
    const candidates = :randomSubset(cards, 3);
    :selectAndCreateHandCard(candidates);
  }
  if (new Set(nations).size < nations.length) {
    const cards = :allCardDefinitions("food");
    const candidates = :randomSubset(cards, 3);
    :selectAndCreateHandCard(candidates);
  }
}

/**
 * @id 332041
 * @name 强劲冲浪拍档！
 * @description
 * 战斗行动：双方场上至少存在合计2个「召唤物」时，才能打出，随机触发我方和敌方各1个「召唤物」的「结束阶段」效果。
 */
define card {
  id 332041 as UltimateSurfingBuddy;
  since "v5.2.0";
  tags action;
  filter :( :$$(`all summons`).length >= 2 );
  :abortPreview();
  const mySummons = :$$(`my summons`);
  if (mySummons.length > 0) {
    const mySummon = :random(mySummons);
    :triggerEndPhaseSkill(mySummon);
  }
  const oppSummons = :$$(`opp summons`);
  if (oppSummons.length > 0) {
    const oppSummon = :random(oppSummons);
    :triggerEndPhaseSkill(oppSummon);
  }
}

/**
 * @id 332042
 * @name 燃素充盈
 * @description
 * 本回合我方下次角色消耗「夜魂值」后：该角色获得1点「夜魂值」。
 */
export const [AbundantPhlogiston, AbundantPhlogistonInEffect] = card(332042)
  .since("v5.3.0")
  .toCombatStatus(303238)
  .oneDuration()
  .once("consumeNightsoul")
  .do((c, e) => {
    c.gainNightsoul(e.entity.cast<"status">().master, 1);
  })
  .done();

/**
 * @id 332043
 * @name 小嵴锋龙！发现宝藏！
 * @description
 * 向双方牌组中放入2张燃素充盈，随后双方各抓2张牌。
 */
define card {
  id 332043 as LittleTepetlisaurTreasureHunterAtLarge;
  since "v5.4.0";
  cost DiceType.Aligned, 1;
  :createPileCards(AbundantPhlogiston, 2, "random", "my");
  :createPileCards(AbundantPhlogiston, 2, "random", "opp");
  :drawCards(2, { who: "my" });
  :drawCards(2, { who: "opp" });
}

/**
 * @id 332044
 * @name 以极限之名
 * @description
 * 交换双方手牌，然后手牌较少的一方抓牌直到手牌数等同于手牌多的一方。
 */
define card {
  id 332044 as InTheNameOfTheExtreme;
  since "v5.5.0";
  cost DiceType.Aligned, 4;
  :swapPlayerHandCards();
  const oppHandsCount = :oppPlayer.hands.length;
  const myHandsCount = :player.hands.length;
  if (oppHandsCount < myHandsCount) {
    :drawCards(myHandsCount - oppHandsCount, { who: "opp" });
  } else if (oppHandsCount > myHandsCount) {
    :drawCards(oppHandsCount - myHandsCount, { who: "my" });
  }
}

/**
 * @id 303239
 * @name 困困冥想术（生效中）
 * @description
 * 我方下次打出不属于初始卡组的牌费用-2。
 */
define combatStatus {
  id 303239 as ArtOfSleepyMeditationInEffect;
  once deductOmniDiceCard {
    when :( !:isInInitialPile(:e.action.skill.caller) );
    :e.deductOmniCost(2);
  }
}

/**
 * @id 332045
 * @name 困困冥想术
 * @description
 * 从随机3张特技牌中挑选1张。
 * 我方下次打出不属于初始卡组的牌少花费2个元素骰。
 */
define card {
  id 332045 as ArtOfSleepyMeditation;
  since "v5.6.0";
  cost DiceType.Aligned, 1;
  const candidates = :randomSubset(:allCardDefinitions("technique"), 3);
  :selectAndCreateHandCard(candidates);
  :combatStatus(ArtOfSleepyMeditationInEffect);
}

/**
 * @id 332046
 * @name 飞行队出击！
 * @description
 * 随机舍弃至多2张当前元素骰费用最高的手牌，随后抓牌直至手牌中有4张牌。
 * 此牌在手牌被舍弃后：抓1张牌。
 */
define card {
  id 332046 as FlyingSquadAttack;
  since "v5.7.0";
  cost DiceType.Void, 3;
  on selfDiscard {
    if (:e.area.type === "hands") {
      :drawCards(1);
    }
  }
  :disposeMaxCostHands(2);
  const handsLength = :player.hands.length;
  if (handsLength < 4) {
    :drawCards(4 - handsLength);
  }
}

/**
 * @id 303242
 * @name 健身的成果（生效中）
 * @description
 * 该角色下次元素战技花费1个元素骰。（不可叠加）
 */
define status {
  id 303242 as FruitsOfTrainingInEffect02;
  on deductOmniDiceSkill {
    when :( :e.isSkillType("elemental") );
    usage 1 {
      append; // 所谓“不可叠加”是指无法一次减多个骰子，但是可用次数可以叠加
    };
    :e.deductOmniCost(1);
  }
}

/**
 * @id 303241
 * @name 健身的成果（生效中）
 * @description
 * 我方其他角色准备技能时：所选角色下次元素战技花费1个元素骰。（至多触发2次，不可叠加）
 */
define status {
  id 303241 as FruitsOfTrainingInEffect01;
  on enterRelative {
    when :( :e.entity.definition.type === "status" &&
        :e.entity.definition.tags.includes("preparingSkill") &&
        :e.entity.cast<"status">().master.id !== :self.master.id );
    listenTo samePlayer;
    usage 2;
    :characterStatus(FruitsOfTrainingInEffect02, "@master");
  }
}

/**
 * @id 332048
 * @name 健身的成果
 * @description
 * 选一个我方角色，我方其他角色准备技能时：所选角色下次元素战技少花费1个元素骰。（至多触发2次，不可叠加）
 */
export const FruitsOfTraining = card(332048)
  .since("v5.7.0")
  .addTarget("my characters")
  .characterStatus(FruitsOfTrainingInEffect01, "@targets.0")
  .done();

/**
 * @id 301028
 * @name 积木小人
 * @description
 * 结束阶段：造成1点物理伤害。
 * 可用次数：2
 */
define summon {
  id 301028 as ToyGuardSummon;
  variable effect, 1 {
    forceOverwrite;
  };
  hint DamageType.Physical, ((c, e) => e.variables.effect);
  on endPhase {
    usage 2;
    :damage(DamageType.Physical, :getVariable("effect"));
  }
}

/**
 * @id 301029
 * @name 折纸飞鼠
 * @description
 * 结束阶段：获得1层高效切换。
 * 可用次数：2
 */
define summon {
  id 301029 as OrigamiFlyingSquirrelSummon;
  variable effect, 1 {
    forceOverwrite;
  };
  hint ResistantForm, ((c, e) => e.variables.effect);
  on endPhase {
    usage 2;
    :combatStatus(EfficientSwitch, "my", {
      overrideVariables: {
        usage: :getVariable("effect")
      }
    })
  }
}

/**
 * @id 301030
 * @name 跳跳纸蛙
 * @description
 * 结束阶段：抓1张牌。
 * 可用次数：2
 */
define summon {
  id 301030 as PopupPaperFrogSummon;
  variable effect, 1 {
    forceOverwrite;
  };
  hint ResistantForm, ((c, e) => e.variables.effect);
  on endPhase {
    usage 2;
    :drawCards(:getVariable("effect"));
  }
}

/**
 * @id 301031
 * @name 折纸胖胖鼠
 * @description
 * 折纸胖胖鼠：结束阶段：治疗受伤最多的我方角色2点。
 * 可用次数：1
 */
define summon {
  id 301031 as OrigamiHamsterSummon;
  variable effect, 2 {
    forceOverwrite;
  };
  hint DamageType.Heal, ((c, e) => e.variables.effect);
  on endPhase {
    usage 1;
    :heal(:getVariable("effect"), "my characters order by health - maxHealth limit 1");
  }
}

export const SIMULANKA_SUMMONS = [
  ToyGuardSummon,
  OrigamiFlyingSquirrelSummon,
  PopupPaperFrogSummon,
  OrigamiHamsterSummon
];

export const SIMULANKA_QUERY = SIMULANKA_SUMMONS
  .map((id) => `(my summons with definition id ${id})`)
  .join(` or `) as `${string} summons ${string}`;

/**
 * @id 301033
 * @name 积木小人
 * @description
 * 召唤积木小人。
 * （积木小人：结束阶段：造成1点物理伤害。
 * 可用次数：2）
 */
define card {
  id 301033 as ToyGuard;
  since "v5.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  :summon(ToyGuardSummon);
}

/**
 * @id 301034
 * @name 折纸飞鼠
 * @description
 * 召唤折纸飞鼠。
 * （折纸飞鼠：结束阶段：获得1层高效切换。
 * 可用次数：2）
 */
define card {
  id 301034 as OrigamiFlyingSquirrel;
  since "v5.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  :summon(OrigamiFlyingSquirrelSummon);
}

/**
 * @id 301035
 * @name 跳跳纸蛙
 * @description
 * 召唤跳跳纸蛙。
 * （跳跳纸蛙：结束阶段：抓1张牌。
 * 可用次数：2）
 */
define card {
  id 301035 as PopupPaperFrog;
  since "v5.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  :summon(PopupPaperFrogSummon);
}

/**
 * @id 301036
 * @name 折纸胖胖鼠
 * @description
 * 召唤折纸胖胖鼠。
 * （折纸胖胖鼠：结束阶段：治疗受伤最多的我方角色2点。
 * 可用次数：1）
 */
define card {
  id 301036 as OrigamiHamster;
  since "v5.8.0";
  undiscoverable;
  cost DiceType.Aligned, 1;
  :summon(OrigamiHamsterSummon);
}

/**
 * @id 303244
 * @name 收获时间（生效中）
 * @description
 * 结束阶段：生成一张收获时间，随机置入我方牌组。（可叠加，最多叠加到2）
 */
define combatStatus {
  id 303244 as HarvestTimeInEffect;
  variable cardCount, 1 {
    append 2;
  };
  once endPhase {
    :createPileCards(HarvestTime, :getVariable("cardCount"), "random");
  }
}

/**
 * @id 332049
 * @name 收获时间
 * @description
 * 从3张随机「料理」牌中挑选1张。
 * 结束阶段：生成一张收获时间，随机置入我方牌组。
 */
define card {
  id 332049 as HarvestTime;
  since "v5.8.0";
  cost DiceType.Aligned, 1;
  cost DiceType.Aligned, 1;
  const allFoods = :allCardDefinitions("food");
  const candidates = :randomSubset(allFoods, 3);
  :selectAndCreateHandCard(candidates);
  :combatStatus(HarvestTimeInEffect);
}

/**
 * @id 332050
 * @name 很棒，哥们。
 * @description
 * 抓1张「特技」牌，下次打出「特技」牌后，生成1个万能元素。
 */
export const AwesomeBro = card(332050)
  .since("v5.8.0")
  .costSame(1)
  .drawCards(1, {withTag: "technique"})
  .toCombatStatus(303243)
  .once("playCard", (c, e) => e.hasCardTag("technique"))
  .generateDice(DiceType.Omni, 1)
  .done();

export const DisposedSupportAndSummonsCountExtension = extension(332051, {
  disposedSupportCount: "pair<number>",
  disposedSummonsCount: "pair<number>",
})
  .initialState({
    disposedSupportCount: [0, 0],
    disposedSummonsCount: [0, 0],
  })
  .description("记录本场对局中双方支援区和召唤区弃置卡牌的数量")
  .mutateWhen("onDispose", (st, e) => {
    if (e.isDiscardOrTuning()) {
      return;
    }
    if (e.entity.definition.type === "support") {
      st.disposedSupportCount[e.who]++;
    } else if (e.entity.definition.type === "summon") {
      st.disposedSummonsCount[e.who]++;
    }
  })
  .done();

/**
 * @id 303245
 * @name 「邪龙」
 * @description
 * 结束阶段：造成1点穿透伤害。
 * 可用次数：1
 */
define summon {
  id 303245 as FellDragon;
  variable effect, 1 {
    forceOverwrite;
  };
  associateExtension DisposedSupportAndSummonsCountExtension;
  hint DamageType.Physical, ((c, e) => e.variables.effect);
  on endPhase {
    usage 1;
    :damage(DamageType.Piercing, :getVariable("effect"));
  }
  on enter {
    const ext = :getExtensionState();
    const addUsage = Math.min(ext.disposedSupportCount[:self.who], 4);
    const addDmg = Math.min(ext.disposedSummonsCount[:self.who], 4);
    :addVariable("usage", addUsage);
    :addVariable("effect", addDmg);
  }
}

/**
 * @id 332051
 * @name 「邪龙」的苏醒
 * @description
 * 召唤「邪龙」。
 * 本场对局中，我方支援区每弃置1张卡牌，则「邪龙」可用次数+1；我方召唤区每弃置1张卡牌，则「邪龙」效果量+1。（可叠加，最多叠加到4）
 * （「邪龙」：结束阶段：造成1点穿透伤害。
 * 可用次数：1）
 * 【此卡含描述变量】
 */
export const FellDragonsAwakening = card(332051)
  .since("v6.0.0")
  .costSame(2)
  .associateExtension(DisposedSupportAndSummonsCountExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (c, { area }, ext) => ext.disposedSupportCount[area.who])
  .replaceDescription("[GCG_TOKEN_COUNTER_2]", (c, { area }, ext) => ext.disposedSummonsCount[area.who])
  .summon(FellDragon)
  .done();

/**
 * @id 332052
 * @name 旁白的注脚
 * @description
 * 双方召唤积木小人。
 * （积木小人：结束阶段：造成1点物理伤害。
 * 可用次数：2）
 */
define card {
  id 332052 as NarrationFootnotes;
  since "v6.0.0";
  :summon(ToyGuardSummon);
  :summon(ToyGuardSummon, "opp");
}

/**
 * @id 332054
 * @name 「魔女M的祝福」
 * @description
 * 选择并弃置一个我方召唤物，将其可用次数转化为至多2个不同类型的基础元素骰，如果其可用次数不低于3，则额外治疗我方受伤最多的角色2点。
 */
export const ABlessingFromM = card(332054)
  .since("v6.0.0")
  .addTarget("my summon")
  .do((c, e) => {
    const usage = e.targets[0].variables.usage!;
    e.targets[0].dispose();
    c.generateDice("randomElement", Math.min(usage, 2));
    if (usage >= 3) {
      c.heal(2, "my characters order by health - maxHealth limit 1");
    }
  })
  .done();

/**
 * @id 332055
 * @name 「狂欢节奏」
 * @description
 * 抓2张牌，如果我方手牌中的「武器」牌或「圣遗物」牌数量大于1张，则各生成1个万能元素。
 */
define card {
  id 332055 as RevelrousBeats;
  since "v6.0.0";
  cost DiceType.Void, 2;
  :drawCards(2);
  if (:$$("my hands with tag (weapon)").length > 1) {
    :generateDice(DiceType.Omni, 1);
  }
  if (:$$("my hands with tag (artifact)").length > 1) {
    :generateDice(DiceType.Omni, 1);
  }
}

/**
 * @id 332056
 * @name 祀珑在昔，灵锦歆诚
 * @description
 * 冒险1次。如果我方冒险经历不低于4，则改为对我方「出战角色」造成1点物理伤害，冒险2次。
 */
define card {
  id 332056 as AnAncientSacrificeOfSacredBrocade;
  since "v6.1.0";
  cost DiceType.Aligned, 1;
  const exp = :$(`my support with tag (adventureSpot)`)?.variables.exp ?? 0;
  if (exp >= 4) {
    :damage(DamageType.Physical, 1, "my active");
    :adventure();
  }
  :adventure();
}

/**
 * @id 300008
 * @name 驱逐灾厄
 * @description
 * 将敌方1张费用最高的手牌置于牌组底。
 */
define card {
  id 300008 as DisperseTheCalamity;
  since "v6.2.0";
  undiscoverable;
  const cards = :maxCostHands(1, { who: "opp" });
  :undrawCards(cards, "bottom", "opp");
}

/**
 * @id 300009
 * @name 肃净污染
 * @description
 * 将我方所有手牌置于牌组底，然后抓相同数量+1张手牌。
 */
define card {
  id 300009 as SanctifyTheDefiled;
  since "v6.2.0";
  undiscoverable;
  const allHands = [...:player.hands];
  const count = allHands.length;
  :undrawCards(allHands, "bottom");
  :drawCards(count + 1);
}

/**
 * @id 301038
 * @name 木质玩具剑
 * @description
 * 治疗目标角色2点，生成2个随机基础元素骰。
 */
export const WoodenToySword = card(301038)
  .since("v6.2.0")
  .undiscoverable()
  .costSame(1)
  .addTarget("my characters")
  .heal(2, "@targets.0")
  .generateDice("randomElement", 2)
  .done();

/**
 * @id 301040
 * @name 重铸圣剑（生效中）
 * @description
 * 所附属角色重击后：造成5点该角色元素类型的伤害。
 */
define status {
  id 301040 as ReforgeTheHolyBladeInEffect;
  on useSkill {
    when :( :e.isChargedAttack() );
    const element = :self.master.element() as number as DamageType;
    :damage(element, 5);
  }
}

/**
 * @id 301039
 * @name 重铸圣剑
 * @description
 * 治疗目标角色12点，使其获得效果：重击后：造成5点该角色元素类型的伤害。
 */
export const ReforgeTheHolyBlade = card(301039)
  .since("v6.2.0")
  .undiscoverable()
  .costVoid(4)
  .addTarget("my characters")
  .heal(12, "@targets.0")
  .characterStatus(ReforgeTheHolyBladeInEffect, "@targets.0")
  .done();

/**
 * @id 332057
 * @name 水仙十字大冒险
 * @description
 * 如果我方存在相同元素类型的角色，则治疗我方受伤最多的角色1点；
 * 如果我方存在相同武器类型的角色，抓1张牌；
 * 如果我方存在相同所属势力的角色，则冒险1次。
 */
define card {
  id 332057 as TheNarzissenkreuzAdventure;
  since "v6.2.0";
  cost DiceType.Aligned, 1;
  const characters = :$$("my characters include defeated");
  const elements = characters.map((ch) => ch.element());
  const weapons = characters.map((ch) => ch.weaponTag());
  const nations = characters.flatMap((ch) => ch.nationTags());
  if (new Set(elements).size < characters.length) {
    :heal(1, "my characters order by health - maxHealth limit 1");
  }
  if (new Set(weapons).size < characters.length) {
    :drawCards(1);
  }
  if (new Set(nations).size < nations.length) {
    :adventure();
  }
}

/**
 * @id 303247
 * @name 拯救世界的计划（生效中）
 * @description
 * 下个回合结束时，双方出战角色生命值变为5。
 */
define combatStatus {
  id 303247 as PlanToSaveTheWorldInEffect;
  duration 2;
  on endPhase {
    when :( :getVariable("duration") === 1 );
    const actives = :$$(`all active characters`);
    for (const ch of actives) {
      :mutate({
        type: "modifyEntityVar",
        state: ch.latest(),
        varName: "health",
        value: 5,
        direction: ch.health > 5 ? "decrease" : "increase",
      });
    }
  }
}

/**
 * @id 332058
 * @name 拯救世界的计划
 * @description
 * 下回合结束阶段时，双方出战角色生命值变为5。
 */
define card {
  id 332058 as PlanToSaveTheWorld;
  since "v6.2.0";
  cost DiceType.Aligned, 2;
  :combatStatus(PlanToSaveTheWorldInEffect);
}

/**
 * @id 332053
 * @name 破碎之海
 * @description
 * 选择一张我方支援区的牌，将其弃置。然后使我方所有「希穆兰卡」召唤物的可用次数和效果量+1。
 */
export const BrokenSea = card(332053)
  .since("v6.3.0")
  .costSame(1)
  .addTarget("my supports")
  .do((c, e) => {
    c.dispose(e.targets[0]);
    for (const summon of c.$$(SIMULANKA_QUERY)) {
      summon.addVariable("effect", 1);
      summon.addVariable("usage", 1);
    }
  })
  .done();

/**
 * @id 332059
 * @name 「穿越晨霭的冒险」
 * @description
 * 将当前元素骰费用最低的至多2张手牌置入牌组底，然后抓等量的牌。
 * 此牌被舍弃后：冒险1次。
 */
define card {
  id 332059 as AnAdventureThroughTheMorningMist;
  since "v6.3.0";
  on selfDiscard {
    :adventure();
  }
  const minCostCards = :player.hands
    .toSorted((a, b) => a.diceCost() - b.diceCost())
    .slice(0, 2);
  :undrawCards(minCostCards, "bottom");
  :drawCards(minCostCards.length);
}

/**
 * @id 332060
 * @name 天才的改造法
 * @description
 * 生成1张随机「道具」牌，赋予我方当前元素骰费用最高的2张手牌赋能。
 */
define card {
  id 332060 as GeniussUpgradeTechnique;
  since "v6.4.0";
  const itemCards = :allCardDefinitions("item");
  :createHandCard(:random(itemCards).id as CardHandle);
  const hands = :maxCostHands(2, {
    filter: (card) => !:get(card).empowered(),
  });
  for (const card of hands) {
    :attach(Empowerment, card);
  }
}

/**
 * @id 332061
 * @name 叮铃哐啷军团
 * @description
 * 生成3张随机原本元素骰费用等于3的卡牌加入手牌。
 * 如果此卡牌被赋予了赋能，则赋予3张当前元素骰费用最高的手牌赋能。
 */
define card {
  id 332061 as ClinkClankLegion;
  since "v6.4.0";
  cost DiceType.Aligned, 1;
  const allCards = :allCardDefinitions().filter((card) => !card.tags.includes("talent") && originalDiceCostOfCard(card) === 3);
  for (let i = 0; i < 3; i++) {
    :createHandCard(:random(allCards).id as CardHandle);
  }
  if (:self.empowered()) {
    const hands = :maxCostHands(3, {
      filter: (card) => !:get(card).empowered(),
    });
    for (const card of hands) {
      :attach(Empowerment, card);
    }
  }
}

/**
 * @id 302229
 * @name 乐平波琳的医疗器材投资
 * @description
 * 对我方出战角色造成1点穿透伤害，执行1个「治疗」效果相关的计划。
 */
const LepinepaulinesInvestmentInMedicalEquipment = void 0;

/**
 * @id 302230
 * @name 乐平波琳的图形对抗投资
 * @description
 * 舍弃1张随机手牌，执行1个「抓牌」效果相关的计划。
 */
const LepinepaulinesInvestmentInGraphAdversarialTechnology = void 0;

/**
 * @id 302231
 * @name 乐平波琳的能量机关投资
 * @description
 * 移除我方1个元素骰，执行1个「元素骰」效果相关的计划。
 */
const LepinepaulinesInvestmentInEnergyMechanism = void 0;

/**
 * @id 332062
 * @name 清扫时间
 * @description
 * 我方手牌中每存在1种附着状态，则生成1个随机基础元素骰。（至多生成2个）
 */
define card {
  id 332062 as CleaningTime;
  since "v6.5.0";
  const attachmentsCount = new Set(
    :queryAll($.my.attachment).map((att) => att.definition.id)
  ).size;
  const diceCount = Math.min(attachmentsCount, 2);
  :generateDice("randomElement", diceCount);
}

/**
 * @id 303249
 * @name 小小灵蕈大幻戏（生效中）
 * @description
 * 所附属角色造成的伤害+1。（不可叠加）
 */
define status {
  id 303249 as LilFungisFuntasticFiestaInEffect;
  on increaseDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 332063
 * @name 小小灵蕈大幻戏
 * @description
 * 目标我方「魔物」角色造成的伤害+1。（不可叠加）
 * 此牌在手中，我方「魔物」角色使用技能后：赋予此卡牌费用降低。
 * 此牌被舍弃时：我方随机「魔物」角色获得1点额外最大生命值。
 * （牌组包含至少2个「魔物」角色，才能加入牌组）
 */
define card {
  id 332063 as LilFungisFuntasticFiesta;
  since "v6.7.0";
  cost DiceType.Aligned, 5;
  on useSkill {
    when :(
      :e.skillCaller.cast<"character">().definition.tags.includes("monster")
    );
    :attachCostReduction(:self);
  }
  on selfDiscard {
    enablePileTriggering;
    const target = :random(:queryAll($.my.character.tag("monster")));
    if (target) {
      :increaseMaxHealth(1, target);
    }
  }
  addTarget $.my.character.tag("monster");
  :characterStatus(LilFungisFuntasticFiestaInEffect, :e.targets[0])
}

/**
 * @id 303248
 * @name 科研的动力（生效中）
 * @description
 * 我方打出当前元素骰费用大于等于3的卡牌后，生成1个随机基础元素骰。
 * 可用次数：3
 */
define combatStatus {
  id 303248 as ThePowerOfResearchInEffect;
  on playCard {
    when :( :e.card.diceCost() >= 3 );
    usage 3;
    :generateDice("randomElement", 1);
  }
}

/**
 * @id 332064
 * @name 科研的动力
 * @description
 * 我方下3次打出当前元素骰费用大于等于3的卡牌后，生成1个随机基础元素骰。
 */
define card {
  id 332064 as ThePowerOfResearch;
  since "v6.7.0";
  cost DiceType.Aligned, 1;
  :combatStatus(ThePowerOfResearchInEffect);
}
