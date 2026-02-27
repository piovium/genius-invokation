import { card, character, DamageType, DiceType, skill, summon, SummonHandle } from "@gi-tcg/core/builder";
import { NORMAL_MIMICS, PREVIEW_MIMICS } from "../characters/hydro/rhodeia_of_loch";
import { BladeAblaze, Prowl, Stealth, StealthMaster, Thrust } from "../characters/pyro/fatui_pyro_agent";
import { WindAndFreedomInEffect } from "../cards/event/other";

/**
 * @id 331801
 * @name 风与自由
 * @description
 * 本回合中，我方角色使用技能后：将下一个我方后台角色切换到场上。
 * （牌组包含至少2个「蒙德」角色，才能加入牌组）
 */
const WindAndFreedom = card(331801)
  .until("v4.2.0")
  .costSame(1)
  .filter((c) => c.$(`my standby characters`))
  .combatStatus(WindAndFreedomInEffect)
  .done();

/**
 * @id 330003
 * @name 愉舞欢游
 * @description
 * 我方出战角色的元素类型为冰/水/火/雷/草时，才能打出：对我方所有具有元素附着的角色，附着我方出战角色类型的元素。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
const JoyousCelebration = card(330003)
  .until("v4.2.0")
  .costSame(1)
  .legend()
  .filter((c) => ([DiceType.Cryo, DiceType.Hydro, DiceType.Pyro, DiceType.Electro, DiceType.Dendro] as (DiceType | undefined)[]).includes(c.$("my active")?.element()))
  .do((c) => {
    const element = c.$("my active")!.element() as 1 | 2 | 3 | 4 | 7;
    // 先挂后台再挂前台（避免前台被超载走导致结算错误）
    c.apply(element, "my standby character with aura != 0");
    c.apply(element, "my active character with aura != 0");
  })
  .done();

/**
 * @id 22012
 * @name 纯水幻造
 * @description
 * 随机召唤1种纯水幻形。（优先生成不同的类型）
 */
export const OceanidMimicSummoning = skill(22012)
  .until("v4.2.0")
  .type("elemental")
  .costHydro(3)
  .do((c) => {
    const mimics = c.isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
    const exists = c.player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
    let target;
    if (exists.length >= 3) {
      target = c.random(exists);
    } else {
      const rest = mimics.filter((id) => !exists.includes(id));
      target = c.random(rest);
    }
    c.summon(target as SummonHandle);
  })
  .done();

/**
 * @id 22013
 * @name 林野百态
 * @description
 * 随机召唤2种纯水幻形。（优先生成不同的类型）
 */
export const TheMyriadWilds = skill(22013)
  .until("v4.2.0")
  .type("elemental")
  .costHydro(5)
  .do((c) => {
    const mimics = c.isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
    const exists = c.player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
    for (let i = 0; i < 2; i++) {
      let target;
      if (exists.length >= 3) {
        target = c.random(exists);
      } else {
        const rest = mimics.filter((id) => !exists.includes(id));
        target = c.random(rest);
      }
      c.summon(target as SummonHandle);
      exists.push(target);
    }
  })
  .done();

/**
 * @id 122013
 * @name 纯水幻形·蛙
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：2，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点水元素伤害。
 */
const OceanicMimicFrog = summon(122013)
  .until("v4.2.0")
  .tags("barrier")
  .hint(DamageType.Hydro, "2")
  .on("decreaseDamaged")
  .usage(2, { autoDispose: false })
  .decreaseDamage(1)
  .on("endPhase", (c) => c.getVariable("usage") <= 0)
  .damage(DamageType.Hydro, 2)
  .dispose()
  .done();

/**
 * @id 122014
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用2次；耗尽后，在结束阶段造成2点水元素伤害。
 */
const OceanicMimicFrogPreview = summon(122014) // 这是纯水幻形·蛙的预览版本
  .until("v4.2.0")
  .hint(DamageType.Hydro, "2")
  .on("decreaseDamaged", (c, e) => e.target.isActive())
  .usage(2, { autoDispose: false })
  .decreaseDamage(1)
  .on("endPhase", (c) => c.getVariable("usage") <= 0)
  .damage(DamageType.Hydro, 2)
  .dispose()
  .done();

/**
 * @id 2301
 * @name 愚人众·火之债务处理人
 * @description
 * 「死债不可免，活债更难逃…」
 */
const FatuiPyroAgent = character(2301)
  .until("v4.2.0")
  .tags("pyro", "fatui")
  .health(10)
  .energy(2)
  .skills(Thrust, Prowl, BladeAblaze, StealthMaster)
  .done();

/**
 * @id 312016
 * @name 海染砗磲
 * @description
 * 入场时：治疗所附属角色3点。
 * 我方角色每受到3点治疗，此牌就累积1个「海染泡沫」。（最多累积2个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗1个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
const OceanhuedClam = card(312016)
  .until("v4.2.0")
  .costVoid(3)
  .artifact()
  .variable("healedPts", 0, { visible: false })
  .variable("bubble", 0)
  .on("enter")
  .heal(3, "@master")
  .on("healed")
  .listenToPlayer()
  .do((c, e) => {
    c.addVariable("healedPts", e.value);
    const totalPts = c.getVariable("healedPts");
    const generatedBubbleCount = Math.floor(totalPts / 3);
    const restPts = totalPts % 3;
    c.addVariableWithMax("bubble", generatedBubbleCount, 2);
    c.setVariable("healedPts", restPts);
  })
  .on("increaseSkillDamage")
  .do((c, e) => {
    const bubbleCount = c.getVariable("bubble");
    c.setVariable("bubble", 0);
    e.increaseDamage(bubbleCount);
  })
  .done();


/**
 * @id 322003
 * @name 蒂玛乌斯
 * @description
 * 入场时附带2个「合成材料」。
 * 结束阶段：补充1个「合成材料」。
 * 打出「圣遗物」手牌时：如可能，则支付等同于「圣遗物」总费用数量的「合成材料」，以免费装备此「圣遗物」。（每回合1次）
 */
const Timaeus = card(322003)
  .until("v4.2.0")
  .costSame(2)
  .support("ally")
  .variable("material", 2)
  .on("endPhase")
  .addVariable("material", 1)
  .on("deductAllDiceCard", (c, e) => e.hasCardTag("artifact") && c.getVariable("material") >= e.diceCostSize())
  .usagePerRound(1)
  .do((c, e) => {
    c.addVariable("material", -e.diceCostSize());
    e.deductAllCost();
  })
  .done();


/**
 * @id 322004
 * @name 瓦格纳
 * @description
 * 入场时附带2个「锻造原胚」。
 * 结束阶段：补充1个「锻造原胚」。
 * 打出「武器」手牌时：如可能，则支付等同于「武器」总费用数量的「锻造原胚」，以免费装备此「武器」。（每回合1次）
 */
const Wagner = card(322004)
  .until("v4.2.0")
  .costSame(2)
  .support("ally")
  .variable("material", 2)
  .on("endPhase")
  .addVariable("material", 1)
  .on("deductAllDiceCard", (c, e) => e.hasCardTag("weapon") && c.getVariable("material") >= e.diceCostSize())
  .usagePerRound(1)
  .do((c, e) => {
    c.addVariable("material", -e.diceCostSize());
    e.deductAllCost();
  })
  .done();


/**
 * @id 331802
 * @name 岩与契约
 * @description
 * 下回合行动阶段开始时：生成3点万能元素。
 * （牌组包含至少2个「璃月」角色，才能加入牌组）
 */
const [StoneAndContracts] = card(331802)
  .until("v4.2.0")
  .costVoid(3)
  .toCombatStatus(303182)
  .once("actionPhase")
  .generateDice(DiceType.Omni, 3)
  .done();

