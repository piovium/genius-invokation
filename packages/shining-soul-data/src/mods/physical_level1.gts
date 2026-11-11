import { $, DiceType, customEvent } from "#custom-data-loader";

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
