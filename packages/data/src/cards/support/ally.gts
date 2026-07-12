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

import { $, type CardHandle, type CharacterHandle, DamageType, DiceType, type Pair, Reaction, type SkillHandle, type SupportHandle, card, extension, flip, status, summon, type } from "@gi-tcg/core/builder";
import { CalledInForCleanup, CanotilasSupport, CosanzeanasSupport, LaumesSupport, LutinesSupport, OrigamiFlyingSquirrel, OrigamiHamster, PopupPaperFrog, SerenesSupport, SIMULANKA_SUMMONS, SluasisSupport, TaroumarusSavings, ThironasSupport, TopyassSupport, ToyGuard, VirdasSupport } from "../event/other.gts";
import { BattlePlan } from "../../commons.gts";

/**
 * @id 322001
 * @name 派蒙
 * @description
 * 行动阶段开始时：生成2点万能元素。
 * 可用次数：2
 */
define card {
  id 322001 as Paimon;
  since "v3.3.0";
  cost DiceType.Aligned, 3;
  support ally {
    on actionPhase {
      usage 2;
      :generateDice(DiceType.Omni, 2);
    }
  }
}

/**
 * @id 322002
 * @name 凯瑟琳
 * @description
 * 我方执行「切换角色」行动时：将此次切换视为「快速行动」而非「战斗行动」。（每回合1次）
 */
define card {
  id 322002 as Katheryne;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  support ally {
    on beforeFastSwitch {
      usage perRound, 1;
      :e.setFastAction();
    }
  }
}

/**
 * @id 322003
 * @name 蒂玛乌斯
 * @description
 * 入场时：此牌附带2个「合成材料」。如果我方牌组中初始包含至少6张「圣遗物」，则从牌组中随机抽取1张「圣遗物」牌。
 * 结束阶段：此牌补充1个「合成材料」。
 * 打出「圣遗物」手牌时：如可能，则支付等同于「圣遗物」总费用数量的「合成材料」，以免费装备此「圣遗物」。（每回合1次）
 */
define card {
  id 322003 as Timaeus;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
    on enter {
      when :( :player.initialPile.filter((card) => card.tags.includes("artifact")).length >= 6 );
      :drawCards(1, { withTag: "artifact" });
    }
    on endPhase {
      :addVariable("material", 1);
    }
    on deductAllDiceCard {
      when :( :e.hasCardTag("artifact") && :getVariable("material") >= :e.diceCostSize() );
      usage perRound, 1;
      :addVariable("material", -:e.diceCostSize());
      :e.deductAllCost();
    }
  }
}

/**
 * @id 322004
 * @name 瓦格纳
 * @description
 * 入场时：此牌附带2个「锻造原胚」。如果我方牌组中初始包含至少3种不同的「武器」，则从牌组中随机抽取1张「武器」牌。
 * 结束阶段：此牌补充1个「锻造原胚」。
 * 打出「武器」手牌时：如可能，则支付等同于「武器」总费用数量的「锻造原胚」，以免费装备此「武器」。（每回合1次）
 */
define card {
  id 322004 as Wagner;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
    on enter {
      const weaponDefs = :player.initialPile
        .filter((card) => card.tags.includes("weapon"))
        .map((card) => card.id);
      const weaponKinds = new Set(weaponDefs).size;
      if (weaponKinds >= 3) {
        :drawCards(1, { withTag: "weapon" });
      }
    }
    on endPhase {
      :addVariable("material", 1);
    }
    on deductAllDiceCard {
      when :( :e.hasCardTag("weapon") && :getVariable("material") >= :e.diceCostSize() );
      usage perRound, 1;
      :addVariable("material", -:e.diceCostSize());
      :e.deductAllCost();
    }
  }
}

/**
 * @id 322005
 * @name 卯师傅
 * @description
 * 打出「料理」事件牌后：生成1个随机基础元素骰。（每回合1次）
 * 打出「料理」事件牌后：从牌组中随机抽取1张「料理」事件牌。（整场牌局限制1次）
 */
define card {
  id 322005 as ChefMao;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  support ally {
    on playCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 1;
      :generateDice("randomElement", 1);
    }
    on playCard {
      when :( :e.hasCardTag("food") );
      usage 1 {
        autoDispose false;
        visible false;
      };
      :drawCards(1, { withTag: "food" });
    }
  }
}

/**
 * @id 322006
 * @name 阿圆
 * @description
 * 打出「场地」支援牌时：少花费2个元素骰。（每回合1次）
 */
define card {
  id 322006 as Tubby;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("place") );
      usage perRound, 1;
      :e.deductOmniCost(2);
    }
  }
}

/**
 * @id 322007
 * @name 提米
 * @description
 * 每回合自动触发1次：此牌累积1只「鸽子」。如果此牌已累积3只「鸽子」，则弃置此牌，抓1张牌，并生成1点万能元素。
 */
define card {
  id 322007 as Timmie;
  since "v3.3.0";
  support ally {
    variable pigeon, 1;
    on actionPhase {
      :addVariable("pigeon", 1);
      if (:getVariable("pigeon") === 3) {
        :drawCards(1);
        :generateDice(DiceType.Omni, 1);
        :dispose();
      }
    }
  }
}

/**
 * @id 322008
 * @name 立本
 * @description
 * 结束阶段：收集我方未使用的元素骰（每种最多1个）。
 * 行动阶段开始时：如果此牌已收集3个元素骰，则抓2张牌，生成2点万能元素，然后弃置此牌。
 */
define card {
  id 322008 as Liben;
  since "v3.3.0";
  support ally {
    variable collected, 0;
    on endPhase {
      const absorbed = :absorbDice("diff", 3 - :getVariable("collected"));
      :addVariable("collected", absorbed.length);
    }
    on actionPhase {
      if (:getVariable("collected") >= 3) {
        :drawCards(2);
        :generateDice(DiceType.Omni, 2);
        :dispose();
      }
    }
  }
}

/**
 * @id 322009
 * @name 常九爷
 * @description
 * 双方角色使用技能后：如果造成了物理伤害、穿透伤害或引发了元素反应，此牌累积1个「灵感」。如果此牌已累积3个「灵感」，则弃置此牌并抓2张牌。
 */
define card {
  id 322009 as ChangTheNinth;
  since "v3.3.0";
  support ally {
    variable inspiration, 0;
    on useSkill {
      when :( :hasPhaseDamage("all", (e) => e.type === DamageType.Piercing || e.type === DamageType.Physical) || 
          :hasPhaseReaction("all") );
      listenTo all;
      :addVariable("inspiration", 1);
      if (:getVariable("inspiration") >= 3) {
        :drawCards(2);
        :dispose();
      }
    }
  }
}

/**
 * @id 322010
 * @name 艾琳
 * @description
 * 我方角色使用本回合使用过的技能时：少花费1个元素骰。（每回合1次）
 */
define card {
  id 322010 as Ellin;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  support ally {
    on deductOmniDiceSkill {
      when :{
        return (
          :countOfSkill(
            :e.action.skill.caller.definition.id as CharacterHandle,
            :e.action.skill.definition.id as SkillHandle,
          ) > 0
        );
      };
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 322011
 * @name 田铁嘴
 * @description
 * 结束阶段：我方一名充能未满的角色获得1点充能。（出战角色优先）
 * 可用次数：2
 */
define card {
  id 322011 as IronTongueTian;
  since "v3.3.0";
  cost DiceType.Void, 2;
  support ally {
    on endPhase {
      usage 2;
      :gainEnergy(1, "my characters with energy < maxEnergy limit 1");
    }
  }
}

/**
 * @id 322012
 * @name 刘苏
 * @description
 * 我方切换到一个没有充能的角色后：使我方出战角色获得1点充能。（每回合1次）
 * 可用次数：2
 */
define card {
  id 322012 as LiuSu;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  support ally {
    on switchActive {
      when :( :e.switchInfo.to.energy === 0 );
      usage 2;
      usage perRound, 1;
      :gainEnergy(1, "my active");
    }
  }
}

/**
 * @id 322013
 * @name 花散里
 * @description
 * 召唤物消失时：此牌累积1点「大祓」进度。（最多累积3点）
 * 我方打出「武器」或「圣遗物」装备时：如果「大祓」进度已达到3，则弃置此牌，使打出的卡牌少花费2个元素骰。
 */
define card {
  id 322013 as Hanachirusato;
  since "v3.7.0";
  support ally {
    variable progress, 0;
    on dispose {
      when :( :e.entity.definition.type === "summon" );
      listenTo all;
      :addVariableWithMax("progress", 1, 3);
    }
    on deductOmniDiceCard {
      when :( :e.hasOneOfCardTag("weapon", "artifact") && :getVariable("progress") >= 3 );
      :e.deductOmniCost(2);
      :dispose();
    }
  }
}

/**
 * @id 322014
 * @name 鲸井小弟
 * @description
 * 行动阶段开始时：生成1点万能元素。然后，如果对方的支援区未满，则将此牌转移到对方的支援区。
 */
define card {
  id 322014 as KidKujirai;
  since "v3.7.0";
  support ally {
    on actionPhase {
      :generateDice(DiceType.Omni, 1);
      if (:remainingSupportCount("opp") > 0) {
        :moveEntity(:self, {
          type: "supports",
          who: flip(:self.who),
        });
      }
    }
  }
}

/**
 * @id 322015
 * @name 旭东
 * @description
 * 打出「料理」事件牌时：少花费2个元素骰。（每回合1次）
 */
define card {
  id 322015 as Xudong;
  since "v3.7.0";
  cost DiceType.Void, 2;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 1;
      :e.deductOmniCost(2);
    }
  }
}

/**
 * @id 322016
 * @name 迪娜泽黛
 * @description
 * 打出「伙伴」支援牌时：少花费1个元素骰。（每回合1次）
 * 打出「伙伴」支援牌后：从牌组中随机抽取1张「伙伴」支援牌。（整场牌局限制1次）
 */
define card {
  id 322016 as Dunyarzad;
  since "v3.7.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("ally") );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
    on playCard {
      when :( :e.card.id !== :self.id && :e.hasCardTag("ally") );
      usage 1 {
        autoDispose false;
        visible false;
      };
      :drawCards(1, { withTag: "ally" });
    }
  }
}

/**
 * @id 322017
 * @name 拉娜
 * @description
 * 我方角色使用「元素战技」后：生成1个我方下一个后台角色类型的元素骰。（每回合1次）
 */
define card {
  id 322017 as Rana;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  support ally {
    on useSkill {
      when :( :e.isSkillType("elemental") && :$("my next") );
      usage perRound, 1;
      const next = :$("my next")!;
      :generateDice(next.element(), 1);
    }
  }
}

/**
 * @id 322018
 * @name 老章
 * @description
 * 我方打出「武器」手牌时：少花费1个元素骰；我方场上每有1个已装备「武器」的角色，就额外少花费1个元素骰。（每回合1次）
 */
define card {
  id 322018 as MasterZhang;
  since "v3.8.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("weapon") );
      usage perRound, 1;
      const weaponedCh = :$$(
        "my characters has equipment with tag (weapon)",
      ).length;
      :e.deductOmniCost(1 + weaponedCh);
    }
  }
}

/**
 * @id 322019
 * @name 塞塔蕾
 * @description
 * 双方执行任意行动后，我方手牌数量为0时：抓1张牌。
 * 可用次数：3
 */
define card {
  id 322019 as Setaria;
  since "v4.0.0";
  cost DiceType.Aligned, 1;
  support ally {
    on action {
      when :( :player.hands.length === 0 );
      listenTo all;
      usage 3;
      :drawCards(1);
    }
  }
}

/**
 * @id 322020
 * @name 弥生七月
 * @description
 * 我方打出「圣遗物」手牌时：少花费1个元素骰；如果我方场上已有2个已装备「圣遗物」的角色，就额外少花费1个元素骰。（每回合1次）
 */
define card {
  id 322020 as YayoiNanatsuki;
  since "v4.1.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceCard {
      when :( :e.hasCardTag("artifact") );
      usage perRound, 1;
      const artifactedCh = :$$(
        "my characters has equipment with tag (artifact)",
      );
      if (artifactedCh.length >= 2) {
        :e.deductOmniCost(2);
      } else {
        :e.deductOmniCost(1);
      }
    }
  }
}

/**
 * @id 322021
 * @name 玛梅赫
 * @description
 * 我方打出「玛梅赫」以外的「料理」/「场地」/「伙伴」/「道具」行动牌后：随机生成1张「玛梅赫」以外的「料理」/「场地」/「伙伴」/「道具」行动牌，将其加入手牌。（每回合1次）
 * 可用次数：3
 */
define card {
  id 322021 as Mamere;
  since "v4.3.0";
  support ally {
    on playCard {
      when :<boolean>( :e.card.definition.id !== Mamere && :e.hasOneOfCardTag("food", "place", "ally", "item") );
      usage 3;
      usage perRound, 1;
      const tags = ["food", "place", "ally", "item"] as const;
      const candidates = :allCardDefinitions(
        (card) => card.id !== Mamere && tags.some((tag) => card.tags.includes(tag)),
      );
      const card = :random(candidates);
      :createHandCard(card.id as CardHandle);
    }
  }
}

/**
 * @id 302205
 * @name 沙与梦
 * @description
 * 对角色打出「天赋」或角色使用技能时：少花费3个元素骰。
 * 可用次数：1
 */
define status {
  id 302205 as SandsAndDream;
  on deductOmniDice {
    when :( :e.isSkillOrTalentOf(:self.master) );
    usage 1;
    :e.deductOmniCost(3);
  }
}

export const DisposedSupportCountExtension = extension(322022, {
  disposedSupportCount: "pair<number>",
})
  .initialState({
    disposedSupportCount: [0, 0],
  })
  .description("记录本场对局中双方支援区弃置卡牌的数量")
  .mutateWhen("onDispose", (st, e) => {
    if (e.isDiscardOrTuning()) {
      return;
    }
    if (e.entity.definition.type === "support") {
      st.disposedSupportCount[e.who]++;
    }
  })
  .done();

/**
 * @id 322022
 * @name 婕德
 * @description
 * 此牌会记录本场对局中我方支援区弃置卡牌的数量，称为「阅历」。（最多6点）
 * 我方角色使用「元素爆发」后：如果「阅历」至少为6，则弃置此牌，对我方出战角色附属沙与梦。
 * 【此卡含描述变量】
 */
export const Jeht = card(322022)
  .since("v4.4.0")
  .costSame(1)
  .associateExtension(DisposedSupportCountExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.disposedSupportCount[area.who])
  .support("ally")
  .associateExtension(DisposedSupportCountExtension)
  .variable("experience", 0)
  .on("enter")
  .do((c) => {
    c.setVariable("experience", Math.min(c.getExtensionState().disposedSupportCount[c.self.who], 6));
  })
  .on("dispose", (c, e) => e.entity.definition.type === "support")
  .do((c) => {
    c.setVariable("experience", Math.min(c.getExtensionState().disposedSupportCount[c.self.who], 6));
  })
  .on("useSkill", (c, e) =>
    e.isSkillType("burst") &&
    !e.skillCaller.cast<"character">().hasStatus(SandsAndDream) && // 多个婕德不重复触发
    c.getVariable("experience") >= 6,
  )
  .characterStatus(SandsAndDream, "my active")
  .dispose()
  .done();

const DamageTypeCountExtension = extension(322023, {
    damages: type.declare<Pair<DamageType[]>>().type("pair<number[]>")
  })
  .initialState({
    damages: [[], []],
  })
  .description("记录本场对局中双方角色受到过的元素伤害种类")
  .mutateWhen("onDamageOrHeal", (st, e) => {
    if (e.isDamageTypeDamage() &&  e.type !== DamageType.Physical && e.type !== DamageType.Piercing) {
      if (!st.damages[e.targetWho].includes(e.type)) {
        st.damages[e.targetWho].push(e.type);
      }
    }
  })
  .done();

/**
 * @id 322023
 * @name 西尔弗和迈勒斯
 * @description
 * 此牌会记录本场对局中敌方角色受到过的元素伤害种类数，称为「侍从的周到」。（最多4点）
 * 结束阶段：如果「侍从的周到」至少为3，则弃置此牌，然后抓「侍从的周到」点数的牌。
 * 【此卡含描述变量】
 */
export const SilverAndMelus = card(322023)
  .since("v4.4.0")
  .costSame(1)
  .associateExtension(DamageTypeCountExtension)
  .replaceDescription("[GCG_TOKEN_COUNTER]", (_, { area }, ext) => ext.damages[flip(area.who)].length)
  .support("ally")
  .associateExtension(DamageTypeCountExtension)
  .variable("count", 0)
  .on("enter")
  .do((c) => {
    const count = c.getExtensionState().damages[flip(c.self.who)].length;
    c.setVariable("count", Math.min(count, 4));
  })
  .on("damaged", (c, e) => !e.target.isMine())
  .listenToAll()
  .do((c) => {
    const count = c.getExtensionState().damages[flip(c.self.who)].length;
    c.setVariable("count", Math.min(count, 4));
  })
  .on("endPhase")
  .do((c) => {
    const count = c.getVariable("count");
    if (count >= 3) {
      c.drawCards(count);
      c.dispose();
    }
  })
  .done();

/**
 * @id 302201
 * @name 愤怒的太郎丸
 * @description
 * 结束阶段：造成2点物理伤害。
 * 可用次数：2
 */
define summon {
  id 302201 as TaromaruEnraged;
  hint DamageType.Physical, 2;
  on endPhase {
    usage 2;
    :damage(DamageType.Physical, 2);
  }
}

/**
 * @id 322024
 * @name 太郎丸
 * @description
 * 入场时：生成4张太郎丸的存款，均匀地置入我方牌库中。
 * 我方打出2张太郎丸的存款后：弃置此牌，召唤愤怒的太郎丸。
 */
define card {
  id 322024 as Taroumaru;
  since "v4.6.0";
  cost DiceType.Void, 2;
  support ally {
    variable count, 0;
    on enter {
      :createPileCards(TaroumarusSavings, 4, "spaceAround");
    }
    on playCard {
      when :( :e.card.definition.id === TaroumarusSavings );
      :addVariable("count", 1);
      if (:getVariable("count") >= 2) {
        :summon(TaromaruEnraged);
        :dispose();
      }
    }
  }
}

/**
 * @id 322025
 * @name 白手套和渔夫
 * @description
 * 结束阶段：生成1张「清洁工作」，随机将其置入我方牌库顶部5张牌之中。如果此牌的可用次数仅剩余1，则抓1张牌。
 * 可用次数：2
 */
define card {
  id 322025 as TheWhiteGloveAndTheFisherman;
  since "v4.6.0";
  support ally {
    on endPhase {
      usage 2;
      :createPileCards(CalledInForCleanup, 1, "topRange5");
      if (:getVariable("usage") === 1) {
        :drawCards(1);
      }
    }
  }
}

/**
 * @id 322026
 * @name 亚瑟先生
 * @description
 * 我方舍弃或调和1张牌后：此牌累积1点「新闻线索」。（最多累积到2点）
 * 结束阶段：如果此牌已累积2点「新闻线索」，则扣除2点，复制对方牌库顶的1张牌加入我方手牌。
 */
define card {
  id 322026 as SirArthur;
  since "v4.7.0";
  support ally {
    variable clue, 0;
    on disposeOrTuneCard {
      :addVariableWithMax("clue", 1, 2);
    }
    on endPhase {
      when :( :getVariable("clue") >= 2 );
      :addVariable("clue", -2);
      const top = :oppPlayer.pile[0];
      if (top) {
        :createHandCard(top.definition.id as CardHandle);
      }
    }
  }
}

const PUCAS_ALLIES = () => [
  Paimon,
  Katheryne,
  ChefMao,
  Tubby,
  Liben,
  ChangTheNinth,
  Ellin,
  IronTongueTian,
  LiuSu,
  Hanachirusato,
  KidKujirai,
  Xudong,
  Rana,
  MasterZhang,
  Setaria,
  YayoiNanatsuki,
  Mamere,
  SilverAndMelus,
  TheWhiteGloveAndTheFisherman,
  SirArthur,
];

/**
 * @id 302213
 * @name 芙佳的声援
 * @description
 * 随机生成「伙伴」到场上，直到填满双方支援区。
 */
define card {
  id 302213 as PucasSupport;
  since "v4.8.0";
  undiscoverable;
  const myCount = :remainingSupportCount("my");
  const myAllies = :randomSubset(PUCAS_ALLIES(), myCount);
  for (const def of myAllies) {
    :createEntity("support", def, {
      type: "supports",
      who: :self.who
    });
  }
  const oppCount = :remainingSupportCount("opp");
  const oppAllies = :randomSubset(PUCAS_ALLIES(), oppCount);
  for (const def of oppAllies) {
    :createEntity("support", def, {
      type: "supports",
      who: flip(:self.who)
    });
  }
}

const SERENE_SUPPORTS = [
  SerenesSupport,
  LaumesSupport,
  CosanzeanasSupport,
  CanotilasSupport,
  ThironasSupport,
  SluasisSupport,
  VirdasSupport,
  PucasSupport,
  TopyassSupport,
  LutinesSupport,
];

/**
 * @id 322027
 * @name 瑟琳
 * @description
 * 每回合自动触发1次：将1张随机的「美露莘的声援」放入我方手牌。
 * 可用次数：3
 */
define card {
  id 322027 as Serene;
  since "v4.8.0";
  cost DiceType.Void, 2;
  support ally {
    on enter {
      const card = :random(SERENE_SUPPORTS);
      :createHandCard(card);
    }
    on actionPhase {
      usage 2;
      const card = :random(SERENE_SUPPORTS);
      :createHandCard(card);
    }
  }
}

/**
 * @id 322028
 * @name 阿伽娅
 * @description
 * 我方使用「特技」时：少花费1个元素骰。（每回合1次）
 */
define card {
  id 322028 as Atea;
  since "v5.0.0";
  cost DiceType.Aligned, 1;
  support ally {
    on deductOmniDiceTechnique {
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 322029
 * @name 森林的祝福
 * @description
 * 入场时及我方触发元素反应后：从折纸飞鼠、跳跳纸蛙、折纸胖胖鼠中随机生成1张加入手牌。
 */
define card {
  id 322029 as ForestBlessing;
  since "v5.8.0";
  cost DiceType.Void, 2;
  support ally {
    defineSnippet :{
      const newCard = :random([OrigamiFlyingSquirrel, PopupPaperFrog, OrigamiHamster]);
      :createHandCard(newCard);
    };
    on enter {
      :callSnippet();
    }
    on reaction {
      when :( :e.caller.isMine() );
      listenTo all;
      :callSnippet();
    }
  }
}

/**
 * @id 322030
 * @name 预言女神的礼物
 * @description
 * 入场时：生成2张手牌积木小人，并生成2张积木小人，随机置入我方牌组中。
 * 我方打出「希穆兰卡」召唤物后，使其效果量+1。
 * 可用次数：2
 */
define card {
  id 322030 as GiftOfTheGoddessOfProphecy;
  since "v5.8.0";
  cost DiceType.Void, 2;
  support ally {
    on enter {
      :createHandCard(ToyGuard);
      :createHandCard(ToyGuard);
      :createPileCards(ToyGuard, 2, "random");
    }
    on enterRelative {
      when :( :e.entity.definition.type === "summon" &&
          (SIMULANKA_SUMMONS as number[]).includes(:e.entity.definition.id) );
      usage 2;
      :e.entity.cast<"summon">().addVariable("effect", 1);
    }
  }
}

/**
 * @id 322031
 * @name 西摩尔
 * @description
 * 入场时：复制对方牌组顶的1张牌加入我方手牌。
 * 我方打出名称不存在于本局最初牌组的牌时：冒险1次。（每回合1次，最多生效2次）
 */
define card {
  id 322031 as Seymour;
  since "v6.2.0";
  cost DiceType.Aligned, 1;
  support ally {
    on enter {
      const oppTop = :oppPlayer.pile[0];
      if (oppTop) {
        :createHandCard(oppTop.definition.id as CardHandle);
      }
    }
    on playCard {
      when :( !:isInInitialPile(:e.card) );
      usage 2;
      usage perRound, 1;
      :adventure();
    }
  }
}

/**
 * @id 322032
 * @name 玻娜与「绿松石」
 * @description
 * 入场时：冒险1次。
 * 我方使用「特技」后：冒险1次。（每回合1次）
 */
define card {
  id 322032 as BonaAndCocouik;
  since "v6.3.0";
  cost DiceType.Void, 2;
  support ally {
    on enter {
      :adventure();
    }
    on useTechnique {
      usage perRound, 1;
      :adventure();
    }
  }
}

/**
 * @id 302220
 * @name 医疗器材投资·大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到1时，治疗我方受伤最多的角色2点，然后弃置此卡牌。
 */
define card {
  id 302220 as MedicalEquipmentInvestmentGrandPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 1) {
        :heal(2, $.macros.myMostInjured);
        :dispose();
      }
    }
  }
}

/**
 * @id 302221
 * @name 医疗器材投资·特大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到2时，治疗我方受伤最多的角色4点，然后弃置此卡牌。
 */
define card {
  id 302221 as MedicalEquipmentInvestmentMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 2) {
        :heal(4, $.macros.myMostInjured);
        :dispose();
      }
    }
  }
}

/**
 * @id 302222
 * @name 医疗器材投资·超级大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到3时，治疗我方受伤最多的角色6点，然后弃置此卡牌。
 */
define card {
  id 302222 as MedicalEquipmentInvestmentSuperMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 3) {
        :heal(6, $.macros.myMostInjured);
        :dispose();
      }
    }
  }
}

/**
 * @id 302229
 * @name 乐平波琳的医疗器材投资
 * @description
 * 对我方出战角色造成1点穿透伤害，执行1个「治疗」效果相关的计划。
 */
define card {
  id 302229 as LepinepaulinesInvestmentInMedicalEquipment;
  since "v6.5.0";
  undiscoverable;
  const lepine = :query($.my.support.def(LepinePauline));
  if (!lepine) {
    return;
  }
  :damage(DamageType.Piercing, 1, $.my.active);
  const targetPlan = :random([
    MedicalEquipmentInvestmentGrandPlan, 
    MedicalEquipmentInvestmentMegaPlan, 
    MedicalEquipmentInvestmentSuperMegaPlan
  ]);
  :transformDefinition(lepine, targetPlan);
}

/**
 * @id 302223
 * @name 图形对抗投资·大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到1时，抓2张牌，然后弃置此卡牌。
 */
define card {
  id 302223 as GraphAdversarialTechnologyInvestmentGrandPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 1) {
        :drawCards(2);
        :dispose();
      }
    }
  }
}

/**
 * @id 302224
 * @name 图形对抗投资·特大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到2时，抓4张牌，然后弃置此卡牌。
 */
define card {
  id 302224 as GraphAdversarialTechnologyInvestmentMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 2) {
        :drawCards(4);
        :dispose();
      }
    }
  }
}

/**
 * @id 302225
 * @name 图形对抗投资·超级大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到3时，抓6张牌，然后弃置此卡牌。
 */
define card {
  id 302225 as GraphAdversarialTechnologyInvestmentSuperMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 3) {
        :drawCards(6);
        :dispose();
      }
    }
  }
}

/**
 * @id 302230
 * @name 乐平波琳的图形对抗投资
 * @description
 * 舍弃1张随机手牌，执行1个「抓牌」效果相关的计划。
 */
define card {
  id 302230 as LepinepaulinesInvestmentInGraphAdversarialTechnology;
  since "v6.5.0";
  undiscoverable;
  const lepine = :query($.my.support.def(LepinePauline));
  if (!lepine) {
    return;
  }
  const randomCard = :random(:player.hands);
  if (randomCard) {
    :disposeCard(randomCard);
    const targetPlan = :random([
      GraphAdversarialTechnologyInvestmentGrandPlan, GraphAdversarialTechnologyInvestmentMegaPlan, GraphAdversarialTechnologyInvestmentSuperMegaPlan
    ]);
    :transformDefinition(lepine, targetPlan);
  } else {
    :dispose(lepine);
  }
}

/**
 * @id 302226
 * @name 能量机关投资·大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到1时，获得1个随机基础元素骰，然后弃置此卡牌。
 */
define card {
  id 302226 as EnergyMechanismInvestmentGrandPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 1) {
        :generateDice("randomElement", 1);
        :dispose();
      }
    }
  }
}

/**
 * @id 302227
 * @name 能量机关投资·特大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到2时，获得2个随机基础元素骰，然后弃置此卡牌。
 */
define card {
  id 302227 as EnergyMechanismInvestmentMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 2) {
        :generateDice("randomElement", 2);
        :dispose();
      }
    }
  }
}

/**
 * @id 302228
 * @name 能量机关投资·超级大计划
 * @description
 * 行动阶段开始时：此卡牌累计1点「进度」。「进度」达到3时，获得3个随机基础元素骰，然后弃置此卡牌。
 */
define card {
  id 302228 as EnergyMechanismInvestmentSuperMegaPlan;
  undiscoverable;
  support ally {
    variable progress, 0;
    on actionPhase {
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 3) {
        :generateDice("randomElement", 3);
        :dispose();
      }
    }
  }
}

/**
 * @id 302231
 * @name 乐平波琳的能量机关投资
 * @description
 * 移除我方1个元素骰，执行1个「元素骰」效果相关的计划。
 */
define card {
  id 302231 as LepinepaulinesInvestmentInEnergyMechanism;
  since "v6.5.0";
  undiscoverable;
  const lepine = :query($.my.support.def(LepinePauline));
  if (!lepine) {
    return;
  }
  const absorbed = :absorbDice("seq", 1);
  if (absorbed.length > 0) {
    const targetPlan = :random([
      EnergyMechanismInvestmentGrandPlan, 
      EnergyMechanismInvestmentMegaPlan, 
      EnergyMechanismInvestmentSuperMegaPlan
    ]);
    :transformDefinition(lepine, targetPlan);
  } else {
    :dispose(lepine);
  }
}


/**
 * @id 322033
 * @name 乐平波琳
 * @description
 * 入场时：挑选1个投资计划。
 */
define card {
  id 322033 as LepinePauline;
  since "v6.5.0";
  support ally {
    variable progress, 0; // for transformed plans to use
    on enter {
      :selectAndPlay([
          LepinepaulinesInvestmentInMedicalEquipment,
          LepinepaulinesInvestmentInGraphAdversarialTechnology,
          LepinepaulinesInvestmentInEnergyMechanism,
        ]);
    }
  }
}

/**
 * @id 322034
 * @name 涅朵奇卡
 * @description
 * 我方触发月感电或月绽放反应时：我方出战角色附属战斗计划。（每回合1次）
 */
define card {
  id 322034 as Netochka;
  since "v6.6.0";
  cost DiceType.Aligned, 1;
  support ally {
    on dealReaction {
      when :( ([Reaction.LunarElectroCharged, Reaction.LunarBloom] as Reaction[]).includes(:e.type) );
      usage perRound, 1;
      :characterStatus(BattlePlan, $.my.active);
    }
  }
}
