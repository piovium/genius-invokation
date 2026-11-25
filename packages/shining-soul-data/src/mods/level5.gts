// Copyright (C) 2024-2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
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

import {
  $,
  DamageType,
  DiceType,
  Reaction,
  customEvent,
  type CardHandle,
  type CharacterHandle,
  type CombatStatusHandle,
  type ExtensionHandle,
  type SkillHandle,
  type StatusHandle,
} from "#custom-data-loader";

const PhysicalDiscardNext = customEvent("mod/physical/discard/next");

define combatStatus {
  name "舍弃手牌" as PhysicalDiscard;
  image "name://UI_Gcg_Buff_Common_Special";
  description "选择1张手牌$[K56]。\n<color=#FFFFFFFF>$[K3]：1</color>（可叠加）";
  usage 1 { append; };
  on selfEnter {
    :emitCustomEvent(PhysicalDiscardNext);
  };
  on PhysicalDiscardNext {
    listenTo myself;
    if (:player.hands.length > 0) {
      :abortPreview();
      :selectOption(
        `选择舍弃1张手牌。当前效果还有${:variables.usage}张手牌需要舍弃。`,
        :player.hands.map((card) => ({
          key: String(card.id),
          text: `$[K56]这张$[C${card.definition.id}]`,
          image: `id://${card.definition.id}`,
          title: `$[C${card.definition.id}]`,
        })),
      );
    } else {
      :dispose();
    }
  };
  on selectOption {
    listenTo myself;
    const card = :player.hands.find(
      (card) => card.id === Number(:e.selectedKey),
    );
    if (card) {
      :discard(card);
      :consumeUsage();
    }
    :emitCustomEvent(PhysicalDiscardNext);
  };
};

/**
 * @id 313005
 * @name 暝视龙
 * @cost 2*Aligned
 * @description
 * 特技：灵性援护
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130051: 灵性援护] (1*Aligned) 从我方牌库底展示卡牌，直到出现1张支援牌为止，将这张支援牌加入手牌，然后将你的牌库洗牌。治疗所附属角色1点。
 */
define card {
  id 313005 as Iktomisaurus;
  description "$[K58]：$[S3130051]\n<color=#FFFFFFFF>$[K3]：2</color>\n（角色最多装备1个「{SPRITE_PRESET#3008}特技」）";
  cost DiceType.Aligned, 2;
  technique {
    skill {
      id 3130051 as SpiritualSupport;
      usage 2;
      cost DiceType.Aligned, 1;
      // 线上简化为抓1张支援牌
      :drawCards(1, { withType: "support" });
      :heal(1, :self.master);
    };
  };
};

/**
 * @id 321018
 * @name 梅洛彼得堡
 * @cost 1*Aligned
 * @description
 * 我方出战角色受到伤害或治疗后：此牌累积1点「禁令」。（可叠加，最多叠加到6）如果此牌已有6点禁令，则消耗6点，舍弃对手随机一张牌。
 */
define card {
  id 321018 as FortressOfMeropide;
  description "<color=#FFFFFFFF>我方出战角色受到伤害或治疗后：</color>此牌累积1点<color=#FFFFFFFF>「禁令」</color>。（可叠加，最多叠加到6）如果此牌已有6点<color=#FFFFFFFF>禁令</color>，则消耗6点，$[K56]对手随机一张牌。";
  cost DiceType.Aligned, 1;
  support place {
    variable forbidden, 0 { range 6; };
    on damagedOrHealed {
      when :( :e.target.isActive() );
      :variables.forbidden += 1;
      :abortPreview();
      if (:variables.forbidden >= 6 && :oppPlayer.hands.length > 0) {
        :variables.forbidden -= 6;
        :discard(:random(:oppPlayer.hands));
      }
    };
  };
};

/**
 * @id 321019
 * @name 清籁岛
 * @cost 1*Aligned
 * @description
 * 任意阵营的角色受到治疗后：该角色受到1点穿透伤害。
 * 可用次数：2
 */
define card {
  id 321019 as SeiraiIsland;
  description "<color=#FFFFFFFF>任意阵营的角色受到治疗后：</color>该角色受到1点$[K5]。\n<color=#FFFFFFFF>$[K3]：2</color>";
  cost DiceType.Aligned, 1;
  support place {
    on healed {
      usage 2;
      listenTo all;
      :damage(DamageType.Piercing, 1, :e.target);
    };
  };
};

// 「清洁工作」（生效中） 根据QA，实卡由出战状态改为角色状态
// QA未提及增伤持续回合和叠加情况，除附属目标外其余均仿照线上出战状态实现
define status {
  name "「清洁工作」（生效中）" as CalledInForCleanupActive1;
  image "name://UI_Gcg_Buff_Common_Atk_Up";
  description "我方出战角色下次造成的伤害+1。（可叠加，最多叠加到+2）";
  variable damage, 1 {
    append;
    range 2;
  };
  once increaseSkillDamage {
    :e.increaseDamage(:variables.damage);
  };
};

/**
 * @id 322025
 * @name 白手套和渔夫
 * @cost
 * @description
 * 行动阶段开始时：使我方出战角色下次造成的伤害+1。
 * 可用次数：2
 */
define card {
  id 322025 as TheWhiteGloveAndTheFisherman;
  description "<color=#FFFFFFFF>行动阶段开始时：</color>使我方出战角色下次造成的伤害+1。\n<color=#FFFFFFFF>$[K3]：2</color>";
  support ally {
    on actionPhase {
      usage 2;
      :characterStatus(CalledInForCleanupActive1, $.my.active);
    };
  };
};

// 裁定之时（生效中） v6.3.0
const PassingOfJudgmentInEffect = 300003 as CombatStatusHandle;

/**
 * @id 330006
 * @name 裁定之时
 * @cost 1*Legend
 * @description
 * 本回合中，对方牌手打出的3张事件牌无效。
 * （整局游戏只能打出一张「秘传」卡牌；这张牌一定在你的起始手牌中）
 */
define card {
  id 330006 as PassingOfJudgment;
  // 费用改动
  legend;
  :combatStatus(PassingOfJudgmentInEffect, "opp");
};

/**
 * @id 303315
 * @name 咚咚嘭嘭（生效中）
 * @description
 * 我方打出支援牌时：治疗所附属角色1点。
 * 可用次数：3
 */
define status {
  id 303315 as PuffPopsInEffect;
  description "<color=#FFFFFFFF>我方打出支援牌时：</color>治疗所附属角色1点。\n<color=#FFFFFFFF>$[K3]：3</color>";
  on playCard {
    when :( :e.card.definition.type === "support" );
    usage 3;
    :heal(1, :self.master);
  };
};

// 指挥的礼帽（生效中）
const ConductorsTopHatInEffect = 301204 as StatusHandle;

/**
 * @id 312030
 * @name 指挥的礼帽
 * @cost 1*Aligned
 * @description
 * 我方切换到所附属角色后：舍弃1张手牌，将2个元素骰转换为万能元素骰，并使角色下次使用技能或打出「天赋」时少花费1个元素骰。（每回合1次）
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312030 as ConductorsTopHat;
  description "<color=#FFFFFFFF>我方切换到所附属角色后：</color>$[K56]1张手牌，将2个元素骰转换为$[K411]骰，并使角色下次使用技能或打出「{SPRITE_PRESET#3006}天赋」时少花费1个元素骰。（每回合1次）\n（角色最多装备1件「{SPRITE_PRESET#3004}圣遗物」）";
  cost DiceType.Aligned, 1;
  artifact {
    on switchActive {
      when :(
        :e.switchInfo.to.id === :self.master.id &&
          :player.hands.length >
            (:query($.my.combatStatus.def(PhysicalDiscard))?.variables.usage ??
              0)
      );
      usage perRound, 1;
      :combatStatus(PhysicalDiscard);
      :convertDice(DiceType.Omni, 2);
      :characterStatus(ConductorsTopHatInEffect, :self.master);
    };
  };
};

/**
 * @id 313002
 * @name 匿叶龙
 * @cost 1*Aligned
 * @description
 * 特技：钩物巧技
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130021: 钩物巧技] (2*Void) 造成1点物理伤害，随机舍弃一张对方手牌，然后对手抓1张牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 */
define card {
  id 313002 as Yumkasaurus;
  description "$[K58]：$[S3130021]\n<color=#FFFFFFFF>$[K3]：2</color>\n（角色最多装备1个「{SPRITE_PRESET#3008}特技」）";
  cost DiceType.Aligned, 1;
  technique {
    on deductOmniDiceTechnique {
      when :(
        :e.action.skill.definition.id === 3130021 && :player.hands.length <= 2
      );
      :e.deductOmniCost(1);
    };
    skill {
      id 3130021 as ArtfulGrapple;
      cost DiceType.Aligned, 2;
      usage 2;
      :damage(DamageType.Physical, 1);
      :abortPreview();
      :discard(:random(:oppPlayer.hands));
      :drawCards(1, { who: "opp" });
    };
  };
};

/**
 * @id 302201
 * @name 愤怒的太郎丸
 * @description
 * 结束阶段：造成2点物理伤害。
 * 可用次数：1
 */
define summon {
  id 302201 as TaromaruEnraged;
  description "<color=#FFFFFFFF>结束阶段：</color>造成2点$[K100]。\n<color=#FFFFFFFF>$[K3]：1</color>";
  hint DamageType.Physical, 2;
  on endPhase {
    // 可用次数改动
    usage 1;
    :damage(DamageType.Physical, 2);
  };
};

/**
 * @id 322024
 * @name 太郎丸
 * @cost 2*Void
 * @description
 * 我方进行元素调和后：累计1点计数，生成1个万能元素骰。（最多触发2次）
 * 行动阶段开始，且此卡牌计数达到2时：弃置此牌，召唤愤怒的太郎丸。
 * 将此牌视为配件牌放置于我方召唤物区。
 */
define card {
  id 322024 as Taroumaru;
  description "<color=#FFFFFFFF>我方进行元素调和后：</color>累计1点计数，生成1个$[K411]骰。（最多触发2次）\n<color=#FFFFFFFF>行动阶段开始，且此卡牌计数达到2时：</color>弃置此牌，召唤<color=#FFFFFFFF>$[C302201]</color>。";
  cost DiceType.Void, 2;
  support ally {
    variable count, 0;
    on discardOrTuneCard {
      when :( :e.isTuning() );
      usage 2 {
        visible false;
        autoDispose false;
      };
      :variables.count += 1;
      :generateDice(DiceType.Omni, 1);
    };
    on actionPhase {
      when :( :variables.count >= 2 );
      :summon(TaromaruEnraged);
      :dispose();
    };
  };
};

/**
 * @id 311207
 * @name 竭泽
 * @cost 2*Aligned
 * @description
 * 我方打出支援牌后：此牌累积1点「渔猎」。（最多累积2点，每回合最多累积2点）
 * 角色使用技能时：如果此牌已有「渔猎」，则消耗所有「渔猎」，使此技能伤害+1，并且每消耗1点「渔猎」就抓1张牌。
 * （「弓」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311207 as EndOfTheLine;
  description "<color=#FFFFFFFF>我方打出支援牌后：</color>此牌累积1点<color=#FFFFFFFF>「渔猎」</color>。（最多累积2点，每回合最多累积2点）\n<color=#FFFFFFFF>角色使用技能时：</color>如果此牌已有<color=#FFFFFFFF>「渔猎」</color>，则消耗所有<color=#FFFFFFFF>「渔猎」</color>，使此技能伤害+1，并且每消耗1点<color=#FFFFFFFF>「渔猎」</color>就抓1张牌。\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3202}弓」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  cost DiceType.Aligned, 2;
  weapon bow {
    variable fishing, 0 { range 2; };
    on playCard {
      when :( :e.card.definition.type === "support" && :variables.fishing < 2 );
      usage perRound, 2 {
        visible false;
      };
      :variables.fishing += 1;
    };
    on increaseSkillDamage {
      when :( :variables.fishing );
      :e.increaseDamage(1);
    };
    on useSkill {
      when :( :variables.fishing );
      const fishing = :variables.fishing;
      :drawCards(fishing);
      :variables.fishing = 0;
    };
  };
};

/**
 * @id 313004
 * @name 嵴锋龙
 * @cost 2*Aligned
 * @description
 * 特技：掘进突击
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * [3130041: 掘进突击] (2*Void) 抓2张牌，治疗附属角色1点。
 */
define card {
  id 313004 as Tepetlisaurus;
  description "$[K58]：$[S3130041]\n<color=#FFFFFFFF>$[K3]：2</color>\n（角色最多装备1个「{SPRITE_PRESET#3008}特技」）";
  cost DiceType.Aligned, 2;
  technique {
    skill {
      id 3130041 as BurrowingAssault;
      usage 2;
      cost DiceType.Void, 2;
      :drawCards(2);
      :heal(1, :self.master);
    };
  };
};

/**
 * @id 322021
 * @name 玛梅赫
 * @cost
 * @description
 * 我方打出「玛梅赫」以外的「料理」/「场地」/「伙伴」/「道具」行动牌后：累计1点计数。
 * 行动阶段开始，且此卡牌计数达到3时：从我方牌库底展示卡牌，直到出现1张「料理」/「场地」/「伙伴」/「道具」行动牌为止，将这张行动牌加入手牌，然后将你的牌库洗牌。
 */
define card {
  id 322021 as Mamere;
  description "<color=#FFFFFFFF>我方打出「玛梅赫」以外的「{SPRITE_PRESET#3101}料理」/「{SPRITE_PRESET#3104}场地」/「{SPRITE_PRESET#3103}伙伴」/「{SPRITE_PRESET#3102}道具」行动牌后：</color>累计1点计数。\n<color=#FFFFFFFF>行动阶段开始，且此卡牌计数达到3时：</color>从我方牌库底展示卡牌，直到出现1张「{SPRITE_PRESET#3101}料理」/「{SPRITE_PRESET#3104}场地」/「{SPRITE_PRESET#3103}伙伴」/「{SPRITE_PRESET#3102}道具」行动牌为止，将这张行动牌加入手牌，然后将你的牌库洗牌。";
  support ally {
    variable count, 0;
    on playCard {
      when :<boolean>(
        :e.card.definition.id !== Mamere &&
          :e.hasOneOfCardTag("food", "place", "ally", "item")
      );
      :variables.count += 1;
    };
    on actionPhase {
      when :( :variables.count >= 3 );
      // 未提及弃置或清零
      :drawCards(1, { withOneOfTag: ["food", "place", "ally", "item"] });
    };
  };
};

/**
 * @id 323008
 * @name 苦舍桓
 * @cost 1*Aligned
 * @description
 * 行动阶段开始时：舍弃最多2张手牌，每舍弃1张，此牌就累积1点「记忆和梦」。（最多2点）
 * 我方角色使用技能时：如果我方本回合未打出过行动牌，则消耗1点「记忆和梦」，以使此技能少花费1个元素骰。
 */
define card {
  id 323008 as Kusava;
  description "<color=#FFFFFFFF>行动阶段开始时：</color>$[K56]最多2张手牌，每$[K56]1张，此牌就累积1点<color=#FFFFFFFF>「记忆和梦」</color>。（最多2点）\n<color=#FFFFFFFF>我方角色使用技能时：</color>如果我方本回合未打出过行动牌，则消耗1点<color=#FFFFFFFF>「记忆和梦」</color>，以使此技能少花费1个元素骰。";
  cost DiceType.Aligned, 1;
  support item {
    variable memory, 0 { range 2; };
    variable cardPlayed, 0 {
      visible false;
    };
    on actionPhase {
      const count = Math.min(
        2 - :variables.memory,
        :player.hands.length -
          (:query($.my.combatStatus.def(PhysicalDiscard))?.variables.usage ??
            0),
      );
      if (count > 0) {
        :combatStatus(PhysicalDiscard, "my", {
          overrideVariables: { usage: count },
        });
        :variables.memory += count;
      }
      :variables.cardPlayed = 0;
    };
    on playCard {
      :variables.cardPlayed = 1;
    };
    on deductOmniDiceSkill {
      when :( !:variables.cardPlayed && :variables.memory > 0 );
      :e.deductOmniCost(1);
      :variables.memory -= 1;
    };
  };
};

/**
 * @id 332029
 * @name 净觉花
 * @cost
 * @description
 * 选择一张我方支援区的牌，将其弃置。然后，从我方牌库底展示卡牌，直到出现1张支援牌为止，将这张支援牌加入手牌，然后将你的牌库洗牌。
 */
define card {
  id 332029 as SunyataFlower;
  description "选择一张我方支援区的牌，<color=#FFFFFFFF>将其弃置</color>。然后，从我方牌库底展示卡牌，直到出现1张支援牌为止，将这张支援牌加入手牌，然后将你的牌库洗牌。";
  addTarget $.my.support;
  :dispose(:e.targets[0]);
  :drawCards(1, { withType: "support" });
};

// 潜猎护盾
const SubnauticalShield = 111123 as StatusHandle;
const PhysicalFreminetUndraw = customEvent("mod/physical/freminet/undraw");

/**
 * @id 111122
 * @name 潜猎模式
 * @description
 * 我方抓3张牌后：提供1点护盾保护所附属角色。（可叠加，最多叠加至2点）
 * 所附属角色使用普通攻击或元素战技后：将至多2张手牌置于牌库底，然后抓等量的牌。
 * 持续回合：2
 */
define status {
  id 111122 as SubnauticalHunterMode;
  description "<color=#FFFFFFFF>我方抓3张牌后：</color>提供1点$[K6]保护所附属角色。（可叠加，最多叠加至2点）\n<color=#FFFFFFFF>所附属角色使用普通攻击或元素战技后：</color>将至多2张手牌置于牌库底，然后抓等量的牌。\n<color=#FFFFFFFF>$[K4]：2</color>";
  playingDescription "<color=#FFFFFFFF>我方抓3张牌后：</color>提供1点$[K6]保护所附属角色。（可叠加，最多叠加至2点；<color=#D3BC8EFF>当前已抓${[GCG_TOKEN_COUNTER]}张牌</color>）。\n<color=#FFFFFFFF>所附属角色使用普通攻击或元素战技后：</color>将至多2张手牌置于牌库底，然后抓等量的牌。\n<color=#FFFFFFFF>$[K4]：2</color>";
  duration 2;
  variable drawnCard, 0 {
    visible false;
  };
  variable undrawnCard, 0 {
    visible false;
  };
  replaceDescription "[GCG_TOKEN_COUNTER]",
    ((st, self) => self.variables.drawnCard);
  on drawCard {
    :variables.drawnCard += 1;
  };
  on drawCard {
    when :( :variables.drawnCard === 3 );
    :characterStatus(SubnauticalShield, :self.master);
    :variables.drawnCard = 0;
  };
  on useSkill {
    when :( :e.isSkillType("normal") || :e.isSkillType("elemental") );
    // 未提及undraw方式，暂定自选
    :abortPreview();
    :variables.undrawnCard = 0;
    :emitCustomEvent(PhysicalFreminetUndraw);
  };
  on PhysicalFreminetUndraw {
    when :( :player.hands.length > 0 );
    listenTo myself;
    :selectOption(
      `选择将1张手牌置于牌库底。`,
      :player.hands.map((card) => ({
        key: String(card.id),
        text: `将这张$[C${card.definition.id}]置于牌库底`,
        image: `id://${card.definition.id}`,
        title: `$[C${card.definition.id}]`,
      })),
    );
  };
  on selectOption {
    listenTo myself;
    const card = :player.hands.find(
      (card) => card.id === Number(:e.selectedKey),
    );
    if (card) {
      :undrawCards([card], "bottom");
      :variables.undrawnCard += 1;
    }
    if (:player.hands.length > 0 && :variables.undrawnCard < 2) {
      :emitCustomEvent(PhysicalFreminetUndraw);
    } else {
      :drawCards(:variables.undrawnCard);
    }
  };
};

// 热情护盾
const ShieldOfPassion = 113121 as CombatStatusHandle;

/**
 * @id 13122
 * @name 热情拂扫
 * @cost 3*Pyro
 * @description
 * 造成2点火元素伤害，舍弃1张手牌，生成热情护盾。
 */
define skill {
  id 13122 as SweepingFervor;
  description "造成2点$[K103]，$[K56]1张手牌，生成<color=#FFFFFFFF>$[C113121]</color>。";
  skillType elemental;
  cost DiceType.Pyro, 3;
  :damage(DamageType.Pyro, 2);
  if (
    :player.hands.length >
    (:query($.my.combatStatus.def(PhysicalDiscard))?.variables.usage ?? 0)
  ) {
    :combatStatus(PhysicalDiscard);
  }
  :combatStatus(ShieldOfPassion);
};

// 裂晶弹片
const CrystalShrapnel = 116081 as CardHandle;

/**
 * @id 16084
 * @name 互助关系网
 * @cost
 * @description
 * 【被动】敌方角色受到结晶反应伤害后：生成1张裂晶弹片，加入手牌。
 */
define skill {
  id 16084 as MutualAssistanceNetwork;
  description "【被动】<color=#FFFFFFFF>敌方角色受到结晶反应伤害后：</color>生成1张<color=#FFFFFFFF>$[C116081]</color>，加入手牌。";
  skillType passive {
    on damaged {
      when :(
        (
          [
            Reaction.CrystallizeCryo,
            Reaction.CrystallizeElectro,
            Reaction.CrystallizeHydro,
            Reaction.CrystallizePyro,
            Reaction.LunarCrystallizeHydro,
          ] as Reaction[]
        ).includes(:e.getReaction()!) && !:e.target.isMine()
      );
      listenTo all;
      :createHandCard(CrystalShrapnel);
    };
  };
};

// 娜维娅
const Navia = 1608 as CharacterHandle;
const CeremonialCrystalshot = 16082 as SkillHandle;

/**
 * @id 216081
 * @name 不明流通渠道
 * @cost 3*Geo
 * @description
 * 战斗行动：我方出战角色为娜维娅时，装备此牌。
 * 娜维娅装备此牌后，立刻使用一次典仪式晶火。
 * 装备有此牌的娜维娅使用技能后：生成1张裂晶弹片，加入手牌。（每回合1次）
 * （牌组中包含娜维娅，才能加入牌组）
 */
define card {
  id 216081 as UndisclosedDistributionChannels;
  description "$[K1]：我方出战角色为<color=#FFFFFFFF>$[A1608]</color>时，装备此牌。\n$[A1608]装备此牌后，立刻使用一次<color=#FFD780FF>$[S16082]</color>。\n装备有此牌的$[A1608]使用技能后：生成1张<color=#FFFFFFFF>$[C116081]</color>，加入手牌。（每回合1次）\n（牌组中包含$[A1608]，才能加入牌组）";
  cost DiceType.Geo, 3;
  talent Navia {
    on staged {
      :useSkill(CeremonialCrystalshot);
    };
    on useSkill {
      usage perRound, 1;
      :createHandCard(CrystalShrapnel);
    };
  };
};

/**
 * @id 311309
 * @name 便携动力锯
 * @cost 2*Aligned
 * @description
 * 所附属角色受到伤害时：如可能，舍弃1张手牌，以抵消1点伤害，然后累积1点「坚忍标记」。（每回合1次）
 * 角色造成伤害时：如果此牌已有「坚忍标记」，则消耗所有「坚忍标记」，使此伤害+1，并且每消耗1点「坚忍标记」就抓1张牌。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311309 as PortablePowerSaw;
  description "<color=#FFFFFFFF>所附属角色受到伤害时：</color>如可能，$[K56]1张手牌，以抵消1点伤害，然后累积1点<color=#FFFFFFFF>「坚忍标记」</color>。（每回合1次）\n<color=#FFFFFFFF>角色造成伤害时：</color>如果此牌已有<color=#FFFFFFFF>「坚忍标记」</color>，则消耗所有<color=#FFFFFFFF>「坚忍标记」</color>，使此伤害+1，并且每消耗1点<color=#FFFFFFFF>「坚忍标记」</color>就抓1张牌。\n（<color=#FFFFFFFF>「{SPRITE_PRESET#3203}双手剑」角色</color>才能装备。角色最多装备1件「{SPRITE_PRESET#3003}武器」）";
  cost DiceType.Aligned, 2;
  weapon claymore {
    tags barrier;
    variable barrierUsage, 0; // no io hint for now
    variable stoic, 0;
    on decreaseDamaged {
      when :(
        :player.hands.length >
          (:query($.my.combatStatus.def(PhysicalDiscard))?.variables.usage ?? 0)
      );
      usage perRound, 1;
      :combatStatus(PhysicalDiscard);
      :e.decreaseDamage(1);
      :variables.stoic += 1;
    };
    on increaseSkillDamage {
      when :( :variables.stoic > 0 );
      :e.increaseDamage(1);
      :drawCards(:variables.stoic);
      :variables.stoic = 0;
    };
  };
};

/**
 * @id 313006
 * @name 绒翼龙
 * @cost 1*Aligned
 * @description
 * 附属角色切换为出战角色时：如可能，舍弃1张手牌，将此次切换视为「快速行动」而非「战斗行动」，少花费1个元素骰。
 * 特技：迅疾滑翔
 * 可用次数：1
 * （角色最多装备1个「特技」）
 * [3130063: 迅疾滑翔] () 切换到下一个角色。
 */
define card {
  id 313006 as Qucusaurus;
  description "<color=#FFFFFFFF>附属角色切换为出战角色时：</color>如可能，$[K56]1张手牌，将此次切换视为「$[K2]」而非「$[K1]」，少花费1个元素骰。\n$[K58]：$[S3130063]\n<color=#FFFFFFFF>$[K3]：1</color>\n（角色最多装备1个「{SPRITE_PRESET#3008}特技」）";
  cost DiceType.Aligned, 1;
  technique {
    variable deductDiceTriggered, 0 {
      visible false;
    };
    on deductOmniDiceSwitch {
      // 绒翼龙只在可以减费时生效
      when :(
        :e.action.to.id === :self.master.id && // 附属角色切换为出战角色
          :player.hands.length >
            (:query($.my.combatStatus.def(PhysicalDiscard))?.variables.usage ??
              0)
      );
      :variables.deductDiceTriggered = 1;
      :combatStatus(PhysicalDiscard);
      :e.deductOmniCost(1);
    };
    on beforeFastSwitch {
      // 该效果官方也可以残留到下次生效
      when :( :variables.deductDiceTriggered ); // 将此次切换视为「快速行动」
      :variables.deductDiceTriggered = 0;
      :e.setFastAction();
    };
    skill {
      id 3130063 as SwiftGlide;
      usage 1;
      :switchActive($.my.next);
    };
  };
};

/**
 * @id 116082
 * @name 金花礼炮
 * @description
 * 结束阶段：造成1点岩元素伤害。
 * 可用次数：2
 */
define summon {
  id 116082 as RosulaDorataSalute;
  description "<color=#FFFFFFFF>结束阶段：</color>造成1点$[K106]。\n<color=#FFFFFFFF>$[K3]：2</color>";
  hint DamageType.Geo, 1;
  on endPhase {
    usage 2;
    :damage(DamageType.Geo, 1);
  };
};

// 若陀龙王相关状态
const StoneFacetsElementalAbsorption = 126021 as StatusHandle;
const StoneFacetsElementalCrystallization = 126022 as StatusHandle;
const AbsorbedCountExtension = (50_000_000 + 2602) as ExtensionHandle<{
  absorbed: [[], []];
}>;

/**
 * @id 26025
 * @name 磐岩百相
 * @cost
 * @description
 * 【被动】战斗开始时，初始附属磐岩百相·元素凝晶。
 */
define skill {
  id 26025 as StoneFacets;
  description "【被动】战斗开始时，初始附属<color=#FFFFFFFF>$[C126022]</color>。";
  skillType passive {
    associateExtension AbsorbedCountExtension;
    on battleBegin {
      :characterStatus(StoneFacetsElementalAbsorption, :self, {
        overrideVariables: {
          absorbedCount: :getExtensionState().absorbed[:self.who].length,
        },
      });
      :characterStatus(StoneFacetsElementalCrystallization);
    };
    on revive {
      :characterStatus(StoneFacetsElementalAbsorption, :self, {
        overrideVariables: {
          absorbedCount: :getExtensionState().absorbed[:self.who].length,
        },
      });
      :characterStatus(StoneFacetsElementalCrystallization);
    };
  };
};
