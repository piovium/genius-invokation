import {
  $,
  DamageType,
  DiceType,
  type SkillHandle,
  type PassiveSkillHandle,
  type StatusHandle,
  type CombatStatusHandle,
  type SummonHandle,
  type EquipmentHandle,
} from "#custom-data-loader";

const WhirlingScythe = 22051 as SkillHandle;
const SlashOfSurgingTides = 22052 as SkillHandle;
const BubblefloatBlitz = 22053 as SkillHandle;
const SlashOfSurgingTidesPassive = 22054 as PassiveSkillHandle;
const SurgingThunder = 24044 as SkillHandle;
const HurtlingBolts = 24041 as SkillHandle;
const MistyCall = 24042 as SkillHandle;
const PlamaLawa = 26011 as SkillHandle;
const MovoLawa = 26012 as SkillHandle;
const UpaShato = 26013 as SkillHandle;
const InfusedStonehide = 26014 as PassiveSkillHandle;
const SurgingThunderStatus = 124043 as StatusHandle;
const ElectroCicinShield = 124042 as CombatStatusHandle;

/**
 * @id 2205
 * @name 丘丘水行游侠
 * @hp 10
 * @energy 2
 * @description
 * 不属于任何部族的丘丘人流浪者，如同自我流放一般在荒野中四处漫游。
 */
define character {
  id 2205 as HydroHilichurlRogue;
  tags hydro, monster, hilichurl;
  health 10;
  energy 2;
  skills WhirlingScythe,
    SlashOfSurgingTides,
    BubblefloatBlitz,
    SlashOfSurgingTidesPassive;
};

/**
 * @id 2404
 * @name 愚人众·雷萤术士
 * @hp 10
 * @energy 3
 * @description
 * …正如雾虚草的气味会令雷萤迷醉，嗜虐的术士也贪恋着戏弄对手的快感…
 */
define character {
  id 2404 as FatuiElectroCicinMage;
  tags electro, fatui;
  health 10;
  energy 3;
  skills HurtlingBolts, MistyCall, ThunderingShield, SurgingThunder;
};

/**
 * @id 2601
 * @name 丘丘岩盔王
 * @hp 8
 * @energy 2
 * @description
 * 绕道而行吧，因为前方是属于「王」的领域。
 */
define character {
  id 2601 as StonehideLawachurl;
  tags geo, monster, hilichurl;
  health 8;
  energy 2;
  skills PlamaLawa, MovoLawa, UpaShato, InfusedStonehide;
};

/**
 * @id 24043
 * @name 霆雷之护
 * @cost 3*Electro, 3*Energy
 * @description
 * 造成1点雷元素伤害，本角色附着雷元素，生成雷萤护罩并准备技能：霆电迸发。
 */
define skill {
  id 24043 as ThunderingShield;
  skillType burst;
  cost DiceType.Electro, 3;
  cost DiceType.Energy, 3;
  :damage(DamageType.Electro, 1);
  :apply(DamageType.Electro, :self);
  :combatStatus(ElectroCicinShield);
  :characterStatus(SurgingThunderStatus);
};

/**
 * @id 16075
 * @name 调和计数
 * @cost
 * @description
 * 记录本回合我方进行元素调和的次数，供长枪开相判定增伤。
 * 舍弃手牌不计入；回合结束时清零。
 */
define skill {
  id 16075 as CountDiscardOrTune;
  skillType passive {
    variable discardOrTuneCardCount, 0;
    on discardOrTuneCard {
      when :( :e.isTuning() );
      :variables.discardOrTuneCardCount! += 1;
    };
    on roundEnd {
      :variables.discardOrTuneCardCount = 0;
    };
  };
};

// Keep the shared duration and refresh behavior; only the damage condition changes.
/**
 * @id 301102
 * @name 千年的大乐章·别离之歌
 * @description
 * 我方存在装备中的「终末嗟叹之诗」时：我方角色造成的伤害+1。
 * 持续回合：2
 * 没有终末嗟叹之诗时不提供增伤，但不移除此状态。
 */
define combatStatus {
  id 301102;
  duration 2;
  on increaseSkillDamage {
    when :( :query($.my.equipped.def(311205 as EquipmentHandle)) );
    :e.increaseDamage(1);
  };
};

/**
 * @name 沙海守望
 * @description
 * 本回合内，所附属角色下次造成的伤害额外+1。
 */
define status {
  name "沙海守望" as DesertWatch;
  description "本回合内，所附属角色下次造成的伤害额外+1。";
  oneDuration;
  once increaseSkillDamage {
    :e.increaseDamage(1);
  };
};

/**
 * @id 311306
 * @name 苇海信标
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」或受到伤害后：本回合内，角色下次造成的伤害额外+1。（两种条件共用每回合2次）
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311306;
  cost DiceType.Aligned, 3;
  weapon claymore {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    };
    on useSkill {
      when :( :e.isSkillType("elemental") );
      usage perRound, 2 { name triggers; };
      :characterStatus(DesertWatch, :self.master);
    };
    on damaged {
      usage perRound, 2 { name triggers; };
      :characterStatus(DesertWatch, :self.master);
    };
  };
};

// Three independent pools, one per character's equipped Bell. They remain normal
// combat shields so Vortex Vanquisher and Geo resonance can replenish them.
/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾，与来源钟剑独立绑定。
 * 钟剑自身生成的护盾最多叠加到2点；外部效果补充护盾可超过2点。
 * 来源武器移除或装备者被击倒时，移除此护盾。
 */
define combatStatus {
  name "叛逆的守护" as BellShield0;
  description "为我方出战角色提供护盾。来源钟剑离场时移除此护盾。";
  shield 1, 2;
  variable weaponId, 0;
  variable ownerId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
  on defeated {
    listenTo all;
    when :( :e.target.id === :variables.ownerId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾，与来源钟剑独立绑定。
 * 钟剑自身生成的护盾最多叠加到2点；外部效果补充护盾可超过2点。
 * 来源武器移除或装备者被击倒时，移除此护盾。
 */
define combatStatus {
  name "叛逆的守护" as BellShield1;
  description "为我方出战角色提供护盾。来源钟剑离场时移除此护盾。";
  shield 1, 2;
  variable weaponId, 0;
  variable ownerId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
  on defeated {
    listenTo all;
    when :( :e.target.id === :variables.ownerId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾，与来源钟剑独立绑定。
 * 钟剑自身生成的护盾最多叠加到2点；外部效果补充护盾可超过2点。
 * 来源武器移除或装备者被击倒时，移除此护盾。
 */
define combatStatus {
  name "叛逆的守护" as BellShield2;
  description "为我方出战角色提供护盾。来源钟剑离场时移除此护盾。";
  shield 1, 2;
  variable weaponId, 0;
  variable ownerId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
  on defeated {
    listenTo all;
    when :( :e.target.id === :variables.ownerId );
    :dispose();
  };
};
const bellShields = [BellShield0, BellShield1, BellShield2];

/**
 * @id 311305
 * @name 钟剑
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用技能后：生成1点绑定此武器的「护盾」，保护我方出战角色。（每回合1次，自身最多叠加到2点）
 * 不同钟剑的护盾分别记录，装备者被击倒或武器移除时，对应护盾消失。外部效果补充护盾可超过2点。
 * （「双手剑」角色才能装备。角色最多装备1件「武器」）
 */
define card {
  id 311305;
  cost DiceType.Aligned, 3;
  weapon claymore {
    on increaseSkillDamage {
      :e.increaseDamage(1);
    };
    on useSkill {
      usage perRound, 1;
      const shields = :queryAll($.my.combatStatus);
      const existing = shields.find((s) => s.variables.weaponId === :self.id);
      const definition =
        existing?.definition.id ??
        bellShields.find((id) => !shields.some((s) => s.definition.id === id));
      if (definition) {
        :combatStatus(definition as CombatStatusHandle, "my", {
          overrideVariables: { weaponId: :self.id, ownerId: :self.master.id },
        });
      }
    };
  };
};

/**
 * @id 312015
 * @name 海祇之冠
 * @cost 1*Aligned
 * @description
 * 我方角色每受到1点实际治疗，此牌就累积1个「海染泡沫」。（最多累积6个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1，不足3个的余数也会清空。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312015;
  cost DiceType.Aligned, 1;
  artifact {
    variable bubble, 0 { range 6; };
    on healed {
      listenTo samePlayer;
      :variables.bubble += :e.value;
    };
    on increaseSkillDamage {
      :e.increaseDamage(Math.floor(:variables.bubble / 3));
      :variables.bubble = 0;
    };
  };
};

/**
 * @id 312016
 * @name 海染砗磲
 * @cost 3*Void
 * @description
 * 入场时：治疗所附属角色3点。
 * 我方角色每受到1点实际治疗，此牌就累积1个「海染泡沫」。（最多累积6个）
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1，不足3个的余数也会清空。
 * （角色最多装备1件「圣遗物」）
 */
define card {
  id 312016;
  cost DiceType.Void, 3;
  artifact {
    variable bubble, 0 { range 6; };
    on staged {
      :heal(3, :e.targets[0]);
    };
    on healed {
      listenTo samePlayer;
      :variables.bubble += :e.value;
    };
    on increaseSkillDamage {
      :e.increaseDamage(Math.floor(:variables.bubble / 3));
      :variables.bubble = 0;
    };
  };
};

/**
 * @id 321008
 * @name 鸣神大社
 * @cost 2*Aligned
 * @description
 * 我方角色使用技能后：如果元素骰总数为奇数，则生成1个万能元素骰。（每回合2次）
 */
define card {
  id 321008;
  cost DiceType.Aligned, 2;
  support place {
    on useSkill {
      when :( :player.dice.length % 2 === 1 );
      usage perRound, 2;
      :generateDice(DiceType.Omni, 1);
    };
  };
};

/**
 * @id 321006
 * @name 西风大教堂
 * @cost 2*Aligned
 * @description
 * 结束阶段：治疗我方出战角色2点。
 * 出战角色满血时，可选择触发治疗并消耗次数，或不触发、保留次数。
 * 可用次数：2
 */
define card {
  id 321006;
  cost DiceType.Aligned, 2;
  support place {
    usage 2;
    on endPhase {
      if (:query($.my.active.var("health", "<", "maxHealth"))) {
        :heal(2, $.my.active);
        :consumeUsage();
      } else {
        :selectOption("西风大教堂：出战角色满血，是否触发治疗并消耗次数？", [
          { key: "skip", text: "不触发，保留次数" },
          { key: "heal", text: "触发治疗，消耗1次" },
        ]);
      }
    };
    on selectOption {
      when :( :e.via.caller.id === :self.id );
      if (:e.selectedKey === "heal") {
        :heal(2, $.my.active);
        :consumeUsage();
      }
    };
  };
};

/**
 * @id 322003
 * @name 蒂玛乌斯
 * @cost 2*Aligned
 * @description
 * 入场时：此牌具有2个「合成材料」。
 * 结束阶段：此牌增加1个「合成材料」。
 * 打出「圣遗物」手牌时：如可能，则支付等同于圣遗物总费用数量的「合成材料」，以免费装备此圣遗物。（每回合1次）
 * 成功触发上述效果后：抓1张牌。（每张蒂玛乌斯整场牌局限制1次）
 */
define card {
  id 322003;
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
    variable drawn, 0 { visible false; };
    variable pendingCard, 0 { visible false; };
    on endPhase {
      :variables.material += 1;
    };
    on deductAllDiceCard {
      when :(
        :e.hasCardTag("artifact") && :variables.material >= :e.diceCostSize()
      );
      usage perRound, 1;
      :variables.material -= :e.diceCostSize();
      :variables.pendingCard = :e.action.skill.caller.id;
      :e.deductAllCost();
    };
    on playCard {
      when :( :variables.drawn === 0 && :e.card.id === :variables.pendingCard );
      :variables.drawn = 1;
      :drawCards(1);
    };
  };
};

/**
 * @id 322004
 * @name 瓦格纳
 * @cost 2*Aligned
 * @description
 * 入场时：此牌具有2个「锻造原胚」。
 * 结束阶段：此牌增加1个「锻造原胚」。
 * 打出「武器」手牌时：如可能，则支付等同于武器总费用数量的「锻造原胚」，以免费装备此武器。（每回合1次）
 * 成功触发上述效果后：抓1张牌。（每张瓦格纳整场牌局限制1次）
 */
define card {
  id 322004;
  cost DiceType.Aligned, 2;
  support ally {
    variable material, 2;
    variable drawn, 0 { visible false; };
    variable pendingCard, 0 { visible false; };
    on endPhase {
      :variables.material += 1;
    };
    on deductAllDiceCard {
      when :(
        :e.hasCardTag("weapon") && :variables.material >= :e.diceCostSize()
      );
      usage perRound, 1;
      :variables.material -= :e.diceCostSize();
      :variables.pendingCard = :e.action.skill.caller.id;
      :e.deductAllCost();
    };
    on playCard {
      when :( :variables.drawn === 0 && :e.card.id === :variables.pendingCard );
      :variables.drawn = 1;
      :drawCards(1);
    };
  };
};

const diceNames = ["无色", "冰", "水", "火", "雷", "风", "岩", "草", "万能"];
/**
 * @id 322008
 * @name 立本
 * @cost
 * @description
 * 结束阶段：选择收集我方未使用的元素骰，本次每种最多1个，累计最多3个；可以选择不放入。
 * 万能元素骰独立计为一种，跨回合可再次收集相同骰种。
 * 行动阶段开始时：如果此牌已收集3个元素骰，则抓2张牌，生成2个万能元素骰，然后弃置此牌。
 */
define card {
  id 322008;
  support ally {
    variable collected, 0;
    on endPhase {
      const kinds = [...new Set(:player.dice)].sort((a, b) => a - b);
      const combinations = kinds.reduce<number[][]>(
        (sets, kind) => [
          ...sets,
          ...sets
            .filter((s) => s.length < 3 - :variables.collected)
            .map((s) => [...s, kind]),
        ],
        [[]],
      );
      :selectOption(
        "立本：选择本次放入的元素骰",
        combinations.map((dice) => ({
          key: dice.length ? dice.join(",") : "none",
          text: dice.length
            ? dice.map((d) => diceNames[d]).join("、")
            : "不放入",
        })),
      );
    };
    on selectOption {
      when :( :e.via.caller.id === :self.id );
      if (:e.selectedKey !== "none") {
        const selected = :e.selectedKey.split(",").map(Number);
        const remaining = [...:player.dice];
        for (const die of selected) {
          remaining.splice(remaining.indexOf(die), 1);
        }
        :mutate({
          type: "resetDice",
          who: :self.who,
          value: remaining,
          reason: "absorb",
        });
        :variables.collected += selected.length;
      }
    };
    on actionPhase {
      if (:variables.collected === 3) {
        :drawCards(2);
        :generateDice(DiceType.Omni, 2);
        :dispose();
      }
    };
  };
};

const elements = ["冰", "水", "火", "雷"];
const pairs = elements.flatMap((a, i) =>
  elements.slice(i + 1).map((b, offset) => ({
    key: `${i},${i + offset + 1}`,
    text: `${a}、${b}`,
  })),
);
// A persistent responder issues both requests, so the event card may leave play.
/**
 * @name 元素声明
 * @description
 * 我方声明冰、水、火、雷中的两种不同元素，再由对方选择其中一种。
 * 根据来源卡牌生成我方丘丘人召唤物或对方愚人众伏兵，完成后移除此协调状态。
 */
define combatStatus {
  name "元素声明" as ElementDeclaration;
  variable fatui, 0;
  variable stage, 0;
  on selfEnter {
    :selectOption("声明两种元素，由对方选择其中一种", pairs);
  };
  on selectOption {
    listenTo all;
    when :( :e.via.caller.id === :self.id );
    if (:variables.stage === 0) {
      :variables.stage = 1;
      const chosen = :e.selectedKey.split(",").map(Number);
      :emitEvent(
        "requestSelectOption",
        :skillInfo,
        :self.who === 0 ? 1 : 0,
        `对方已声明${chosen.map((i) => elements[i]).join("、")}，请选择一种`,
        chosen.map((i) => ({ key: String(i), text: elements[i] })),
      );
    } else {
      const element = Number(:e.selectedKey);
      if (:variables.fatui) {
        :combatStatus((303216 + element) as CombatStatusHandle, "opp");
      } else {
        :summon((303211 + element) as SummonHandle);
      }
      :dispose();
    }
  };
};

/**
 * @id 332015
 * @name 深渊的呼唤
 * @cost 2*Aligned
 * @description
 * 从冰、水、火、雷中声明两种不同元素，由对方选择其中一种，召唤对应的「丘丘人」召唤物。
 * 召唤物在结束阶段造成1点对应元素伤害，可用次数：2。
 * （牌组包含至少2个「魔物」角色，才能加入牌组）
 */
define card {
  id 332015;
  cost DiceType.Aligned, 2;
  :combatStatus(ElementDeclaration);
};

/**
 * @id 332016
 * @name 愚人众的阴谋
 * @cost 2*Aligned
 * @description
 * 从冰、水、火、雷中声明两种不同元素，由对方选择其中一种，在对方场上生成对应的「愚人众伏兵」。
 * 所在阵营的角色使用技能后：对所在阵营的出战角色造成1点对应元素伤害。（每回合1次）
 * 可用次数：2
 * （牌组包含至少2个「愚人众」角色，才能加入牌组）
 */
define card {
  id 332016;
  cost DiceType.Aligned, 2;
  :combatStatus(ElementDeclaration, "my", { overrideVariables: { fatui: 1 } });
};
