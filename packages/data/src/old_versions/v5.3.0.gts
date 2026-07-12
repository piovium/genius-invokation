import { card, character, DamageType, DiceType, skill } from "@gi-tcg/core/builder";
import { DriftcloudWave, Skyladder } from "../characters/anemo/xianyun.gts";
import { BattlelineDetonation, BusterBlaze, ImperialPanoply, SearingBlast, ShatterclampStrike } from "../characters/pyro/emperor_of_fire_and_iron.gts";
import { Chiori, FlutteringHasode } from "../characters/geo/chiori.gts";

/**
 * @id 2304
 * @name 铁甲熔火帝皇
 * @description
 * 矗立在原海异种顶端的两位霸主之一，不遇天敌，不倦狩猎并成长之蟹。有着半是敬畏，半是戏谑的「帝皇」之称。
 */
define character {
  id 2304 as private EmperorOfFireAndIron;
  until "v5.3.0";
  tags pyro, monster;
  health 6;
  energy 2;
  skills ShatterclampStrike, BusterBlaze, BattlelineDetonation, ImperialPanoply, SearingBlast;
}

/**
 * @id 15102
 * @name 朝起鹤云
 * @description
 * 造成2点风元素伤害，生成步天梯，本角色附属闲云冲击波。
 */
define skill {
  id 15102 as private WhiteCloudsAtDawn;
  until "v5.3.0";
  skillType elemental;
  cost DiceType.Anemo, 3;
  :damage(DamageType.Anemo, 2);
  :combatStatus(Skyladder);
  :characterStatus(DriftcloudWave);
}

/**
 * @id 216091
 * @name 落染五色
 * @description
 * 战斗行动：我方出战角色为千织时，装备此牌。
 * 千织装备此牌后，立刻使用一次羽袖一触。
 * 装备有此牌的千织使用羽袖一触时：额外召唤1个平静养神之袖，并改为从4个千织的自动制御人形中挑选1个并召唤。
 * （牌组中包含千织，才能加入牌组）
 */
define card {
  id 216091 as InFiveColorsDyed;
  until "v5.3.0";
  cost DiceType.Geo, 3;
  talent Chiori {
    on enter {
      :useSkill(FlutteringHasode);
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
 * [3130021: 钩物巧技] (2*Same) 造成1点物理伤害，窃取1张原本元素骰费用最高的对方手牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 * [3130022: ] ()
 */
define card {
  id 313002 as private Yumkasaurus;
  until "v5.3.0";
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
    }
  }
}
