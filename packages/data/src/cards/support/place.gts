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

import { $, DamageType, DiceType, type EntityState, card, combatStatus, originalDiceCostOfCard, status } from "@gi-tcg/core/builder";
import { ForbiddenKnowledge, OrigamiFlyingSquirrel, OrigamiHamster, PopupPaperFrog, SIMULANKA_QUERY, ToyGuard, ToyGuardSummon } from "../event/other.gts";
import { BattlePlan, CostReduction, Empowerment, IneffectiveWhenPlayed, NoTuningAllowed } from "../../commons.gts";

/**
 * @id 321001
 * @name 璃月港口
 * @description
 * 结束阶段：抓2张牌。
 * 可用次数：2
 */
define card {
  id 321001 as LiyueHarborWharf;
  since "v3.3.0";
  cost DiceType.Aligned, 2;
  support place {
    on endPhase {
      usage 2;
      :drawCards(2);
    }
  }
}

/**
 * @id 321002
 * @name 骑士团图书馆
 * @description
 * 入场时：选择任意元素骰重投。
 * 投掷阶段：获得额外一次重投机会。
 */
define card {
  id 321002 as KnightsOfFavoniusLibrary;
  since "v3.3.0";
  support place {
    on enter {
      :rerollDice(1);
    }
    on roll {
      :e.addRerollCount(1);
    }
  }
}

/**
 * @id 321003
 * @name 群玉阁
 * @description
 * 投掷阶段：2个元素骰初始总是投出我方出战角色类型的元素。
 * 行动阶段开始时：如果我方手牌数量不多于3，则弃置此牌，生成1个万能元素。
 */
define card {
  id 321003 as JadeChamber;
  since "v3.3.0";
  support place {
    on roll {
      :e.fixDice(:$("my active")!.element(), 2);
    }
    on actionPhase {
      when :( :player.hands.length <= 3 );
      :generateDice(DiceType.Omni, 1);
      :dispose();
    }
  }
}

/**
 * @id 321004
 * @name 晨曦酒庄
 * @description
 * 我方执行「切换角色」行动时：少花费1个元素骰。（每回合2次）
 */
define card {
  id 321004 as DawnWinery;
  since "v3.3.0";
  cost DiceType.Void, 3;
  support place {
    on deductOmniDiceSwitch {
      usage perRound, 2;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 321005
 * @name 望舒客栈
 * @description
 * 结束阶段：治疗受伤最多的我方后台角色2点。
 * 可用次数：2
 */
export const WangshuInn = card(321005)
  .since("v3.3.0")
  .costSame(2)
  .support("place")
  .hint(DamageType.Heal, "2")
  .on("endPhase", (c) => c.$(`my standby with health < maxHealth`))
  .usage(2)
  .heal(2, "my standby characters order by health - maxHealth limit 1")
  .done();

/**
 * @id 321006
 * @name 西风大教堂
 * @description
 * 结束阶段：治疗我方「出战角色」2点。
 * 可用次数：2
 */
export const FavoniusCathedral = card(321006)
  .since("v3.3.0")
  .costSame(2)
  .support("place")
  .hint(DamageType.Heal, "2")
  .on("endPhase", (c) => c.$(`my active with health < maxHealth`))
  .usage(2)
  .heal(2, "my active")
  .done();

/**
 * @id 321007
 * @name 天守阁
 * @description
 * 行动阶段开始时：如果我方的元素骰包含5种不同的元素，则生成1个万能元素。
 */
define card {
  id 321007 as Tenshukaku;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  support place {
    on actionPhase {
      when :{
        let omniCount = 0;
        const nonOmniDice = new Set<DiceType>();
        for (const d of :player.dice) {
          if (d === DiceType.Omni) {
            omniCount++;
          } else {
            nonOmniDice.add(d);
          }
        }
        return omniCount + nonOmniDice.size >= 5;
      };
      :generateDice(DiceType.Omni, 1);
    }
  }
}

/**
 * @id 321008
 * @name 鸣神大社
 * @description
 * 我方角色使用技能后：如果元素骰总数为奇数，则生成1个万能元素。（每回合2次）
 */
define card {
  id 321008 as GrandNarukamiShrine;
  since "v3.6.0";
  cost DiceType.Void, 3;
  support place {
    on useSkill {
      when :( :player.dice.length % 2 === 1 );
      usage perRound, 2 {
        visible;
      };
      :abortPreview(); // 官方也中断，因为预览的时候骰子数目不对
      :generateDice(DiceType.Omni, 1);
    }
  }
}

/**
 * @id 321009
 * @name 珊瑚宫
 * @description
 * 结束阶段：治疗所有我方角色1点。
 * 可用次数：2
 */
export const SangonomiyaShrine = card(321009)
  .since("v3.7.0")
  .costSame(2)
  .support("place")
  .hint(DamageType.Heal, "1")
  .on("endPhase", (c) => c.$(`my characters with health < maxHealth`))
  .usage(2)
  .heal(1, "all my characters")
  .done();

/**
 * @id 321010
 * @name 须弥城
 * @description
 * 我方打出「天赋」牌或我方角色使用技能时：如果我方元素骰数量不多于手牌数量，则少花费1个元素骰。（每回合1次）
 */
define card {
  id 321010 as SumeruCity;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  support place {
    on deductOmniDice {
      when :( (:e.isUseSkill() || :e.hasCardTag("talent")) &&
          (:player.dice.length <= :player.hands.length) );
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 321011
 * @name 桓那兰那
 * @description
 * 结束阶段：收集最多2个未使用的元素骰。
 * 行动阶段开始时：拿回此牌所收集的元素骰。
 */
define card {
  id 321011 as Vanarana;
  since "v3.7.0";
  support place {
    variable count, 0;
    variable d1, 0 {
      visible false;
    };
    variable d2, 0 {
      visible false;
    };
    on endPhase {
      const absorbed = :absorbDice("seq", 2);
      :setVariable("count", absorbed.length);
      :setVariable("d1", absorbed[0] ?? 0);
      :setVariable("d2", absorbed[1] ?? 0);
    }
    on actionPhase {
      if (:getVariable("count") === 2) {
        :generateDice(:getVariable("d1"), 1);
        :generateDice(:getVariable("d2"), 1);
      } else if (:getVariable("count") === 1) {
        :generateDice(:getVariable("d1"), 1);
      }
      :setVariable("count", 0);
    }
  }
}

/**
 * @id 321012
 * @name 镇守之森
 * @description
 * 我方选择行动前：如果当前元素骰总数为偶数，则我方角色「普通攻击」少花费1个无色元素。
 * 可用次数：4
 */
define card {
  id 321012 as ChinjuForest;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  support place {
    on deductVoidDiceSkill {
      when :( :e.isChargedAttack() );
      usage 4;
      :e.deductVoidCost(1);
    }
  }
}

/**
 * @id 321013
 * @name 黄金屋
 * @description
 * 我方打出当前元素骰费用至少为3的「武器」或「圣遗物」手牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
define card {
  id 321013 as GoldenHouse;
  since "v4.0.0";
  support place {
    on deductOmniDiceCard {
      when :( :e.hasOneOfCardTag("weapon", "artifact") &&
          :e.currentDiceCostSize() >= 3 );
      usage perRound, 1;
      usage 2;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 321014
 * @name 化城郭
 * @description
 * 我方选择行动前，元素骰数量为0时：生成1个万能元素。（每回合1次）
 * 可用次数：3
 */
define card {
  id 321014 as GandharvaVille;
  since "v4.1.0";
  cost DiceType.Aligned, 1;
  support place {
    on beforeAction {
      when :( :player.dice.length === 0 );
      usage 3;
      usage perRound, 1;
      :generateDice(DiceType.Omni, 1);
    }
  }
}

/**
 * @id 321015
 * @name 风龙废墟
 * @description
 * 入场时：从牌组中随机抽取1张「天赋」牌。
 * 我方打出「天赋」牌，或我方角色使用原本元素骰消耗至少为4的技能时：少花费1个元素骰。（每回合1次）
 * 可用次数：3
 */
define card {
  id 321015 as StormterrorsLair;
  since "v4.2.0";
  cost DiceType.Aligned, 2;
  support place {
    on enter {
      :drawCards(1, { withTag: "talent" });
    }
    on deductOmniDice {
      when :{
        return :e.hasCardTag("talent") ||
          (:e.isUseSkill() && :e.currentDiceCostSize() >= 4);
      };
      usage 3;
      usage perRound, 1;
      :e.deductOmniCost(1);
    }
  }
}

/**
 * @id 321016
 * @name 湖中垂柳
 * @description
 * 结束阶段：如果我方手牌数量不多于2，则抓2张牌。
 * 可用次数：2
 */
define card {
  id 321016 as WeepingWillowOfTheLake;
  since "v4.3.0";
  cost DiceType.Aligned, 1;
  support place {
    on endPhase {
      when :( :player.hands.length <= 2 );
      usage 2;
      :drawCards(2);
    }
  }
}

/**
 * @id 321017
 * @name 欧庇克莱歌剧院
 * @description
 * 我方选择行动前：如果我方角色所装备卡牌的原本元素骰费用总和不比对方更低，则生成1个出战角色类型的元素骰。（每回合1次）
 * 可用次数：3
 */
define card {
  id 321017 as OperaEpiclese;
  since "v4.3.0";
  cost DiceType.Aligned, 1;
  support place {
    on beforeAction {
      when :{
        function costOfEquipment(equipment: EntityState) {
          const cardDef = :data.entities.get(equipment.definition.id)!;
          return originalDiceCostOfCard(cardDef);
        }
        const myCost = :$$(`my equipments`).map((entity) => costOfEquipment(entity)).reduce((a, b) => a + b, 0);
        const oppCost = :$$(`opp equipments`).map((entity) => costOfEquipment(entity)).reduce((a, b) => a + b, 0);
        return myCost >= oppCost;
      };
      usage 3;
      usage perRound, 1;
      :generateDice(:$("my active")!.element(), 1);
    }
  }
}

/**
 * @id 301018
 * @name 严格禁令
 * @description
 * 本回合中，所在阵营打出的事件牌无效。
 * 可用次数：1
 */
define combatStatus {
  id 301018 as StrictProhibited;
  tags eventEffectless;
  oneDuration;
  on playCard {
    when :( :e.card.definition.type === "eventCard" );
    usage 1;
  }
}

/**
 * @id 321018
 * @name 梅洛彼得堡
 * @description
 * 我方出战角色受到伤害或治疗后：此牌累积1点「禁令」（可叠加，最多叠加到6）。如果此牌已有6点禁令，则消耗6点，赋予对方1张随机手牌无效化。
 */
define card {
  id 321018 as FortressOfMeropide;
  since "v4.5.0";
  cost DiceType.Aligned, 1;
  support place {
    variable forbidden, 0;
    on damagedOrHealed {
      when :( :e.target.isActive() );
      :addVariableWithMax("forbidden", 1, 6);
      if (:getVariable("forbidden") >= 6 && :oppPlayer.hands.length > 0) {
        :addVariable("forbidden", -6);
        const candidates = :oppPlayer.hands.filter(
          (card) => !card.withAttachment(IneffectiveWhenPlayed)
        );
        const target = :random(candidates);
        if (target) {
          :attach(IneffectiveWhenPlayed, target);
        }
      }
    }
  }
}

/**
 * @id 301019
 * @name 悠远雷暴
 * @description
 * 结束阶段：对所附属角色造成2点穿透伤害。
 * 可用次数：1
 */
define status {
  id 301019 as DistantStorm;
  on endPhase {
    usage 1;
    :damage(DamageType.Piercing, 2, "@master");
  }
}

/**
 * @id 321019
 * @name 清籁岛
 * @description
 * 任意阵营的角色受到治疗后：使该角色附属悠远雷暴。（结束阶段受到2点穿透伤害，可用1次）
 * 持续回合：2
 */
define card {
  id 321019 as SeiraiIsland;
  since "v4.6.0";
  cost DiceType.Aligned, 1;
  support place {
    duration 2;
    on healed {
      listenTo all;
      :characterStatus(DistantStorm, :e.target);
    }
  }
}

/**
 * @id 301022
 * @name 赤王陵（生效中）
 * @description
 * 直到本回合结束前，所在阵营每抓1张牌，就立刻生成1张禁忌知识，随机地置入牌库中。
 */
define combatStatus {
  id 301022 as TheMausoleumOfKingDeshretInEffect;
  oneDuration;
  on enter {
    :createPileCards(ForbiddenKnowledge, 2, "top");
  }
  on drawCard {
    :createPileCards(ForbiddenKnowledge, 1, "random");
  }
}

/**
 * @id 321020
 * @name 赤王陵
 * @description
 * 对方累积抓4张牌后：弃置此牌，在对方牌库顶生成2张禁忌知识。然后直到本回合结束前，对方每抓1张牌，就立刻生成1张禁忌知识，随机地置入对方牌库中。
 */
define card {
  id 321020 as TheMausoleumOfKingDeshret;
  since "v4.7.0";
  cost DiceType.Aligned, 1;
  support place {
    variable drawnCardCount, 0;
    on drawCard {
      when :( :e.who !== :self.who );
      listenTo all;
      :addVariable("drawnCardCount", 1);
      if (:getVariable("drawnCardCount") === 4) {
        :combatStatus(TheMausoleumOfKingDeshretInEffect, "opp");
        :dispose();
      }
    }
  }
}

/**
 * @id 321021
 * @name 中央实验室遗址
 * @description
 * 我方舍弃或调和1张牌后：此牌累积1点「实验进展」。每当「实验进展」达到3点、6点、9点时，就获得1个万能元素。然后，如果「实验进展」至少为9点，则弃置此牌。
 */
define card {
  id 321021 as CentralLaboratoryRuins;
  since "v4.7.0";
  cost DiceType.Aligned, 1;
  support place {
    variable progress, 0;
    on disposeOrTuneCard {
      :addVariable("progress", 1);
      const progress = :getVariable("progress");
      if (progress % 3 === 0) {
        :generateDice(DiceType.Omni, 1);
      }
      if (progress >= 9) {
        :dispose();
      }
    }
  }
}

/**
 * @id 301023
 * @name 圣火竞技场（生效中）
 * @description
 * 角色造成的伤害+1。
 * 持续回合：2
 */
define status {
  id 301023 as StadiumOfTheSacredFlameInEffect;
  duration 2;
  on increaseSkillDamage {
    :e.increaseDamage(1);
  }
}

/**
 * @id 321022
 * @name 圣火竞技场
 * @description
 * 我方使用技能或特技后：此牌累积1点「角逐之焰」。
 * 「角逐之焰」达到2时：生成1个随机基础元素骰。
 * 达到4时：治疗我方出战角色2点。
 * 达到6时：弃置此牌，使当前的我方出战角色在2回合内造成的伤害+1。
 */
define card {
  id 321022 as StadiumOfTheSacredFlame;
  since "v5.0.0";
  cost DiceType.Aligned, 2;
  support place {
    variable flame, 0;
    on useSkillOrTechnique {
      :addVariable("flame", 1);
      const flame = :getVariable("flame");
      switch (flame) {
        case 2: {
          :generateDice("randomElement", 1);
          break;
        }
        case 4: {
          :heal(2, "my active");
          break;
        }
        case 6: {
          :characterStatus(StadiumOfTheSacredFlameInEffect, "my active");
          :dispose();
          break;
        }
      }
    }
  }
}

/**
 * @id 133087
 * @name 中央实验室旧址
 * @description
 * 我方舍弃或调和1张牌后：此牌累积1点「实验进展」。每当「实验进展」达到3点、6点、9点时，就获得1个万能元素。然后，如果「实验进展」至少为9点，则弃置此牌。
 */
define card {
  id 133087 as FormerSiteOfTheCentralLaboratory; // 骗骗花
  reserved;
}

/**
 * @id 133088
 * @name 西风教堂
 * @description
 * 结束阶段：治疗我方「出战角色」2点。
 * 可用次数：2
 */
define card {
  id 133088 as FakeFavoniusCathedral; // 骗骗花
  reserved;
}

/**
 * @id 321023
 * @name 特佩利舞台
 * @description
 * 我方打出名称不存在于本局最初牌组的牌时：此牌累积1点「瞩目」。
 * 敌方打出名称不存在于本局最初牌组的牌时：此牌扣除1点「瞩目」。
 * 行动阶段开始时：如果此牌有至少3点「瞩目」，则生成1个随机基础元素骰；如果此牌有至少1点「瞩目」，将1个元素骰转换为万能元素。
 */
define card {
  id 321023 as StageTepetl;
  since "v5.1.0";
  support place {
    variable attention, 0;
    on playCard {
      listenTo all;
      const isMine = :e.who === :self.who;
      const player = isMine ? :player : :oppPlayer;
      if (!player.initialPile.some((card) => card.id === :e.card.definition.id)) {
        if (isMine) {
          :addVariable("attention", 1);
        } else if (:getVariable("attention") > 0) {
          :addVariable("attention", -1);
        }
      }
    }
    on actionPhase {
      const attention = :getVariable("attention");
      if (attention >= 3) {
        :generateDice("randomElement", 1);
      }
      if (attention >= 1) {
        :convertDice(DiceType.Omni, 1);
      }
    }
  }
}

/**
 * @id 321024
 * @name 「悬木人」
 * @description
 * 我方打出名称不存在于本局最初牌组的牌时：如果打出的牌当前元素骰费用不低于此牌的「极限运动点」，则生成1个随机基础元素骰，然后此牌累积1个「极限运动点」。
 */
define card {
  id 321024 as ScionsOfTheCanopy;
  since "v5.2.0";
  support place {
    variable point, 1; // 神奇
    on playCard {
      when :( !:isInInitialPile(:e.card) && :e.card.diceCost() >= :getVariable("point") );
      :generateDice("randomElement", 1);
      :addVariable("point", 1);
    }
  }
}

/**
 * @id 321025
 * @name 「流泉之众」
 * @description
 * 我方「召唤物」入场时：使其可用次数+1。
 * 可用次数：3
 */
define card {
  id 321025 as PeopleOfTheSprings;
  since "v5.3.0";
  cost DiceType.Aligned, 2;
  support place {
    on enterRelative {
      when :( :e.entity.definition.type === "summon" );
      usage 3;
      const target = :query($.my.summon.id(:e.entity.id));
      target?.addVariable("usage", 1);
    }
  }
}

/**
 * @id 301024
 * @name 「花羽会」（生效中）
 * @description
 * 下次切换至前台时，回复1个对应元素的骰子。（可叠加，每次触发一层）
 */
define status {
  id 301024 as FlowerfeatherClanInEffect;
  on switchActive {
    when :( :self.master.id === :e.switchInfo.to.id );
    usage 1 {
      append;
    };
    const element = :self.master.element();
    :generateDice(element, 1);
  }
}

/**
 * @id 321026
 * @name 「花羽会」
 * @description
 * 我方舍弃2张卡牌后：我方下一个后台角色获得1层“下次切换至前台时，回复1个对应元素的骰子”。（可叠加，每次触发1层）
 */
define card {
  id 321026 as FlowerfeatherClan;
  since "v5.4.0";
  support place {
    variable disposedCardCount, 0;
    on disposeCard {
      :addVariable("disposedCardCount", 1);
    }
    on disposeCard {
      when :( :getVariable("disposedCardCount") >= 2 );
      :setVariable("disposedCardCount", 0);
      :characterStatus(FlowerfeatherClanInEffect, "my next");
    }
  }
}

/**
 * @id 321027
 * @name 「烟谜主」
 * @description
 * 此牌初始具有4点灵觉。
 * 我方挑选后：灵觉-1。
 * 行动阶段开始时：若灵觉为0，则移除自身，然后从3个随机元素骰费用为2的支援牌中挑选一个生成。
 */
define card {
  id 321027 as MastersOfTheNightwind;
  since "v5.5.0";
  support place {
    variable intuition, 4;
    on selectCard {
      const newValue = Math.max(0, :getVariable("intuition") - 1);
      :setVariable("intuition", newValue);
    }
    on actionPhase {
      when :( :getVariable("intuition") === 0 );
      const cards = :allCardDefinitions("support").filter((card) => originalDiceCostOfCard(card) === 2);
      const candidates = :randomSubset(cards, 3);
      :selectAndPlay(candidates);
      :dispose();
    }
  }
}

/**
 * @id 301025
 * @name 锻炼
 * @description
 * 自身层数到达3时，治疗所附属角色1点；若自身层数等于5，则所附属角色造成的伤害+1。（可叠加，最多叠加到5层）
 */
define status {
  id 301025 as Exercise;
  variable layer, 2 {
    append 5;
  };
  on enter {
    when :( (:e.overridden?.variables.layer ?? 0) < 3 && :getVariable("layer") >= 3 );
    :heal(1, "@master");
  }
  on increaseSkillDamage {
    when :( :getVariable("layer") === 5 );
    :e.increaseDamage(1);
  }
}

/**
 * @id 321028
 * @name 「沃陆之邦」
 * @description
 * 我方角色准备技能时：此角色获得3点锻炼。
 * 我方角色切换为出战角色后：此角色获得2点锻炼。
 * （当锻炼层数到达3点时，治疗对应角色1点；当锻炼层数到达5点时，对应角色所造成的伤害+1）
 */
define card {
  id 321028 as CollectiveOfPlenty;
  since "v5.6.0";
  cost DiceType.Void, 3;
  support place {
    on enterRelative {
      when :( :e.entity.definition.type === "status" &&
          :e.entity.definition.tags.includes("preparingSkill") );
      const ch = :e.entity.cast<"status">().master;
      :characterStatus(Exercise, ch, {
        overrideVariables: {
          layer: 3
        }
      });
    }
    on switchActive {
      :characterStatus(Exercise, "@event.switchTo");
    }
  }
}

/**
 * @id 321029
 * @name 墨色酒馆
 * @description
 * 入场时：从折纸飞鼠、跳跳纸蛙、折纸胖胖鼠中随机生成1张手牌。
 * 我方宣布结束时：随机触发我方1个「希穆兰卡」召唤物的「结束阶段」效果。
 * 可用次数：3
 */
define card {
  id 321029 as CalligraphyTavern;
  since "v5.8.0";
  cost DiceType.Void, 2;
  support place {
    on enter {
      const newCard = :random([OrigamiFlyingSquirrel, PopupPaperFrog, OrigamiHamster]);
      :createHandCard(newCard);
    }
    on declareEnd {
      when :( :$(SIMULANKA_QUERY) );
      usage 3;
      const mySimulankaSummons = :$$(SIMULANKA_QUERY);
      const chosen = :random(mySimulankaSummons);
      if (chosen) {
        :triggerEndPhaseSkill(chosen);
      }
    }
  }
}

/**
 * @id 301032
 * @name 星轨王城（生效中）
 * @description
 * 下次打出积木小人少花费1个元素骰。
 */
define combatStatus {
  id 301032 as ConstellationMetropoleInEffect01;
  once deductOmniDiceCard {
    when :( :e.action.skill.caller.definition.id === ToyGuard );
    :e.deductOmniCost(1);
  }
}

/**
 * @id 301037
 * @name 星轨王城（生效中）
 * @description
 * 下次打出的积木小人效果量+1。
 */
define combatStatus {
  id 301037 as ConstellationMetropoleInEffect02;
  once enterRelative {
    when :( :e.entity.definition.id === ToyGuardSummon );
    :e.entity.cast<"summon">().addVariable("effect", 1);
  }
}

/**
 * @id 321030
 * @name 星轨王城
 * @description
 * 入场时：生成手牌积木小人。
 * 我方角色使用「元素战技」后：下次打出积木小人少花费1个元素骰。（不可叠加）
 * 我方角色使用「元素爆发」后：下次打出的积木小人效果量+1。（不可叠加）
 */
define card {
  id 321030 as ConstellationMetropole;
  since "v5.8.0";
  cost DiceType.Aligned, 2;
  support place {
    on enter {
      :createHandCard(ToyGuard);
    }
    on useSkill {
      listenTo samePlayer;
      if (:e.isSkillType("elemental")){
        :combatStatus(ConstellationMetropoleInEffect01);
      } else if (:e.isSkillType("burst")){
        :combatStatus(ConstellationMetropoleInEffect02);
      }
    }
  }
}

/**
 * @id 321031
 * @name 冒险家协会
 * @description
 * 结束阶段：冒险1次。
 * 可用次数：3
 */
define card {
  id 321031 as AdventurersGuild;
  since "v6.1.0";
  cost DiceType.Aligned, 2;
  support place {
    on endPhase {
      usage 3 {
        autoDispose false;
      };
      :adventure();
    }
    on adventure {
      when :( :getVariable("usage") === 0 );
      :dispose();
    }
  }
}

/**
 * @id 321035
 * @name 银月之庭
 * @description
 * 我方卡牌被赋予费用降低或赋能时：累计1点计数。
 * 行动阶段开始，且此卡牌计数达到3时：移除3点计数，生成1个随机基础元素骰。
 */
define card {
  id 321035 as SilvermoonHall;
  since "v6.4.0";
  support place {
    variable count, 0;
    on enterRelative {
      when :( ([CostReduction, Empowerment] as number[]).includes(:e.entity.definition.id) );
      :addVariable("count", 1);
    }
    on actionPhase {
      when :( :getVariable("count") >= 3 );
      :addVariable("count", -3);
      :generateDice("randomElement", 1);
    }
  }
}

/**
 * @id 321036
 * @name 汐印石
 * @description
 * 行动阶段开始时：赋予敌方随机1张手牌费用增加和不可调和。
 * 可用次数：2
 */
define card {
  id 321036 as TidesealStone;
  since "v6.4.0";
  support place {
    on actionPhase {
      when :( :oppPlayer.hands.length > 0 );
      usage 2;
      const target = :random(:oppPlayer.hands);
      :attachCostIncrease(target);
      :attach(NoTuningAllowed, target);
    }
  }
}

/**
 * @id 321037
 * @name 霜月之坊
 * @description
 * 入场时：抓2张牌，治疗我方受伤最多的角色2点。
 * 结束阶段：赋予我方随机2张手牌费用降低。
 * 可用次数：2
 */
define card {
  id 321037 as FrostmoonEnclave;
  since "v6.4.0";
  cost DiceType.Aligned, 4;
  support place {
    on enter {
      :drawCards(2);
      :heal(2, "my characters order by health - maxHealth limit 1");
    }
    on endPhase {
      usage 2;
      const chosen = :randomSubset(:queryAll($.macros.myHandsNotFree), 2);
      for (const card of chosen) {
        :attachCostReduction(card);
      }
    }
  }
}

/**
 * @id 321038
 * @name 那夏镇
 * @description
 * 结束阶段：赋予我方随机2张当前元素骰费用大于等于2的手牌赋能。
 * 可用次数：2
 * 此卡牌被弃置时：如果可用次数为0，造成2点物理伤害。
 */
define card {
  id 321038 as NashaTown;
  since "v6.4.0";
  cost DiceType.Aligned, 1;
  support place {
    on endPhase {
      usage 2;
      const candidates = :player.hands.filter(
        (card) => card.diceCost() >= 2 && !card.empowered()
      );
      const chosen = :randomSubset(candidates, 2);
      for (const card of chosen) {
        :attach(Empowerment, card);
      }
    }
    on selfDispose {
      when :( :getVariable("usage") === 0 );
      :damage(DamageType.Physical, 2);
    }
  }
}

/**
 * @id 321039
 * @name 月矩力试验设计局
 * @description
 * 结束阶段：赋予我方牌组中随机2张牌赋能。
 * 可用次数：2
 * 此卡牌在场上被弃置时：抓2张赋予了赋能的卡牌，并使我方出战角色附属1层战斗计划。
 */
define card {
  id 321039 as KuuvahkiExperimentalDesignBureau;
  since "v6.4.0";
  cost DiceType.Aligned, 2;
  support place {
    on endPhase {
      usage 2;
      const chosen = :randomSubset(
        :player.pile.filter((card) => !card.empowered()),
        2
      );
      for (const card of chosen) {
        :attach(Empowerment, card);
      }
    }
    on selfDispose {
      when :( !:e.isDiscardOrTuning() );
      :drawCards(2, { withAttachment: Empowerment });
      :characterStatus(BattlePlan, "my active");
    }
  }
}

/**
 * @id 321041
 * @name 噩梦的预兆
 * @description
 * 打出及行动阶段开始时：赋予敌方手牌中1张当前元素骰费用最高的手牌费用增加，并赋予我方牌组顶的牌费用增加。
 */
define card {
  id 321041 as NightmareOmen;
  since "v6.7.0";
  support place {
    defineSnippet :{
      const [oppTarget] = :maxCostHands(1, { who: "opp" });
      if (oppTarget) {
        :attachCostIncrease(oppTarget);
      }
      const myPileTop = :player.pile[0];
      if (myPileTop) {
        :attachCostIncrease(myPileTop);
      }
    }
    on enter {
      :callSnippet();
    }
    on actionPhase {
      :callSnippet();
    }
  }
}
