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

import type { EntityDefinition } from "@gi-tcg/core";
import { $, card, combatStatus, DamageType, DiceType, extension, status, type StatusHandle } from "@gi-tcg/core/builder";
import { AgileSwitch, EfficientSwitch } from "../../commons.gts";

/**
 * @id 313001
 * @name 异色猎刀鳐
 * @description
 * 特技：原海水刃
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130011: 原海水刃] (2*Void) 造成2点物理伤害。
 */
define card {
  id 313001 as XenochromaticHuntersRay;
  since "v5.0.0";
  technique {
    skill {
      id 3130011;
      cost DiceType.Void, 2;
      usage 2;
      :damage(DamageType.Physical, 2);
    }
  }
}

/**
 * @id 313002
 * @name 匿叶龙
 * @description
 * 特技：钩物巧技
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130021: 钩物巧技] (2*Aligned) 造成1点物理伤害，窃取1张当前元素骰费用最高的对方手牌，然后对手抓1张牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 * [3130022: ] ()
 */
define card {
  id 313002 as Yumkasaurus;
  since "v5.0.0";
  cost DiceType.Aligned, 1;
  technique {
    on deductOmniDiceTechnique {
      when :( :e.action.skill.definition.id === 3130021 && :player.hands.length <= 2 );
      :e.deductOmniCost(1);
    }
    skill {
      id 3130021;
      cost DiceType.Aligned, 2;
      usage 2;
      :damage(DamageType.Physical, 1);
      const [handCard] = :maxCostHands(1, { who: "opp" });
      if (handCard) {
        :stealHandCard(handCard);
      }
      :drawCards(1, { who: "opp" });
    }
  }
}

/**
 * @id 313003
 * @name 鳍游龙
 * @description
 * 特技：游隙灵道
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130031: 游隙灵道] (1*Aligned) 选择一个我方「召唤物」，立刻触发其「结束阶段」效果。（每回合最多使用1次）
 * [3130032: ] ()
 */
export const Koholasaurus = card(313003)
  .since("v5.0.0")
  .costSame(2)
  .technique()
  .provideSkill(3130031)
  .costSame(1)
  .usage(2)
  .usagePerRound(1)
  .addTarget("my summon")
  .do((c, e) => {
    c.triggerEndPhaseSkill(e.targets[0])
  })
  .done();

/**
 * @id 301301
 * @name 掘进的收获
 * @description
 * 提供2点护盾，保护所附属角色。
 */
define status {
  id 301301 as private DiggingDownToPaydirt;
  shield 2;
}

/**
 * @id 313004
 * @name 嵴锋龙
 * @description
 * 特技：掘进突击
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130041: 掘进突击] (2*Void) 抓2张牌。然后，如果手牌中存在名称不存在于本局最初牌组中的牌，则提供2点护盾保护所附属角色。
 */
define card {
  id 313004 as Tepetlisaurus;
  since "v5.1.0";
  cost DiceType.Aligned, 2;
  technique {
    skill {
      id 3130041;
      usage 2;
      cost DiceType.Void, 2;
      :drawCards(2);
      if ((() => {
        return :player.hands.some((card) => !:isInInitialPile(card));
      })()) {
        :characterStatus(DiggingDownToPaydirt, "@master");
      }
    }
  }
}

/**
 * @id 313005
 * @name 暝视龙
 * @description
 * 特技：灵性援护
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130051: 灵性援护] (1*Aligned) 从「场地」「道具」「料理」中挑选1张加入手牌，并且治疗附属角色1点。
 */
define card {
  id 313005 as Iktomisaurus;
  since "v5.2.0";
  cost DiceType.Aligned, 2;
  technique {
    skill {
      id 3130051;
      usage 2;
      cost DiceType.Aligned, 1;
      :heal(1, "@master");
      const tags = ["place", "item", "food"] as const;
      const candidates: EntityDefinition[] = [];
      for (const tag of tags) {
        const def = :random(:allCardDefinitions(tag));
        candidates.push(def);
      }
      :selectAndCreateHandCard(candidates);
    }
  }
}

/**
 * @id 301302
 * @name 目标
 * @description
 * 敌方附属有绒翼龙的角色切换至前台时：自身减少1层效果。
 */
define status {
  id 301302 as Target;
  variable effect, 1 {
    append;
  };
  // 目标本身实际并无效果
}

/**
 * @id 313006
 * @name 绒翼龙
 * @description
 * 入场时：敌方出战角色附属目标。
 * 敌方附属有目标的角色切换为出战角色时：我方获得1层高效切换和敏捷切换，并移除对方所有角色的目标。
 * 特技：迅疾滑翔
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130061: ] ()
 * [3130062: ] ()
 * [3130063: 迅疾滑翔] (1*Aligned) 舍弃1张当前元素骰费用最高的手牌，切换到下一名角色，敌方出战角色附属目标。
 */
define card {
  id 313006 as Qucusaurus;
  since "v5.3.0";
  cost DiceType.Aligned, 1;
  technique {
    variable deductDiceTriggered, 0 {
      visible false;
    };
    on enter {
      :characterStatus(Target, $.opp.active);
    }
    on switchActive {
      when :( !:e.switchInfo.to.isMine() &&
          :e.switchInfo.to.hasStatus(Target) );
      listenTo all;
      :combatStatus(EfficientSwitch);
      :combatStatus(AgileSwitch);
      :dispose($.opp.typeStatus.def(Target));
    }
    skill {
      id 3130063;
      usage 2;
      cost DiceType.Aligned, 1;
      :disposeMaxCostHands(1);
      :switchActive($.my.next);
      :characterStatus(Target, $.opp.active);
    }
  }
}

/**
 * @id 301304
 * @name 浪船
 * @description
 * 提供2点护盾，保护所附属角色。
 */
define status {
  id 301304 as private WaveriderShield;
  shield 2;
}

/**
 * @id 313007
 * @name 浪船
 * @description
 * 入场时：为我方附属角色提供2点护盾。
 * 附属角色切换至后台时：此牌可用次数+1。
 * 特技：浪船·迅击炮
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130071: 浪船·迅击炮] (1*Aligned) 造成2点物理伤害。
 * [3130072: ] () 附属角色切换至后台时，此牌可用次数+1。
 * [3130073: ] () 使用时，生成2点护盾
 */
define card {
  id 313007 as Waverider;
  since "v5.5.0";
  cost DiceType.Aligned, 5;
  technique {
    skill {
      id 3130071;
      usage 2;
      cost DiceType.Aligned, 1;
      :damage(DamageType.Physical, 2);
    }
    on enter {
      :characterStatus(WaveriderShield, "@master");
    }
    on switchActive {
      when :( :e.switchInfo.from?.id === :self.master.id );
      :addVariable("usage", 1);
    }
  }
}

/**
 * @id 301305
 * @name 突角龙（生效中）
 * @description
 * 本角色将在下次行动时，直接使用技能：普通攻击。
 */
define status {
  id 301305 as TatankasaurusStatus02;
  prepare "normal" {
    hintCount 1;
  };
}

/**
 * @id 301303
 * @name 突角龙（生效中）
 * @description
 * 本角色将在下次行动时，直接使用技能：普通攻击。
 */
define status {
  id 301303 as TatankasaurusStatus01;
  prepare "normal" {
    hintCount 2;
    nextStatus TatankasaurusStatus02;
  };
}

/**
 * @id 313008
 * @name 突角龙
 * @description
 * 特技：昂扬状态
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130081: 昂扬状态] (3*Void) 附属角色准备技能2次「普通攻击」。
 */
define card {
  id 313008 as Tatankasaurus;
  since "v5.6.0";
  cost DiceType.Void, 4;
  technique {
    skill {
      id 3130081;
      usage 2;
      cost DiceType.Void, 3;
      :characterStatus(TatankasaurusStatus01, "@master");
    }
  }
}

export const TechniquesPlayedCountExtension = extension(301306, { techniquesPlayedCount: "pair<number>" })
  .initialState({ techniquesPlayedCount: [0, 0] })
  .description("记录本场对局中双方打出特技牌的数量")
  .mutateWhen("onPlayCard", (c, e) => {
    if (e.card.definition.tags.includes("technique")) {
      c.techniquesPlayedCount[e.who]++;
    }
  })
  .done();

/**
 * @id 301306
 * @name 呀——
 * @description
 * 我方打出特技牌时：若本局游戏我方累计打出了6张特技牌，我方前台获得3点护盾，然后造成3点物理伤害。
 */
define combatStatus {
  id 301306 as Yikes;
  associateExtension TechniquesPlayedCountExtension;
  variable techniquesPlayedCount, 0;
  defineSnippet checkCount, :{
    if (:getVariable("techniquesPlayedCount") >= 6){
      :characterStatus(SaurianBuddyCheers, "my active")
      :damage(DamageType.Physical, 3)
      :dispose();
    }
  };
  on enter {
    :setVariable("techniquesPlayedCount", :getExtensionState().techniquesPlayedCount[:self.who]);
    :callSnippet.checkCount();
  }
  on playCard {
    when :( :e.card.definition.tags.includes("technique") );
    :addVariable("techniquesPlayedCount", 1);
    :callSnippet.checkCount();
  }
}

/**
 * @id 301307
 * @name 龙伙伴的声援！
 * @description
 * 提供3点护盾，保护所附属角色。
 */
define status {
  id 301307 as SaurianBuddyCheers;
  shield 3;
}

/**
 * @id 301308
 * @name 龙伙伴的鼓舞！
 * @description
 * 我方下次打出特技牌费用-2。
 */
define combatStatus {
  id 301308 as SaurianMoralSupport;
  once deductOmniDiceCard {
    when :( :e.hasCardTag("technique") );
    :e.deductOmniCost(2);
  }
}

/**
 * @id 313009
 * @name 呀！呀！
 * @description
 * 此卡牌入场时：创建呀——！。（我方打出特技牌时：若本局游戏我方累计打出了6张特技牌，我方出战角色获得3点护盾，然后造成3点物理伤害）
 * 特技：呀！呀！
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130091: ] ()
 * [3130092: 呀！呀！] (2*Void) 从牌库中抓1张特技牌，下次我方打出特技牌少花费2个元素骰。
 */
define card {
  id 313009 as RawrRawr;
  since "v5.7.0";
  cost DiceType.Aligned, 2;
  technique {
    on enter {
      :combatStatus(Yikes);
    }
    skill {
      id 3130092;
      usage 2;
      cost DiceType.Void, 2;
      :drawCards(1, { withTag: "technique" });
      :combatStatus(SaurianMoralSupport);
    }
  }
}

/**
 * @id 313010
 * @name 膨膨兽
 * @description
 * 特技：膨膨音波
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130101: 膨膨音波] (1*Aligned) 切换到下一个角色，从牌组里随机抓1张当前元素骰费用最高或最低的牌。
 */
define card {
  id 313010 as Blubberbeast;
  since "v6.5.0";
  cost DiceType.Aligned, 1;
  technique {
    skill {
      id 3130101;
      usage 2;
      cost DiceType.Aligned, 1;
      :abortPreview();
      :switchActive($.my.next);
      const takeMax = :random([true, false]);
      const pile = Object.groupBy(:player.pile, (card) => card.diceCost());
      // ES6 保证从小到大排序，无需再 sort
      const costs = Object.keys(pile).map(Number);
      if (costs.length === 0) {
        return;
      }
      const targetCost = takeMax ? costs[costs.length - 1] : costs[0];
      const candidates = pile[targetCost]!;
      const targetCard = :random(candidates);
      if (targetCard) {
        :drawCards(targetCard);
      }
    }
  }
}
