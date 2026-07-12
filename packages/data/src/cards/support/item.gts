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

import { DamageType, DiceType, card, combatStatus, extension } from "@gi-tcg/core/builder";
import { AgileSwitch, EfficientSwitch } from "../../commons.gts";

/**
 * @id 323001
 * @name 参量质变仪
 * @description
 * 双方角色使用技能后：如果造成了元素伤害，此牌累积1个「质变进度」。如果此牌已累积3个「质变进度」，则弃置此牌并生成3个不同的基础元素骰。
 */
define card {
  id 323001 as ParametricTransformer;
  since "v3.3.0";
  cost DiceType.Void, 2;
  support item {
    variable progress, 0;
    on useSkill {
      when :( :hasPhaseDamage("all", (e) => e.type !== DamageType.Piercing && e.type !== DamageType.Physical) );
      listenTo all;
      :addVariable("progress", 1);
      if (:getVariable("progress") >= 3) {
        :generateDice("randomElement", 3);
        :dispose();
        return;
      }
    }
  }
}

/**
 * @id 323002
 * @name 便携营养袋
 * @description
 * 入场时：从牌组中随机抽取1张「料理」事件。
 * 我方打出「料理」事件牌时：从牌组中随机抽取1张「料理」事件牌。（每回合1次）
 */
define card {
  id 323002 as Nre;
  since "v3.3.0";
  cost DiceType.Aligned, 1;
  support item {
    on enter {
      :drawCards(1, { withTag: "food" });
    }
    on playCard {
      when :( :e.hasCardTag("food") );
      usage perRound, 1;
      :drawCards(1, { withTag: "food" });
    }
  }
}

/**
 * @id 302303
 * @name 红羽团扇（生效中）
 * @description
 * 本回合中，我方执行的下次「切换角色」行动视为「快速行动」而非「战斗行动」，并且少花费1个元素骰。
 */
define combatStatus {
  id 302303 as RedFeatherFanStatus;
  oneDuration;
  variable triggered, 0 {
    visible false;
  };
  on deductOmniDiceSwitch {
    :e.deductOmniCost(1);
    :setVariable("triggered", 1);
  }
  on beforeFastSwitch {
    :e.setFastAction();
    :setVariable("triggered", 1);
  }
  on switchActive {
    when :( :getVariable("triggered") );
    :dispose();
  }
}

/**
 * @id 323003
 * @name 红羽团扇
 * @description
 * 我方切换角色后：我方获得1层高效切换和敏捷切换。（每回合1次）
 */
define card {
  id 323003 as RedFeatherFan;
  since "v3.7.0";
  cost DiceType.Aligned, 2;
  support item {
    on switchActive {
      usage perRound, 1;
      :combatStatus(EfficientSwitch);
      :combatStatus(AgileSwitch);
    }
  }
}

/**
 * @id 323004
 * @name 寻宝仙灵
 * @description
 * 我方角色使用技能后：此牌累积1个「寻宝线索」。如果此牌已累积3个「寻宝线索」，则弃置此牌并抓3张牌。
 */
define card {
  id 323004 as TreasureseekingSeelie;
  since "v3.7.0";
  cost DiceType.Aligned, 1;
  support item {
    variable clue, 0;
    on useSkill {
      :addVariable("clue", 1);
      if (:getVariable("clue") >= 3) {
        :drawCards(3);
        :dispose();
      }
    }
  }
}

/**
 * @id 323005
 * @name 化种匣
 * @description
 * 我方打出当前元素骰费用至少为2的支援牌时：少花费1个元素骰。（每回合1次）
 * 可用次数：2
 */
define card {
  id 323005 as SeedDispensary;
  since "v4.3.0";
  support item {
    on deductOmniDiceCard {
      when :( :e.currentDiceCostSize() >= 2 && :e.action.skill.caller.definition.type === "support" );
      usage perRound, 1;
      usage 2;
      :e.deductOmniCost(1);
    }
  }
}

const CardPlayedExtension = extension(323006, { played: "pair<number[]>" })
  .initialState({ played: [[], []] })
  .description("记录本场对局中双方曾经打出过的行动牌")
  .mutateWhen("onAction", (st, e) => {
    if (e.isPlayCard()) {
      const defId = e.action.skill.caller.definition.id;
      if (!st.played[e.who].includes(defId)) {
        st.played[e.who].push(defId);
      }
    }
  })
  .done();

/**
 * @id 323006
 * @name 留念镜
 * @description
 * 我方打出「武器」/「圣遗物」/「场地」/「伙伴」手牌时：如果本场对局中我方曾经打出过所打出牌的同名卡牌，则少花费2个元素骰。（每回合1次）
 * 可用次数：2
 */
define card {
  id 323006 as MementoLens;
  since "v4.3.0";
  cost DiceType.Aligned, 1;
  support item {
    associateExtension CardPlayedExtension;
    variable totalUsage, 2;
    on deductOmniDiceCard {
      when :{
        if (!:e.hasOneOfCardTag("weapon", "artifact", "place", "ally")) {
          return false;
        }
        return :getExtensionState().played[:self.who].includes(:e.action.skill.caller.definition.id);
      };
      usage perRound, 1;
      :e.deductOmniCost(2);
      :addVariable("totalUsage", -1);
      if (:getVariable("totalUsage") <= 0) {
        :dispose();
      }
    }
  }
}

/**
 * @id 323007
 * @name 流明石触媒
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
define card {
  id 323007 as LumenstoneAdjuvant;
  since "v4.5.0";
  cost DiceType.Void, 3;
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
 * @id 323008
 * @name 苦舍桓
 * @description
 * 行动阶段开始时：舍弃最多2张当前元素骰费用最高的手牌，每舍弃1张，此牌就累积1点「记忆和梦」。（最多2点）
 * 我方角色使用技能时：如果我方本回合未打出过行动牌，则消耗1点「记忆和梦」，以使此技能少花费1个元素骰。
 */
define card {
  id 323008 as Kusava;
  since "v4.7.0";
  cost DiceType.Aligned, 1;
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

/**
 * @id 133096
 * @name 流明媒触石
 * @description
 * 我方打出行动牌后：如果此牌在场期间本回合中我方已打出3张行动牌，则抓1张牌并生成1个万能元素。（每回合1次）
 * 可用次数：3
 * 【此卡含描述变量】
 */
define card {
  id 133096 as Lumenarystone; // 骗骗花
  reserved;
}
