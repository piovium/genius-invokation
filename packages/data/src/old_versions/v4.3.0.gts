import { card, DiceType, status } from "@gi-tcg/core/builder";
import { StrifefulLightning, ThunderManifestation, ThunderingShacklesSummon } from "../characters/electro/thunder_manifestation.gts";

/**
 * @id 330005
 * @name 万家灶火
 * @description
 * 我方抓当前的回合数-1数量的牌。（最多抓4张）
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330005 as private InEveryHouseAStove;
  until "v4.3.0";
  legend;
  const count = Math.min(:roundNumber, 4);
  :drawCards(count);
}

/**
 * @id 312022
 * @name 花海甘露之光
 * @description
 * 角色受到伤害后：如果所附属角色为「出战角色」，则抓1张牌。（每回合1次）
 * 结束阶段：治疗所附属角色1点。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312022 as private VourukashasGlow;
  until "v4.3.0";
  cost DiceType.Aligned, 1;
  artifact {
    on damaged {
      when :( :self.master.isActive() );
      usage perRound, 1;
      :drawCards(1);
    }
    on endPhase {
      :heal(1, "@master");
    }
  }
}

/**
 * @id 124022
 * @name 雷鸣探知
 * @description
 * 此状态存在期间，可以触发1次：所附属角色受到雷音权现及其召唤物造成的伤害+1。
 * （同一方场上最多存在一个此状态。雷音权现的部分技能，会以所附属角色为目标。）
 */
define status {
  id 124022 as private LightningRod;
  until "v4.3.0";
  conflictWith crossCharacter;
  on increaseDamaged {
    when :( [
          ThunderManifestation as number, 
          ThunderingShacklesSummon as number
        ].includes(:e.source.definition.id) );
    usage 1 {
      autoDispose false;
    };
    :e.increaseDamage(1);
  }
}

/**
 * @id 224021
 * @name 悲号回唱
 * @description
 * 装备有此牌的雷音权现在场，附属有雷鸣探知的敌方角色受到伤害时：我方抓1张牌。（每回合1次）
 * （牌组中包含雷音权现，才能加入牌组）
 */
define card {
  id 224021 as private GrievingEcho;
  until "v4.3.0";
  talent ThunderManifestation, none {
    on damaged {
      when :( !:e.target.isMine() && :e.target.hasStatus(LightningRod) );
      listenTo all;
      usage perRound, 1;
      :drawCards(1);
    }
  }
}

