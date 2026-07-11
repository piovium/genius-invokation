import { card, character, DamageType, skill } from "@gi-tcg/core/builder";
import { DriftcloudWave, Skyladder } from "../characters/anemo/xianyun.ts";
import { BattlelineDetonation, BusterBlaze, ImperialPanoply, SearingBlast, ShatterclampStrike } from "../characters/pyro/emperor_of_fire_and_iron.ts";
import { Chiori, FlutteringHasode } from "../characters/geo/chiori.ts";

/**
 * @id 2304
 * @name 铁甲熔火帝皇
 * @description
 * 矗立在原海异种顶端的两位霸主之一，不遇天敌，不倦狩猎并成长之蟹。有着半是敬畏，半是戏谑的「帝皇」之称。
 */
const EmperorOfFireAndIron = character(2304)
  .until("v5.3.0")
  .tags("pyro", "monster")
  .health(6)
  .energy(2)
  .skills(ShatterclampStrike, BusterBlaze, BattlelineDetonation, ImperialPanoply, SearingBlast)
  .done();

/**
 * @id 15102
 * @name 朝起鹤云
 * @description
 * 造成2点风元素伤害，生成步天梯，本角色附属闲云冲击波。
 */
const WhiteCloudsAtDawn = skill(15102)
  .until("v5.3.0")
  .type("elemental")
  .costAnemo(3)
  .damage(DamageType.Anemo, 2)
  .combatStatus(Skyladder)
  .characterStatus(DriftcloudWave)
  .done();

/**
 * @id 216091
 * @name 落染五色
 * @description
 * 战斗行动：我方出战角色为千织时，装备此牌。
 * 千织装备此牌后，立刻使用一次羽袖一触。
 * 装备有此牌的千织使用羽袖一触时：额外召唤1个平静养神之袖，并改为从4个千织的自动制御人形中挑选1个并召唤。
 * （牌组中包含千织，才能加入牌组）
 */
export const InFiveColorsDyed = card(216091)
  .until("v5.3.0")
  .costGeo(3)
  .talent(Chiori)
  .on("enter")
  .useSkill(FlutteringHasode)
  .done();

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
const Yumkasaurus = card(313002)
  .until("v5.3.0")
  .costSame(1)
  .technique()
  .on("deductOmniDiceTechnique", (c, e) => e.action.skill.definition.id === 3130021 && c.player.hands.length <= 2)
  .deductOmniCost(1)
  .endOn()
  .provideSkill(3130021)
  .costSame(2)
  .usage(2)
  .damage(DamageType.Physical, 1)
  .do((c) => {
    const [handCard] = c.maxCostHands(1, { who: "opp" });
    if (handCard) {
      c.stealHandCard(handCard);
    }
  })
  .done();
