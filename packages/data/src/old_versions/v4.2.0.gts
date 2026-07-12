import { card, character, DamageType, DiceType, skill, summon, type SummonHandle } from "@gi-tcg/core/builder";
import { NORMAL_MIMICS, PREVIEW_MIMICS } from "../characters/hydro/rhodeia_of_loch.gts";
import { BladeAblaze, Prowl, Stealth, StealthMaster, Thrust } from "../characters/pyro/fatui_pyro_agent.gts";
import { WindAndFreedomInEffect } from "../cards/event/other.gts";

/**
 * @id 331801
 * @name 风与自由
 * @description
 * 本回合中，我方角色使用技能后：将下一个我方后台角色切换到场上。
 * （牌组包含至少2个「蒙德」角色，才能加入牌组）
 */
define card {
  id 331801 as private WindAndFreedom;
  until "v4.2.0";
  cost DiceType.Aligned, 1;
  filter :( :$(`my standby characters`) );
  :combatStatus(WindAndFreedomInEffect);
}

/**
 * @id 330003
 * @name 愉舞欢游
 * @description
 * 我方出战角色的元素类型为冰/水/火/雷/草时，才能打出：对我方所有具有元素附着的角色，附着我方出战角色类型的元素。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330003 as private JoyousCelebration;
  until "v4.2.0";
  cost DiceType.Aligned, 1;
  legend;
  filter :( ([DiceType.Cryo, DiceType.Hydro, DiceType.Pyro, DiceType.Electro, DiceType.Dendro] as (DiceType | undefined)[]).includes(:$("my active")?.element()) );
  const element = :$("my active")!.element() as 1 | 2 | 3 | 4 | 7;
  // 先挂后台再挂前台（避免前台被超载走导致结算错误）
  :apply(element, "my standby character with aura != 0");
  :apply(element, "my active character with aura != 0");
}

/**
 * @id 22012
 * @name 纯水幻造
 * @description
 * 随机召唤1种纯水幻形。（优先生成不同的类型）
 */
define skill {
  id 22012 as OceanidMimicSummoning;
  until "v4.2.0";
  skillType elemental;
  cost DiceType.Hydro, 3;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  let target;
  if (exists.length >= 3) {
    target = :random(exists);
  } else {
    const rest = mimics.filter((id) => !exists.includes(id));
    target = :random(rest);
  }
  :summon(target as SummonHandle);
}

/**
 * @id 22013
 * @name 林野百态
 * @description
 * 随机召唤2种纯水幻形。（优先生成不同的类型）
 */
define skill {
  id 22013 as TheMyriadWilds;
  until "v4.2.0";
  skillType elemental;
  cost DiceType.Hydro, 5;
  const mimics = :isPreview ? PREVIEW_MIMICS : NORMAL_MIMICS;
  const exists = :player.summons.map((s) => s.definition.id).filter((id) => mimics.includes(id));
  for (let i = 0; i < 2; i++) {
    let target;
    if (exists.length >= 3) {
      target = :random(exists);
    } else {
      const rest = mimics.filter((id) => !exists.includes(id));
      target = :random(rest);
    }
    :summon(target as SummonHandle);
    exists.push(target);
  }
}

/**
 * @id 122013
 * @name 纯水幻形·蛙
 * @description
 * 我方出战角色受到伤害时：抵消1点伤害。
 * 可用次数：2，耗尽时不弃置此牌。
 * 结束阶段，如果可用次数已耗尽：弃置此牌，以造成2点水元素伤害。
 */
define summon {
  id 122013 as private OceanicMimicFrog;
  until "v4.2.0";
  tags barrier;
  hint DamageType.Hydro, "2";
  on decreaseDamaged {
    usage 2 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Hydro, 2);
    :dispose();
  }
}

/**
 * @id 122014
 * @name 纯水幻形
 * @description
 * 「纯水幻形」共有3种：
 * 花鼠：结束阶段造成2点水元素伤害，可用2次。
 * 飞鸢：结束阶段造成1点水元素伤害，可用3次。
 * 蛙：抵挡1点出战角色受到的伤害，可用2次；耗尽后，在结束阶段造成2点水元素伤害。
 */
define summon {
  id 122014 as private OceanicMimicFrogPreview; // 这是纯水幻形·蛙的预览版本
  until "v4.2.0";
  hint DamageType.Hydro, "2";
  on decreaseDamaged {
    when :( :e.target.isActive() );
    usage 2 {
      autoDispose false;
    };
    :e.decreaseDamage(1);
  }
  on endPhase {
    when :( :getVariable("usage") <= 0 );
    :damage(DamageType.Hydro, 2);
    :dispose();
  }
}

/**
 * @id 2301
 * @name 愚人众·火之债务处理人
 * @description
 * 「死债不可免，活债更难逃…」
 */
define character {
  id 2301 as private FatuiPyroAgent;
  until "v4.2.0";
  tags pyro, fatui;
  health 10;
  energy 2;
  skills Thrust, Prowl, BladeAblaze, StealthMaster;
}

/**
 * @id 312016
 * @name 海染砗磲
 * @description
 * 入场时：治疗所附属角色3点。
 * 我方角色每受到3点治疗，此牌就累积1个「海染泡沫」。（最多累积2个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗1个都使造成的伤害+1。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312016 as private OceanhuedClam;
  until "v4.2.0";
  cost DiceType.Void, 3;
  artifact {
    variable healedPts, 0 {
      visible false;
    };
    variable bubble, 0;
    on enter {
      :heal(3, "@master");
    }
    on healed {
      listenTo samePlayer;
      :addVariable("healedPts", :e.value);
      const totalPts = :getVariable("healedPts");
      const generatedBubbleCount = Math.floor(totalPts / 3);
      const restPts = totalPts % 3;
      :addVariableWithMax("bubble", generatedBubbleCount, 2);
      :setVariable("healedPts", restPts);
    }
    on increaseSkillDamage {
      const bubbleCount = :getVariable("bubble");
      :setVariable("bubble", 0);
      :e.increaseDamage(bubbleCount);
    }
  }
}


/**
 * @id 322003
 * @name 蒂玛乌斯
 * @description
 * 入场时附带2个「合成材料」。
 * 结束阶段：补充1个「合成材料」。
 * 打出「圣遗物」手牌时：如可能，则支付等同于「圣遗物」总费用数量的「合成材料」，以免费装备此「圣遗物」。（每回合1次）
 */
define card {
  id 322003 as private Timaeus;
  until "v4.2.0";
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
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
 * 入场时附带2个「锻造原胚」。
 * 结束阶段：补充1个「锻造原胚」。
 * 打出「武器」手牌时：如可能，则支付等同于「武器」总费用数量的「锻造原胚」，以免费装备此「武器」。（每回合1次）
 */
define card {
  id 322004 as private Wagner;
  until "v4.2.0";
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
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

