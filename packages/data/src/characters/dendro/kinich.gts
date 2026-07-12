// Copyright (C) 2024 Guyutongxue
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

import { card, character, DamageType, DiceType, Reaction, skill, status, summon } from "@gi-tcg/core/builder";

/**
 * @id 117091
 * @name 钩索链接
 * @description
 * 敌方受到燃烧反应伤害或我方其他角色使用特技后：附属角色获得1点「夜魂值」。
 * 当夜魂值等于2点时：附属角色附属钩索准备，随后消耗2点「夜魂值」。（附属钩索准备后，我方角色选择行动前，若附属角色为出战角色：对最近的敌方角色造成3点草元素伤害）
 * 持续回合：2
 */
define status {
  id 117091 as GrappleLink;
  since "v5.4.0";
  duration 2;
  defineSnippet :{
    const nightsoul = :self.master.hasNightsoulsBlessing();
    if (nightsoul && nightsoul.getVariable("nightsoul") === 2 && !:self.master.hasStatus(GrapplePrepare)) {
      :self.master.addStatus(GrapplePrepare);
      :consumeNightsoul("@master", 2);
    }
  };
  on damaged {
    when :( :e.getReaction() === Reaction.Burning &&
        !:e.target.isMine() );
    listenTo all;
    :gainNightsoul("@master");
    :callSnippet();
  }
  on beforeTechnique {
    when :( :e.techniqueCaller.id !== :self.master.id );
    listenTo samePlayer;
    :gainNightsoul("@master");
    :callSnippet();
  }
  on beforeAction {
    listenTo all;
    :callSnippet();
  }
  on selfDispose {
    void 0;
    // 钩锁链接离场时，角色退出夜魂加持
    const nightsoul = :$(`my characters with definition id ${Kinich}`)?.hasNightsoulsBlessing();
    if (nightsoul) {
      :dispose(nightsoul);
    }
  }
}

/**
 * @id 117092
 * @name 夜魂加持
 * @description
 * 所附属角色可累积「夜魂值」。（最多累积到2点）
 */
define status {
  id 117092 as NightsoulsBlessing;
  since "v5.4.0";
  nightsoulsBlessing 2;
}

/**
 * @id 117093
 * @name 伟大圣龙阿乔
 * @description
 * 结束阶段：造成1点草元素伤害，然后对敌方下一个角色造成1点草元素伤害。
 * 可用次数：2
 */
define summon {
  id 117093 as AlmightyDragonlordAjaw;
  since "v5.4.0";
  hint DamageType.Dendro, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Dendro, 1);
    :damage(DamageType.Dendro, 1, "opp next");
  }
}

/**
 * @id 117094
 * @name 钩索准备
 * @description
 * 我方角色选择行动前，若附属角色为出战角色：对最近的敌方角色造成3点草元素伤害。
 */
define status {
  id 117094 as GrapplePrepare;
  since "v5.4.0";
  once beforeAction {
    when :( :self.master.isActive() );
    :damage(DamageType.Dendro, 3, "recent opp from @master");
  }
}

/**
 * @id 17091
 * @name 夜阳斗技
 * @description
 * 造成2点物理伤害。
 */
define skill {
  id 17091 as NightsunStyle;
  skillType normal;
  cost DiceType.Dendro, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 2);
}

/**
 * @id 17092
 * @name 悬猎·游骋高狩
 * @description
 * 选一个我方角色，自身附属钩索链接并进入夜魂加持。造成1点草元素伤害，然后与所选角色交换位置。
 */
export const CanopyHunterRidingHigh = skill(17092)
  .type("elemental")
  .costDendro(3)
  .addTarget("my characters")
  .characterStatus(GrappleLink)
  .characterStatus(NightsoulsBlessing)
  .damage(DamageType.Dendro, 1)
  .swapCharacterPosition("@self", "@targets.0")
  .do((c) => {
    const talent = c.self.hasEquipment(NightRealmsGiftRepaidInFull);
    if (
      talent &&
      c.player.hands.length <= c.oppPlayer.hands.length &&
      talent.variables.usagePerRound! > 0
    ) {
      if (c.oppPlayer.hands.length > 0) {
        const [targetCard] = c.maxCostHands(1, { who: "opp" });
        c.stealHandCard(targetCard);
      }
      c.drawCards(1, { who: "opp" });
      c.addVariable("usagePerRound", -1, talent);
    }
  })
  .done();

/**
 * @id 17093
 * @name 向伟大圣龙致意
 * @description
 * 造成1点草元素伤害，召唤伟大圣龙阿乔。
 */
define skill {
  id 17093 as HailToTheAlmightyDragonlord;
  skillType burst;
  cost DiceType.Dendro, 3;
  cost DiceType.Energy, 2;
  :damage(DamageType.Dendro, 1);
  :summon(AlmightyDragonlordAjaw);
}

/**
 * @id 17094
 * @name
 * @description
 *
 */
define skill {
  id 17094 as Untitled11;
  skillType passive;
  reserved;
}

/**
 * @id 1709
 * @name 基尼奇
 * @description
 * 悬木游火，受任皆偿。
 */
define character {
  id 1709 as Kinich;
  since "v5.4.0";
  tags dendro, claymore, natlan;
  health 10;
  energy 2;
  skills NightsunStyle, CanopyHunterRidingHigh, HailToTheAlmightyDragonlord;
  associateNightsoul NightsoulsBlessing;
}

/**
 * @id 217091
 * @name 夜域赐礼·索报皆偿
 * @description
 * 装备有此牌的基尼奇切换至前台或使用悬猎·游骋高狩时：若我方手牌不多于对方，则窃取1张当前元素骰费用最高的对方手牌，然后对手抓1张牌。（每回合1次）
 * （牌组中包含基尼奇，才能加入牌组）
 */
define card {
  id 217091 as NightRealmsGiftRepaidInFull;
  since "v5.4.0";
  cost DiceType.Dendro, 1;
  talent Kinich, none {
    on switchActive {
      when :( :self.master.id === :e.switchInfo.to.id &&
          :player.hands.length <= :oppPlayer.hands.length &&
          :oppPlayer.hands.length > 0 );
      usage perRound, 1;
      const [targetCard] = :maxCostHands(1, { who: "opp" });
      :stealHandCard(targetCard);
      :drawCards(1, { who: "opp" });
    }
  }
}
