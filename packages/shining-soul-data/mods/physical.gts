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
  customEvent,
} from "#custom-data-loader";

// 水丘丘相关

const WhirlingScythe = 22051 as SkillHandle;
const SlashOfSurgingTides = 22052 as SkillHandle;
const BubblefloatBlitz = 22053 as SkillHandle;
const SlashOfSurgingTidesPassive = 22054 as PassiveSkillHandle;

// 雷莹相关

const SurgingThunder = 24044 as SkillHandle;
const HurtlingBolts = 24041 as SkillHandle;
const MistyCall = 24042 as SkillHandle;
const SurgingThunderStatus = 124043 as StatusHandle;
const ElectroCicinShield = 124042 as CombatStatusHandle;

// 终末嗟叹之诗
const ElegyForTheEnd = 311205 as EquipmentHandle;

// 沙海守望·主动出击
const DesertWatchTakeTheInitiative = 301105 as StatusHandle;

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

// 能量消耗改动
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

// 删去了舍弃触发
/**
 * @id 16075
 * @name 云堇长枪开相计数
 * @cost
 * @description
 *
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

// 根据Q&A，仅存在场上「终末嗟叹之诗」时生效
/**
 * @id 301102
 * @name 千年的大乐章·别离之歌
 * @description
 * 我方存在装备中的「终末嗟叹之诗」时：我方角色造成的伤害+1。
 * 持续回合：2
 */
define combatStatus {
  id 301102;
  duration 2;
  on increaseSkillDamage {
    when :( :query($.my.equipped.def(ElegyForTheEnd)) );
    :e.increaseDamage(1);
  };
};

// 共享可用次数
/**
 * @id 311306
 * @name 苇海信标
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用「元素战技」或受到伤害后：本回合内，角色下次造成的伤害额外+1。（每回合2次）
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
      usage perRound, 2 { name usagePerRound1; };
      :characterStatus(DesertWatchTakeTheInitiative, :self.master);
    };
    on damaged {
      usage perRound, 2 { name usagePerRound1; };
      :characterStatus(DesertWatchTakeTheInitiative, :self.master);
    };
  };
};

// 钟剑系列：允许独立生成、关联来源并自动弃置

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield0;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield1;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

/**
 * @name 叛逆的守护
 * @description
 * 为我方出战角色提供护盾。（可叠加，最多叠加到2点）
 * 生成此出战状态的「钟剑」移除时：弃置自身。
 */
define combatStatus {
  name "叛逆的守护" as BellShield2;
  description "为我方出战角色提供护盾。（可叠加，最多叠加到2点）\n生成此出战状态的「钟剑」移除时：弃置自身。";
  shield 1, 2;
  variable weaponId, 0;
  on entityDispose {
    listenTo all;
    when :( :e.entity.id === :variables.weaponId );
    :dispose();
  };
};

const BELL_SHIELDS = [BellShield0, BellShield1, BellShield2];

/**
 * @id 311305
 * @name 钟剑
 * @cost 3*Aligned
 * @description
 * 角色造成的伤害+1。
 * 角色使用技能后：生成1点绑定此武器的「护盾」，保护我方出战角色。（每回合1次，可叠加到2点）
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
      const defId =
        existing?.definition.id ??
        BELL_SHIELDS.find((id) => !shields.some((s) => s.definition.id === id));
      if (defId) {
        :combatStatus(defId as CombatStatusHandle, "my", {
          overrideVariables: {
            weaponId: :self.id,
          },
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
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。
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
 * 角色造成伤害时：消耗所有「海染泡沫」，每消耗3个都使造成的伤害+1。
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

// 允许玩家选择满血是否治疗
/**
 * @id 321006
 * @name 西风大教堂
 * @cost 2*Aligned
 * @description
 * 结束阶段：治疗我方出战角色2点。
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

const PhysicalTimaeusShouldDraw = customEvent(
  "mod/physical/timaeus/shouldDraw",
);

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
    on endPhase {
      :variables.material += 1;
    };
    on deductAllDiceCard {
      when :(
        :e.hasCardTag("artifact") && :variables.material >= :e.diceCostSize()
      );
      usage perRound, 1;
      :variables.material -= :e.diceCostSize();
      :e.deductAllCost();
      :emitCustomEvent(PhysicalTimaeusShouldDraw);
    };
    on PhysicalTimaeusShouldDraw {
      listenTo myself;
      usage 1 { autoDispose false; };
      :drawCards(1);
    };
  };
};

const PhysicalWagnerShouldDraw = customEvent("mod/physical/wagner/shouldDraw");

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
    on endPhase {
      :variables.material += 1;
    };
    on deductAllDiceCard {
      when :(
        :e.hasCardTag("weapon") && :variables.material >= :e.diceCostSize()
      );
      usage perRound, 1;
      :variables.material -= :e.diceCostSize();
      :e.deductAllCost();
      :emitCustomEvent(PhysicalWagnerShouldDraw);
    };
    on PhysicalWagnerShouldDraw {
      listenTo myself;
      usage 1 { autoDispose false; };
      :drawCards(1);
    };
  };
};

const diceNames = ["无色", "冰", "水", "火", "雷", "风", "岩", "草", "万能"];
const PhysicalLibenCollect = customEvent("mod/physical/liben/collect");

/**
 * @id 322008
 * @name 立本
 * @cost
 * @description
 * 结束阶段：从你元素骰区中选择最多3个元素骰放到此牌上。（每种最多1个）。
 * 行动阶段开始时：如果此牌上有3个以上的元素骰，则弃置此牌，抓2张牌，获得2个万能元素骰。
 */
define card {
  id 322008;
  support ally {
    variable collected, 0;
    variable collectedKinds, 0 { visible false; };
    on endPhase {
      :variables.collectedKinds = 0;
      :emitCustomEvent(PhysicalLibenCollect);
    };
    on PhysicalLibenCollect {
      listenTo myself;
      when :( :variables.collected < 3 );
      const kinds = [...new Set(:player.dice)]
        // 每个万能骰独立计为一种
        .filter(
          (die) =>
            die === DiceType.Omni || !(:variables.collectedKinds & (1 << die)),
        )
        .sort((a, b) => a - b);
      if (kinds.length > 0) {
        :selectOption("立本：选择放入1个元素骰，或停止放入", [
          { key: "none", text: "停止放入" },
          ...kinds.map((die) => ({ key: String(die), text: diceNames[die] })),
        ]);
      }
    };
    on selectOption {
      when :( :e.via.caller.id === :self.id );
      if (:e.selectedKey !== "none") {
        const selected = Number(:e.selectedKey);
        const remaining = [...:player.dice];
        remaining.splice(remaining.indexOf(selected), 1);
        :mutate({
          type: "resetDice",
          who: :self.who,
          value: remaining,
          reason: "absorb",
        });
        :variables.collected++;
        :variables.collectedKinds |= 1 << selected;
        :emitCustomEvent(PhysicalLibenCollect);
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

/**
 * @name 元素声明
 * @description
 * 我方声明冰、水、火、雷中的两种不同元素，再由对方选择其中一种。
 */
define combatStatus {
  name "元素声明" as ElementDeclaration;
  variable fatui, 0;
  variable stage, 0;
  on selfEnter {
    :selectOption("声明两种元素由对方选择其一：", pairs);
  };
  on selectOption {
    listenTo all;
    when :( :e.via.caller.id === :self.id );
    if (:variables.stage === 0) {
      :variables.stage = 1;
      const chosen = :e.selectedKey.split(",").map(Number);
      :selectOption(
        `对方已声明${chosen.map((i) => elements[i]).join("、")}，请选择一种`,
        chosen.map((i) => ({ key: String(i), text: elements[i] })),
        "opp",
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
  :combatStatus(ElementDeclaration, "my", {
    overrideVariables: { fatui: 1 },
  });
};
